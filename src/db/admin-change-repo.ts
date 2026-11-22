// Change the order from the admin (§9.7), the order's own fields: saved with the version check (§9.1); a full or
// closed day is the Owner's to book (a Helper cannot save it); the money of a handover switch; HISTORY; e-mail 12 for
// what the customer needs to know (not for name, e-mail or phone alone).
import { and, count, eq } from "drizzle-orm";
import { dayWarnings } from "@/lib/admin/add-order";
import {
  changeRows,
  newCharge,
  newEarliest,
  type ChangeValue,
} from "@/lib/admin/change-order";
import { memberChange } from "@/lib/admin/versions";
import { lastChangeDay } from "@/lib/deadlines";
import type { ChangeView } from "@/lib/mail/after-emails";
import { londonDate } from "@/lib/london-time";
import type { Gateway } from "@/lib/payments";
import { dayInfo } from "./add-order-repo";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { netPaid, refundOrder } from "./refund-repo";
import { orderChanges, orderHistory, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";
import { saveOrderVersioned } from "./versioned";

type Db = ReturnType<typeof connect>["db"];

export type ChangeResult =
  | { kind: "saved"; emailed: boolean; refundOk: boolean }
  | { kind: "nothing" }
  | { kind: "conflict"; line: string }
  | { kind: "closed" }
  | { kind: "owner-only"; warnings: string[] }
  | { kind: "needs-link"; pence: number };

export async function changeOrderFields(
  db: Db,
  gw: Pick<Gateway, "refund">,
  input: {
    orderId: number;
    seenVersion: number;
    by: string;
    owner: boolean;
    value: ChangeValue;
  },
  now = new Date(),
): Promise<ChangeResult> {
  const today = londonDate(now);
  const v = input.value;
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!o || o.status !== "confirmed") return { kind: "closed" };
  const fields = {
    ...o,
    date: String(o.date),
    earliestDate: String(o.earliestDate),
  };
  const { rows, contact } = changeRows(fields, v, today);
  if (!rows.length && !contact.length) return { kind: "nothing" };

  // A new day that is full or closed: the Owner may book it, a Helper may not (Decided 2026-10-17).
  if (v.date !== fields.date) {
    const [{ n: cakes }] = await db
      .select({ n: count() })
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id));
    const warnings = dayWarnings(await dayInfo(db, v.date, now, o.id), cakes);
    if (warnings.length && !input.owner)
      return { kind: "owner-only", warnings };
  }

  // A handover switch moves the delivery charge (§9.7).
  const s = await readSettings(db);
  const charge = newCharge(o, v.handover, s.deliveryChargePence);
  const newTotal = o.totalPence - o.deliveryChargePence + charge;
  const paid = await netPaid(db, o);
  // A rise on a fully paid order waits for the customer's payment (with Change the order's cakes, 8.6b).
  if (newTotal > o.totalPence && paid >= o.totalPence)
    return { kind: "needs-link", pence: newTotal - o.totalPence };

  const saved = await db.transaction(async (tx) => {
    const r = await saveOrderVersioned(
      tx,
      o.id,
      input.seenVersion,
      {
        date: v.date,
        earliestDate: newEarliest(fields, v.date, v.customerAsked),
        handover: v.handover,
        deliveryWindow: v.deliveryWindow,
        address: v.address,
        town: v.town,
        postcode: v.postcode,
        collectionTime: v.collectionTime,
        customerName: v.customerName,
        email: v.email,
        phone: v.phone,
        phoneE164: v.phoneE164,
        deliveryChargePence: charge,
        totalPence: newTotal,
        // A day Linda picked herself needs no “check the day” flag.
        checkDay: v.date === fields.date ? o.checkDay : false,
      },
      memberChange(input.by),
      now,
    );
    if (!r.ok) return r;
    const all = [...rows, ...contact];
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "linda",
        changes: all,
        moneyKind: newTotal < o.totalPence ? "down" : "none",
        moneyPence: Math.abs(newTotal - o.totalPence),
        newTotalPence: newTotal,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    await tx.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: input.by,
      what: `Changed the order · ${all.map(([w, a, b]) => `${w}: ${a} → ${b}`).join("; ")}`,
    });
    return { ok: true as const, changeId: c.id };
  });
  if (!saved.ok) return { kind: "conflict", line: saved.line };

  // Paid more than the new total: the excess goes back to the card (§9.7).
  let refundOk = true;
  const excess = paid - newTotal;
  if (excess > 0 && newTotal < o.totalPence)
    refundOk = (
      await refundOrder(
        db,
        gw,
        {
          orderId: o.id,
          amountPence: excess,
          kind: "change",
          changeId: saved.changeId,
        },
        now,
      )
    ).ok;

  // E-mail 12 (§8.1), only for what the customer needs to know; the queue skips it when customer e-mails are off.
  let emailed = false;
  if (rows.length && o.email) {
    const view: ChangeView = {
      number: o.number,
      token: o.token,
      date: v.date,
      today,
      changes: rows,
      same: [],
      newTotalPence: newTotal,
      money:
        excess > 0 && newTotal < o.totalPence
          ? { kind: "down", pence: excess }
          : { kind: "none", pence: 0 },
      newDeadline:
        v.date !== fields.date
          ? o.kind === "manual"
            ? "me"
            : lastChangeDay(v.date)
          : null,
    };
    emailed =
      (await queueMail(
        db,
        {
          key: `order:${o.id}:12:${saved.changeId}`,
          template: "change-saved",
          data: { view },
          to: o.email,
        },
        now,
      )) === "queued";
  }
  return { kind: "saved", emailed, refundOk };
}
