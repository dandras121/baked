// Change your order (§6.4), the customer's side: the message on each cake (6.2a) and the size — the same price or
// smaller refunded at once (6.2b), bigger paid for first (6.2c). Every save carries the order's version (a page out of
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
import type { Gateway, Intent } from "@/lib/payments";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { refundOrder } from "./refund-repo";
import { LOCK_MS } from "./payment-repo";
import {
  cakeSizes,
  cakes,
  orderChanges,
  orderLines,
  orders,
  refunds,
} from "./schema";
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
  | { kind: "locked" }
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

type SizeRow = typeof cakeSizes.$inferSelect;
type Order = typeof orders.$inferSelect;

/** What a set of edits would do to these lines: the rows of e-mail 12, the line updates and the net difference. */
function plan(
  lines: Line[],
  choices: Record<number, SizeChoice[]>,
  sizeRows: SizeRow[],
  input: ChangeInput,
) {
  const several = lines.length > 1;
  const errors: Record<number, string> = {};
  const changes: [string, string, string][] = [];
  const messages = new Map<number, string>();
  const moves: { line: Line; size: SizeRow; diff: number }[] = [];
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
    messages.set(line.id, text);
    changes.push([
      several ? `Message on ${line.name}` : "Message",
      shown(line.message),
      shown(text),
    ]);
  }
  for (const [key, sizeId] of Object.entries(input.sizes ?? {})) {
    const line = lines.find((l) => l.id === Number(key));
    const choice =
      line && choices[line.id]?.find((c) => c.id === Number(sizeId));
    if (!line || !choice || choice.current || choice.removed) continue;
    const size = sizeRows.find((s) => s.id === choice.id);
    if (!size) continue;
    moves.push({ line, size, diff: size.pricePence - sizePaid(line) });
    changes.push([
      several ? `Size of ${line.name}` : "Size",
      line.sizeLine.replace(/^.* · /, ""),
      `serves ${size.serves}`,
    ]);
  }
  const net = moves.reduce((n, m) => n + m.diff, 0);
  return { errors, changes, messages, moves, net };
}
type Plan = ReturnType<typeof plan>;

/** Writes a plan's line updates; the lines take the new prices unless the difference was waived. */
async function writeLines(tx: Tx, orderId: number, p: Plan, waived: boolean) {
  const updates = new Map<number, Partial<Line>>();
  for (const [id, message] of p.messages) updates.set(id, { message });
  for (const m of p.moves)
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
      .where(and(eq(orderLines.id, id), eq(orderLines.orderId, orderId)));
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The lines, their size choices and every size row: read before a transaction. */
async function context(db: Db, orderId: number) {
  const lines = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, orderId))
    .orderBy(orderLines.position);
  const choices = await sizeChoices(db, lines);
  const sizeRows = await db.select().from(cakeSizes);
  return { choices, sizeRows };
}

const locked = (o: Order, now: Date) =>
  !!o.lockedAt && now.getTime() - o.lockedAt.getTime() < LOCK_MS;

/** A size-up payment is going through on this order (§6.4): nothing else can change until it finishes or lapses. */
export const paymentInProgress = locked;

/**
 * Saves the customer's changes on a catalogue order whose change window is open. A net rise of £0.30 or more is paid
 * first (`prepareChangePayment`); a net fall of £0.30 or more is refunded to the card at once; under £0.30 either way
 * nothing moves and the lines keep their price paid.
 */
export async function saveChanges(
  db: Db,
  gw: Pick<Gateway, "refund">,
  input: ChangeInput,
  now = new Date(),
): Promise<SaveResult> {
  const today = londonDate(now);
  const { choices, sizeRows } = await context(db, input.orderId);
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
    if (locked(o, now)) return { kind: "locked" } as const;
    if (o.version !== input.version) return { kind: "stale" } as const;
    const lines = await tx
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const p = plan(lines, choices, sizeRows, input);
    if (Object.keys(p.errors).length)
      return { kind: "invalid", errors: p.errors } as const;
    if (!p.changes.length) return { kind: "nothing" } as const;
    const money = changeMoney(p.net);
    if (money.kind === "up")
      return { kind: "needs-payment", pence: money.pence } as const;
    const waived = money.kind === "waived";
    await writeLines(tx, o.id, p, waived);
    const newTotal = waived ? o.totalPence : o.totalPence + p.net;
    await tx
      .update(orders)
      .set({ version: o.version + 1, totalPence: newTotal })
      .where(eq(orders.id, o.id));
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "customer",
        changes: p.changes,
        // A waived difference keeps its amount on the record (“Difference under £0.30 waived”, §6.4).
        moneyKind: money.kind === "down" ? "down" : "none",
        moneyPence: waived ? p.net : money.pence,
        newTotalPence: newTotal,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    return {
      kind: "saved",
      changeId: c.id,
      order: o,
      plan: p,
      newTotal,
      money,
    } as const;
  });
  if (result.kind !== "saved") return result;
  const { order: o, changeId, money, newTotal } = result;
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
  await tell(db, o, result.plan, changeId, newTotal, money, refundOk, now);
  return { kind: "saved", changeId, money, refundOk };
}

