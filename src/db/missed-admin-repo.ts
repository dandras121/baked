// After Nobody was in, from the admin (§9.5): Delivered after all (both roles) and Record their choice (Owner). Both
// act on the latest attempt with Nobody was in, close the customer's choices (`sortedBy`), save with the version check
// (§9.1) and write HISTORY.
import { and, desc, eq } from "drizzle-orm";
import { memberChange } from "@/lib/admin/versions";
import { WINDOWS } from "@/lib/handover";
import { formatAdminMoney } from "@/lib/money";
import { londonDate, type CalendarDate } from "@/lib/london-time";
import type { Gateway } from "@/lib/payments";
import type { connect } from "./client";
import { refundFee } from "./delivery-repo";
import { deliveryAttempts, orderHistory, orders } from "./schema";
import { saveOrderVersioned } from "./versioned";

type Db = ReturnType<typeof connect>["db"];
type Gw = Pick<Gateway, "refund" | "cancel">;

/** The attempt Nobody was in was recorded on (the latest one), and the redelivery it booked, if any. */
export async function missedAttempt(db: Db, orderId: number) {
  const all = await db
    .select()
    .from(deliveryAttempts)
    .where(eq(deliveryAttempts.orderId, orderId))
    .orderBy(desc(deliveryAttempts.attempt));
  const target = all.find((a) => a.outcome === "nobody-in") ?? null;
  if (!target) return null;
  const next = all.find((a) => a.attempt === target.attempt + 1) ?? null;
  // A later attempt that itself has an outcome means this one is history, not the one to act on.
  if (next && next.outcome !== "none") return null;
  return { target, next };
}

export type MissedResult =
  | { kind: "saved"; fee: "none" | "refunded" | "failed" | "to-refund" }
  | { kind: "conflict"; line: string }
  | { kind: "not-now" }
  | { kind: "bad-day" };

const money = (p: number) => formatAdminMoney(p, "label");

/**
 * Delivered after all (§9.5): completed, the customer's choices closed. A paid redelivery fee goes back at once when
 * the Owner does it; a Helper's leaves Money a “£15 redelivery to refund” flag.
 */
export async function deliveredAfterAll(
  db: Db,
  gw: Gw,
  input: { orderId: number; seenVersion: number; by: string; owner: boolean },
  now = new Date(),
): Promise<MissedResult> {
  const m = await missedAttempt(db, input.orderId);
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!m || !o || o.status !== "confirmed") return { kind: "not-now" };
  const t = m.target;
  const saved = await db.transaction(async (tx) => {
    const r = await saveOrderVersioned(
      tx,
      o.id,
      input.seenVersion,
      { status: "completed", handedOverAt: now },
      memberChange(input.by),
      now,
    );
    if (!r.ok) return r;
    const owed = t.feePaidPence > 0 && !input.owner;
    await tx
      .update(deliveryAttempts)
      .set({ sortedBy: memberChange(input.by), feeRefundDue: owed })
      .where(eq(deliveryAttempts.id, t.id));
    await tx.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: input.by,
      what:
        t.feePaidPence > 0
          ? `Delivered after all · ${money(t.feePaidPence)} redelivery fee ${input.owner ? "refunded" : "to refund"}`
          : "Delivered after all",
    });
    return r;
  });
  if (!saved.ok) return { kind: "conflict", line: saved.line };
  // A fee payment still going through is stopped; one already taken goes back (Owner).
  if (t.paymentIntentId && t.feePaidPence === 0)
    await gw.cancel(t.paymentIntentId).catch(() => {});
  if (t.feePaidPence > 0 && input.owner && t.paymentIntentId)
    return {
      kind: "saved",
      fee: await refundFee(
        db,
        gw,
        o.id,
        t.paymentIntentId,
        t.feePaidPence,
        now,
      ),
    };
  return { kind: "saved", fee: t.feePaidPence > 0 ? "to-refund" : "none" };
}

export type TheirChoice =
  | { kind: "collect"; day: CalendarDate }
  | { kind: "redeliver"; day: CalendarDate; window: string };

/**
 * Record their choice (§9.5, Owner), e.g. agreed by phone: Collect (day) or Redeliver (date, window; the fee waived —
 * a £15 payment link comes with payment links, 8.7). It also replaces a choice already made: from a paid redelivery to
 * Collect the fee goes back; the earlier choice stays in HISTORY.
 */
export async function recordTheirChoice(
  db: Db,
  gw: Gw,
  input: {
    orderId: number;
    seenVersion: number;
    by: string;
    choice: TheirChoice;
  },
  now = new Date(),
): Promise<MissedResult> {
  const today = londonDate(now);
  const c = input.choice;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.day) || c.day < today)
    return { kind: "bad-day" };
  if (c.kind === "redeliver" && !WINDOWS.some((w) => w.key === c.window))
    return { kind: "bad-day" };
  const m = await missedAttempt(db, input.orderId);
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!m || !o || o.status !== "confirmed") return { kind: "not-now" };
  const t = m.target;
  const saved = await db.transaction(async (tx) => {
    const r = await saveOrderVersioned(
      tx,
      o.id,
      input.seenVersion,
      {},
      memberChange(input.by),
      now,
    );
    if (!r.ok) return r;
    const sorted = { chosenAt: now, sortedBy: memberChange(input.by) };
    if (c.kind === "collect") {
      await tx
        .update(deliveryAttempts)
        .set({ ...sorted, choice: "collect", collectDay: c.day })
        .where(eq(deliveryAttempts.id, t.id));
      // A booked redelivery no longer happens.
      if (m.next)
        await tx
          .delete(deliveryAttempts)
          .where(
            and(
              eq(deliveryAttempts.id, m.next.id),
              eq(deliveryAttempts.outcome, "none"),
            ),
          );
    } else {
      await tx
        .update(deliveryAttempts)
        .set({
          ...sorted,
          choice: "redeliver",
          collectDay: null,
          pendingWindow: c.window,
        })
        .where(eq(deliveryAttempts.id, t.id));
      if (m.next)
        await tx
          .update(deliveryAttempts)
          .set({ day: c.day, deliveryWindow: c.window })
          .where(eq(deliveryAttempts.id, m.next.id));
      else
        await tx.insert(deliveryAttempts).values({
          orderId: o.id,
          attempt: t.attempt + 1,
          day: c.day,
          deliveryWindow: c.window,
        });
    }
    const refundsFee = c.kind === "collect" && t.feePaidPence > 0;
    await tx.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: input.by,
      what:
        c.kind === "collect"
          ? `Recorded their choice: collect ${c.day}${refundsFee ? ` · ${money(t.feePaidPence)} redelivery fee refunded` : ""}`
          : `Recorded their choice: redeliver ${c.day}, ${c.window}${t.feePaidPence > 0 ? "" : " · fee waived"}`,
    });
    return r;
  });
  if (!saved.ok) return { kind: "conflict", line: saved.line };
  if (t.paymentIntentId && t.feePaidPence === 0)
    await gw.cancel(t.paymentIntentId).catch(() => {});
  if (c.kind === "collect" && t.feePaidPence > 0 && t.paymentIntentId)
    return {
      kind: "saved",
      fee: await refundFee(
        db,
        gw,
        o.id,
        t.paymentIntentId,
        t.feePaidPence,
        now,
      ),
    };
  return { kind: "saved", fee: "none" };
}
