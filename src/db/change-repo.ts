// Change your order (§6.4), the customer's side: the message on each cake (6.2a) and the size (6.2b: the same price
// or smaller, with the difference refunded to the card at once). Every save carries the order's version (a page out of
// date saves nothing) and checks the change window again (A2 once it has closed).
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  changeMoney,
  servesOf,
  sizeChoiceLabel,
  sizeLine,
} from "@/lib/change-money";
import { londonDate } from "@/lib/london-time";
import type { ChangeView } from "@/lib/mail/after-emails";
import { formatPrice } from "@/lib/money";
import { inscriptionError, normaliseText } from "@/lib/order-line";
import { statusState } from "@/lib/order-status";
import type { Gateway } from "@/lib/payments";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { refundOrder } from "./refund-repo";
import { cakeSizes, cakes, orderChanges, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Line = typeof orderLines.$inferSelect;

export type SizeChoice = {
  id: number;
  label: string;
  /** The difference against what was paid for the line's current size (+5500 / −5500 / 0). */
  diffPence: number;
  current: boolean;
  /** The current size that Linda has since removed: shown, not choosable (§6.4). */
  removed: boolean;
};

/** What was paid for the line's size: kept since 6.2b; before, the line's price (those cakes had no paid options). */
const sizePaid = (l: Line) => l.sizePricePence ?? l.pricePence;

/** Each line's current sizes (§11.3) with the difference against its price paid; the current one marked. */
export async function sizeChoices(
  db: Db,
  lines: Line[],
): Promise<Record<number, SizeChoice[]>> {
  const out: Record<number, SizeChoice[]> = {};
  for (const l of lines) {
    if (!l.slug) continue;
    const [cake] = await db
      .select({ id: cakes.id })
      .from(cakes)
      .where(and(eq(cakes.slug, l.slug), isNull(cakes.deletedAt)));
    if (!cake) continue;
    const sizes = await db
      .select()
      .from(cakeSizes)
      .where(eq(cakeSizes.cakeId, cake.id))
      .orderBy(asc(cakeSizes.serves));
    const currentId =
      l.sizeId ??
      sizes.find((s) => s.serves === servesOf(l.sizeLine))?.id ??
      null;
    const list: SizeChoice[] = sizes.map((s) => ({
      id: s.id,
      label: sizeChoiceLabel(s),
      diffPence: s.id === currentId ? 0 : s.pricePence - sizePaid(l),
      current: s.id === currentId,
      removed: false,
    }));
    if (!list.some((s) => s.current))
      list.push({
        id: -1,
        label: `${l.sizeLine} — no longer offered`,
        diffPence: 0,
        current: true,
        removed: true,
      });
    out[l.id] = list;
  }
  return out;
}

export type SaveResult =
  | {
      kind: "saved";
      changeId: number;
      money: { kind: string; pence: number };
      refundOk: boolean;
    }
  | { kind: "stale" }
  | { kind: "closed" }
  | { kind: "nothing" }
  | { kind: "needs-payment"; pence: number }
  | { kind: "invalid"; errors: Record<number, string> };

const shown = (m: string | null) => (m ? `“${m}”` : "No message");

export type ChangeInput = {
  orderId: number;
  version: number;
  /** { line id: new message } */
  messages?: Record<number, string>;
  /** { line id: new size id } */
  sizes?: Record<number, number>;
};

/**
 * Saves the customer's changes on a catalogue order whose change window is open. A net rise of £0.30 or more needs
 * a payment first (6.2c); a net fall of £0.30 or more is refunded to the card at once; under £0.30 either way nothing
 * moves and the lines keep their price paid.
 */
export async function saveChanges(
  db: Db,
  gw: Pick<Gateway, "refund">,
  input: ChangeInput,
  now = new Date(),
): Promise<SaveResult> {
  const today = londonDate(now);
  const lines0 = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, input.orderId))
    .orderBy(orderLines.position);
  const choices = await sizeChoices(db, lines0);
  const sizeRows =
    input.sizes && Object.keys(input.sizes).length
      ? await db.select().from(cakeSizes)
      : [];

  const result = await db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!o) return { kind: "stale" } as const;
    if (
      o.kind !== "catalogue" ||
      statusState({ status: o.status, date: String(o.date) }, today) !== "A"
    )
      return { kind: "closed" } as const;
    if (o.version !== input.version) return { kind: "stale" } as const;
    const lines = await tx
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const several = lines.length > 1;
    const errors: Record<number, string> = {};
    const changes: [string, string, string][] = [];
    const updates = new Map<number, Partial<Line>>();
    let net = 0;
    let sizeChanged = false;
    let messageChanged = false;

    for (const [key, raw] of Object.entries(input.messages ?? {})) {
      const line = lines.find((l) => l.id === Number(key));
      if (!line || line.message === null) continue;
      const error = inscriptionError(raw);
      if (error) {
        errors[line.id] = error;
        continue;
      }
      const text = normaliseText(raw);
      if (text === line.message) continue;
      messageChanged = true;
      updates.set(line.id, { ...updates.get(line.id), message: text });
      changes.push([
        several ? `Message on ${line.name}` : "Message",
        shown(line.message),
        shown(text),
      ]);
    }

    const sizeMoves: {
      line: Line;
      size: (typeof sizeRows)[number];
      diff: number;
    }[] = [];
    for (const [key, sizeId] of Object.entries(input.sizes ?? {})) {
      const line = lines.find((l) => l.id === Number(key));
      const choice =
        line && choices[line.id]?.find((c) => c.id === Number(sizeId));
      if (!line || !choice || choice.current || choice.removed) continue;
      const size = sizeRows.find((s) => s.id === choice.id);
      if (!size) continue;
      const diff = size.pricePence - sizePaid(line);
      net += diff;
      sizeChanged = true;
      sizeMoves.push({ line, size, diff });
      changes.push([
        several ? `Size of ${line.name}` : "Size",
        line.sizeLine.replace(/^.* · /, ""),
        `serves ${size.serves}`,
      ]);
    }

    if (Object.keys(errors).length) return { kind: "invalid", errors } as const;
    if (!changes.length) return { kind: "nothing" } as const;
    const money = changeMoney(net);
    if (money.kind === "up")
      return { kind: "needs-payment", pence: money.pence } as const;
    const waived = money.kind === "waived";
    for (const m of sizeMoves)
      updates.set(m.line.id, {
        ...updates.get(m.line.id),
        sizeId: m.size.id,
        sizeLine: sizeLine(m.size),
        ...(waived
          ? {}
          : {
              sizePricePence: m.size.pricePence,
              pricePence: m.line.pricePence + m.diff,
            }),
      });
    for (const [id, set] of updates)
      await tx
        .update(orderLines)
        .set(set)
        .where(and(eq(orderLines.id, id), eq(orderLines.orderId, o.id)));
    const newTotal = waived ? o.totalPence : o.totalPence + net;
    await tx
      .update(orders)
      .set({ version: o.version + 1, totalPence: newTotal })
      .where(eq(orders.id, o.id));
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "customer",
        changes,
        // A waived difference keeps its amount on the record (“Difference under £0.30 waived”, §6.4).
        moneyKind: money.kind === "down" ? "down" : "none",
        moneyPence: waived ? net : money.pence,
        newTotalPence: newTotal,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    return {
      kind: "saved",
      changeId: c.id,
      order: o,
      changes,
      newTotal,
      money,
      sizeChanged,
      messageChanged,
    } as const;
  });
  if (result.kind !== "saved") return result;

  const { order: o, changes, changeId, money, newTotal } = result;
  let refundOk = true;
  if (money.kind === "down")
    refundOk = (
      await refundOrder(
        db,
        gw,
        { orderId: o.id, amountPence: money.pence, kind: "change", changeId },
        now,
      )
    ).ok;

  // E-mail 12 to the customer and “Customer changed” to Linda (§8.1, §8.3), once each, from this change.
  const delivery = o.handover === "delivery";
  const same = [
    result.sizeChanged ? "" : "size",
    result.messageChanged ? "" : "message",
    "date",
    delivery ? "delivery time" : "",
    delivery ? "address" : "",
  ].filter(Boolean);
  const view: ChangeView = {
    number: o.number,
    token: o.token,
    date: String(o.date),
    today,
    changes,
    same,
    newTotalPence: newTotal,
    money:
      money.kind === "down"
        ? { kind: "down", pence: money.pence }
        : { kind: "none", pence: 0 },
    newDeadline: null,
  };
  if (o.email)
    await queueMail(
      db,
      {
        key: `order:${o.id}:12:${changeId}`,
        template: "change-saved",
        data: { view },
        to: o.email,
      },
      now,
    );
  await queueMail(
    db,
    {
      key: `alert:change:${changeId}`,
      template: "alert",
      data: {
        kind: "customer-changed",
        view: {
          number: o.number,
          what: changes
            .map(([w, , after]) => `${w.toLowerCase()}: ${after}`)
            .join(", "),
          detail:
            money.kind === "down"
              ? `${formatPrice(money.pence)} back to their card${refundOk ? "." : " — the refund failed, see Money."}`
              : money.kind === "waived"
                ? "Difference under £0.30 waived."
                : "No money changed.",
        },
      },
      to: (await readSettings(db)).email,
      replyTo: o.email || null,
    },
    now,
  );
  return { kind: "saved", changeId, money, refundOk };
}

/** The change just saved, for the status page's banner (§6.3: shown once, gone on the next load). */
export async function recentChange(
  db: Db,
  orderId: number,
  changeId: number,
  now = new Date(),
) {
  const [c] = await db
    .select()
    .from(orderChanges)
    .where(
      and(eq(orderChanges.id, changeId), eq(orderChanges.orderId, orderId)),
    );
  return c && now.getTime() - c.createdAt.getTime() < 2 * 60_000 ? c : null;
}