export type PrepareResult =
  | { kind: "pay"; clientSecret: string; amountPence: number; changeId: number }
  | Exclude<SaveResult, { kind: "saved" } | { kind: "needs-payment" }>
  | { kind: "no-rise" };

/**
 * Pay £… and save (§6.4): the edits are checked as for a save; a net rise of £0.30 or more becomes a pending change,
 * the order is locked (as the checkout lock, §5.5) and a PaymentIntent of kind `change` is made for the difference.
 * Nothing on the order changes until that payment succeeds (`applyChangePayment`).
 */
export async function prepareChangePayment(
  db: Db,
  gw: Pick<Gateway, "createForChange">,
  input: ChangeInput,
  now = new Date(),
): Promise<PrepareResult> {
  const today = londonDate(now);
  const { choices, sizeRows } = await context(db, input.orderId);
  const pending = await db.transaction(async (tx) => {
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
    if (locked(o, now)) return { kind: "locked" } as const;
    if (o.version !== input.version) return { kind: "stale" } as const;
    const lines = await tx
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const p = plan(lines, choices, sizeRows, input);
    if (Object.keys(p.errors).length)
      return { kind: "invalid", errors: p.errors } as const;
    if (!p.changes.length) return { kind: "nothing" } as const;
    const money = changeMoney(p.net);
    if (money.kind !== "up") return { kind: "no-rise" } as const;
    // An earlier payment that never came is dropped; this one takes the lock.
    await tx
      .update(orderChanges)
      .set({ status: "dropped" })
      .where(
        and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "pending")),
      );
    await tx.update(orders).set({ lockedAt: now }).where(eq(orders.id, o.id));
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "customer",
        changes: p.changes,
        moneyKind: "up",
        moneyPence: money.pence,
        newTotalPence: o.totalPence + money.pence,
        status: "pending",
        payload: { messages: input.messages ?? {}, sizes: input.sizes ?? {} },
        baseVersion: o.version,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    return {
      kind: "pending",
      changeId: c.id,
      number: o.number,
      pence: money.pence,
    } as const;
  });
  if (pending.kind !== "pending") return pending;
  const intent = await gw.createForChange(
    pending.changeId,
    pending.number,
    pending.pence,
  );
  await db
    .update(orderChanges)
    .set({ paymentIntentId: intent.id })
    .where(eq(orderChanges.id, pending.changeId));
  return {
    kind: "pay",
    clientSecret: intent.clientSecret,
    amountPence: pending.pence,
    changeId: pending.changeId,
  };
}

/** The payment did not go through (declined, abandoned): the change is dropped and the order opens again. */
export async function dropChangePayment(
  db: Db,
  orderId: number,
  changeId: number,
) {
  await db.transaction(async (tx) => {
    const [c] = await tx
      .update(orderChanges)
      .set({ status: "dropped" })
      .where(
        and(
          eq(orderChanges.id, changeId),
          eq(orderChanges.orderId, orderId),
          eq(orderChanges.status, "pending"),
        ),
      )
      .returning({ id: orderChanges.id });
    if (c)
      await tx
        .update(orders)
        .set({ lockedAt: null })
        .where(eq(orders.id, orderId));
  });
}

/** The webhook's payment_intent.payment_failed for a change: dropped, the order open again. */
export async function dropChangePaymentByIntent(
  db: Db,
  paymentIntentId: string,
) {
  const [c] = await db
    .select({ id: orderChanges.id, orderId: orderChanges.orderId })
    .from(orderChanges)
    .where(eq(orderChanges.paymentIntentId, paymentIntentId));
  if (c) await dropChangePayment(db, c.orderId, c.id);
  return "dropped" as const;
}

/**
 * A change payment that Stripe says succeeded (the page after paying, the webhook or the reconciliation job — whichever
 * comes first; the others find it already applied). The order must still be at the version the change was planned on;
 * if it has moved on, nothing is applied, the payment is refunded (kind `excess`) and Linda is told (§6.4). A payment
 * started before 23:59 on D-2 is honoured after the window closes.
 */
export async function applyChangePayment(
  db: Db,
  gw: Pick<Gateway, "refund">,
  intent: Intent,
  now = new Date(),
): Promise<"applied" | "already" | "refunded" | "nothing"> {
  if (intent.kind !== "change" || intent.status !== "succeeded")
    return "nothing";
  const [c0] = await db
    .select()
    .from(orderChanges)
    .where(eq(orderChanges.paymentIntentId, intent.id));
  if (!c0) return "nothing";
  if (c0.status === "saved") return "already";
  const { choices, sizeRows } = await context(db, c0.orderId);
  const result = await db.transaction(async (tx) => {
    const [c] = await tx
      .select()
      .from(orderChanges)
      .where(eq(orderChanges.id, c0.id))
      .for("update");
    if (c.status === "saved") return { kind: "already" } as const;
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, c.orderId))
      .for("update");
    const lines = await tx
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const p = plan(lines, choices, sizeRows, (c.payload ?? {}) as ChangeInput);
    const sameOrder =
      o.version === c.baseVersion &&
      o.status === "confirmed" &&
      p.net === c.moneyPence;
    if (!sameOrder) {
      await tx
        .update(orderChanges)
        .set({ status: "dropped", paidPence: intent.amountReceivedPence })
        .where(eq(orderChanges.id, c.id));
      if (o.lockedAt)
        await tx
          .update(orders)
          .set({ lockedAt: null })
          .where(eq(orders.id, o.id));
      return { kind: "moved", order: o } as const;
    }
    await writeLines(tx, o.id, p, false);
    const newTotal = o.totalPence + p.net;
    await tx
      .update(orders)
      .set({ version: o.version + 1, totalPence: newTotal, lockedAt: null })
      .where(eq(orders.id, o.id));
    await tx
      .update(orderChanges)
      .set({
        status: "saved",
        paidPence: intent.amountReceivedPence,
        newTotalPence: newTotal,
        changes: p.changes,
      })
      .where(eq(orderChanges.id, c.id));
    return { kind: "applied", order: o, plan: p, newTotal } as const;
  });
  if (result.kind === "already") return "already";
  if (result.kind === "moved") {
    await refundPayment(db, gw, result.order, intent, c0.id, now);
    return "refunded";
  }
  await tell(
    db,
    result.order,
    result.plan,
    c0.id,
    result.newTotal,
    { kind: "up", pence: result.plan.net },
    true,
    now,
  );
  return "applied";
}

/** The whole of a change payment back (kind `excess`), and “Check this payment” to Linda. */
async function refundPayment(
  db: Db,
  gw: Pick<Gateway, "refund">,
  o: Order,
  intent: Intent,
  changeId: number,
  now: Date,
) {
  const [row] = await db
    .insert(refunds)
    .values({
      orderId: o.id,
      changeId,
      kind: "excess",
      amountPence: intent.amountReceivedPence,
      paymentIntentId: intent.id,
      createdAt: now,
    })
    .returning({ id: refunds.id });
  const r = await gw.refund(
    intent.id,
    intent.amountReceivedPence,
    `${o.id}-${row.id}`,
  );
  await db
    .update(refunds)
    .set(
      r.ok
        ? { stripeRefundId: r.id, status: r.status }
        : { status: "failed", error: r.error },
    )
    .where(eq(refunds.id, row.id));
  await queueMail(
    db,
    {
      key: `alert:change-moved:${changeId}`,
      template: "alert",
      data: {
        kind: "check-payment",
        view: {
          amountPence: intent.amountReceivedPence,
          why: `a change to ${o.number} was paid after the order had changed again, so it was not applied and the payment went back${r.ok ? "" : " — the refund failed, see Money"}.`,
        },
      },
      to: (await readSettings(db)).email,
    },
    now,
  );
}

/** E-mail 12 to the customer and “Customer changed” to Linda (§8.1, §8.3), once each, from this change. */
async function tell(
  db: Db,
  o: Order,
  p: Plan,
  changeId: number,
  newTotal: number,
  money: { kind: string; pence: number },
  refundOk: boolean,
  now: Date,
) {
  const today = londonDate(now);
  const delivery = o.handover === "delivery";
  const same = [
    p.moves.length ? "" : "size",
    p.messages.size ? "" : "message",
    "date",
    delivery ? "delivery time" : "",
    delivery ? "address" : "",
  ].filter(Boolean);
  const view: ChangeView = {
    number: o.number,
    token: o.token,
    date: String(o.date),
    today,
    changes: p.changes,
    same,
    newTotalPence: newTotal,
    money:
      money.kind === "down" || money.kind === "up"
        ? { kind: money.kind, pence: money.pence }
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
          what: p.changes
            .map(([w, , after]) => `${w.toLowerCase()}: ${after}`)
            .join(", "),
          detail:
            money.kind === "up"
              ? `Paid ${formatPrice(money.pence)} by card.`
              : money.kind === "down"
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
      and(
        eq(orderChanges.id, changeId),
        eq(orderChanges.orderId, orderId),
        eq(orderChanges.status, "saved"),
      ),
    );
  return c && now.getTime() - c.createdAt.getTime() < 10 * 60_000 ? c : null;
}
