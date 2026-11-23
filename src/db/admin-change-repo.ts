// Change the order from the admin (§9.7): the order's own fields and the cakes (size, options, message — the
// customer's rules, `planCakes`). Saved with the version check (§9.1); a full or closed day is the Owner's to book.
// Money: a fall or a not fully paid order saves at once (any excess goes back to the card); a rise on a fully paid
// order becomes a waiting change with a payment link (e-mail 15) that applies it when paid (e-mail 12 follows).
import { and, count, eq, lt } from "drizzle-orm";
import { dayWarnings } from "@/lib/admin/add-order";
import {
  changeRows,
  newCharge,
  newEarliest,
  type ChangeValue,
} from "@/lib/admin/change-order";
import { memberChange } from "@/lib/admin/versions";
import { changeMoney } from "@/lib/change-money";
import { lastChangeDay } from "@/lib/deadlines";
import type { ChangeView } from "@/lib/mail/after-emails";
import { londonDate, type CalendarDate } from "@/lib/london-time";
import type { Gateway } from "@/lib/payments";
import { dayInfo } from "./add-order-repo";
import {
  planCakes,
  writeLines,
  type ChangeInput,
  type Plan,
} from "./change-repo";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { createPayLink, withdrawPayLink } from "./pay-link-repo";
import { netPaid, refundOrder } from "./refund-repo";
import {
  orderChanges,
  orderHistory,
  orderLines,
  orders,
  paymentLinks,
} from "./schema";
import { readSettings } from "./settings-repo";
import { saveOrderVersioned } from "./versioned";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Order = typeof orders.$inferSelect;
type Gw = Pick<Gateway, "refund" | "cancel">;
export type CakeEdits = Pick<ChangeInput, "messages" | "sizes" | "options">;

export type ChangeResult =
  | { kind: "saved"; emailed: boolean; refundOk: boolean }
  | { kind: "waiting"; pence: number }
  | { kind: "nothing" }
  | { kind: "conflict"; line: string }
  | { kind: "closed" }
  | { kind: "busy" }
  | { kind: "owner-only"; warnings: string[] }
  | { kind: "invalid"; errors: Record<number, string> };

const fieldsOf = (o: Order) => ({
  ...o,
  date: String(o.date),
  earliestDate: String(o.earliestDate),
});

/** The waiting change of an order, with its open link (§9.7 “Change waiting for £… — link sent {date}”). */
export async function waitingChange(db: Db | Tx, orderId: number) {
  const [row] = await db
    .select({ change: orderChanges, link: paymentLinks })
    .from(orderChanges)
    .leftJoin(paymentLinks, eq(paymentLinks.changeId, orderChanges.id))
    .where(
      and(
        eq(orderChanges.orderId, orderId),
        eq(orderChanges.status, "pending"),
        eq(orderChanges.by, "linda"),
      ),
    );
  return row ?? null;
}

/** Everything a change would do, and its money. */
async function assess(
  db: Db | Tx,
  o: Order,
  value: ChangeValue,
  cakes: CakeEdits,
  owner: boolean,
  today: CalendarDate,
) {
  // A Helper changes the message only (Decided D9).
  const edits: CakeEdits = owner ? cakes : { messages: cakes.messages };
  const p = await planCakes(db, o, edits, today);
  const { rows, contact } = changeRows(fieldsOf(o), value, today);
  const s = await readSettings(db as Db);
  const charge = newCharge(o, value.handover, s.deliveryChargePence);
  const net = p.net + (charge - o.deliveryChargePence);
  return {
    p,
    rows: [...p.changes, ...rows],
    contact,
    charge,
    money: changeMoney(net),
    net,
  };
}

/** Writes a change: the lines and the order's fields; returns the new total. */
async function write(
  tx: Tx,
  o: Order,
  value: ChangeValue,
  a: Awaited<ReturnType<typeof assess>>,
  by: string,
  version: number,
  now: Date,
) {
  const waived = a.money.kind === "waived";
  await writeLines(tx, o.id, a.p as Plan, waived);
  const newTotal = waived ? o.totalPence : o.totalPence + a.net;
  const r = await saveOrderVersioned(
    tx,
    o.id,
    version,
    {
      date: value.date,
      earliestDate: newEarliest(fieldsOf(o), value.date, value.customerAsked),
      handover: value.handover,
      deliveryWindow: value.deliveryWindow,
      address: value.address,
      town: value.town,
      postcode: value.postcode,
      collectionTime: value.collectionTime,
      customerName: value.customerName,
      email: value.email,
      phone: value.phone,
      phoneE164: value.phoneE164,
      deliveryChargePence: a.charge,
      totalPence: newTotal,
      checkDay: value.date === String(o.date) ? o.checkDay : false,
    },
    memberChange(by),
    now,
  );
  return { r, newTotal };
}

function historyLine(
  rows: [string, string, string][],
  money: { kind: string; pence: number },
) {
  const what = rows.map(([w, a, b]) => `${w}: ${a} → ${b}`).join("; ");
  return money.kind === "waived"
    ? `${what} · difference under £0.30 waived`
    : what;
}

/** E-mail 12 (§8.1); the queue leaves it out when customer e-mails are off. */
async function tellCustomer(
  db: Db,
  o: Order,
  changeId: number,
  rows: [string, string, string][],
  date: string,
  newTotal: number,
  money: ChangeView["money"],
  now: Date,
) {
  if (!rows.length || !o.email) return false;
  const today = londonDate(now);
  const view: ChangeView = {
    number: o.number,
    token: o.token,
    date,
    today,
    changes: rows,
    same: [],
    newTotalPence: newTotal,
    money,
    newDeadline:
      date !== String(o.date)
        ? o.kind === "manual"
          ? "me"
          : lastChangeDay(date)
        : null,
  };
  return (
    (await queueMail(
      db,
      {
        key: `order:${o.id}:12:${changeId}`,
        template: "change-saved",
        data: { view },
        to: o.email,
      },
      now,
    )) === "queued"
  );
}

export async function changeOrder(
  db: Db,
  gw: Gw,
  input: {
    orderId: number;
    seenVersion: number;
    by: string;
    owner: boolean;
    value: ChangeValue;
    cakes: CakeEdits;
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
  if (await waitingChange(db, o.id)) return { kind: "busy" };
  const a = await assess(db, o, v, input.cakes, input.owner, today);
  if (Object.keys(a.p.errors).length)
    return { kind: "invalid", errors: a.p.errors };
  if (!a.rows.length && !a.contact.length) return { kind: "nothing" };

  if (v.date !== String(o.date)) {
    const [{ n: cakes }] = await db
      .select({ n: count() })
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id));
    const warnings = dayWarnings(await dayInfo(db, v.date, now, o.id), cakes);
    if (warnings.length && !input.owner)
      return { kind: "owner-only", warnings };
  }
  const paid = await netPaid(db, o);

  // A rise on a fully paid order waits for the difference (§9.7): the order stays as it was.
  if (a.money.kind === "up" && paid >= o.totalPence) {
    if (o.version !== input.seenVersion) {
      const [cur] = await db.select().from(orders).where(eq(orders.id, o.id));
      const { conflictLine } = await import("@/lib/admin/versions");
      return {
        kind: "conflict",
        line: conflictLine(cur.changedBy, cur.changedAt),
      };
    }
    const [c] = await db
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "linda",
        changes: [...a.rows, ...a.contact],
        moneyKind: "up",
        moneyPence: a.money.pence,
        newTotalPence: o.totalPence + a.net,
        status: "pending",
        payload: {
          value: v,
          cakes: input.owner ? input.cakes : { messages: input.cakes.messages },
          by: input.by,
        },
        baseVersion: o.version,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    await createPayLink(
      db,
      {
        orderId: o.id,
        purpose: "difference",
        amountPence: a.money.pence,
        changeId: c.id,
      },
      now,
    );
    await db.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: input.by,
      what: `Change waiting for ${money(a.money.pence)} — link sent · ${historyLine([...a.rows, ...a.contact], a.money)}`,
    });
    return { kind: "waiting", pence: a.money.pence };
  }

  const saved = await db.transaction(async (tx) => {
    const { r, newTotal } = await write(
      tx,
      o,
      v,
      a,
      input.by,
      input.seenVersion,
      now,
    );
    if (!r.ok) return { ok: false as const, line: r.line };
    const all = [...a.rows, ...a.contact];
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "linda",
        changes: all,
        moneyKind:
          a.money.kind === "down"
            ? "down"
            : a.money.kind === "up"
              ? "owed"
              : "none",
        moneyPence: a.money.kind === "waived" ? a.net : a.money.pence,
        newTotalPence: newTotal,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    await tx
      .insert(orderHistory)
      .values({
        orderId: o.id,
        at: now,
        byName: input.by,
        what: `Changed the order · ${historyLine(all, a.money)}`,
      });
    return { ok: true as const, changeId: c.id, newTotal };
  });
  if (!saved.ok) return { kind: "conflict", line: saved.line };

  // Paid more than the new total: the excess goes back to the card (§9.7).
  let refundOk = true;
  const excess = paid - saved.newTotal;
  if (excess > 0 && saved.newTotal < o.totalPence)
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
  const mailMoney: ChangeView["money"] =
    excess > 0 && saved.newTotal < o.totalPence
      ? { kind: "down", pence: excess }
      : a.money.kind === "up"
        ? { kind: "owed", pence: Math.max(0, saved.newTotal - paid) }
        : { kind: "none", pence: 0 };
  const emailed = await tellCustomer(
    db,
    o,
    saved.changeId,
    a.rows,
    v.date,
    saved.newTotal,
    mailMoney,
    now,
  );
  return { kind: "saved", emailed, refundOk };
}

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

/**
 * The difference was paid (§9.7): the waiting change applies to the order as it stands, e-mail 12 follows. When the
 * order has meanwhile changed or ended, the change is dropped; the payment stays with the order (Linda is told).
 */
export async function applyWaitingChange(
  db: Db,
  gw: Gw,
  changeId: number,
  now = new Date(),
) {
  const [c] = await db
    .select()
    .from(orderChanges)
    .where(eq(orderChanges.id, changeId));
  if (!c || c.status !== "pending") return "already" as const;
  const [o] = await db.select().from(orders).where(eq(orders.id, c.orderId));
  const payload = c.payload as {
    value: ChangeValue;
    cakes: CakeEdits;
    by: string;
  };
  if (!o || o.status !== "confirmed" || o.version !== c.baseVersion) {
    await db
      .update(orderChanges)
      .set({ status: "dropped" })
      .where(eq(orderChanges.id, c.id));
    return "dropped" as const;
  }
  const a = await assess(
    db,
    o,
    payload.value,
    payload.cakes,
    true,
    londonDate(now),
  );
  const done = await db.transaction(async (tx) => {
    const { r, newTotal } = await write(
      tx,
      o,
      payload.value,
      a,
      payload.by,
      o.version,
      now,
    );
    if (!r.ok) return null;
    await tx
      .update(orderChanges)
      .set({ status: "saved", newTotalPence: newTotal })
      .where(eq(orderChanges.id, c.id));
    await tx
      .insert(orderHistory)
      .values({
        orderId: o.id,
        at: now,
        byName: payload.by,
        what: `The difference was paid — the waiting change is applied`,
      });
    return newTotal;
  });
  if (done === null) return "dropped" as const;
  await tellCustomer(
    db,
    o,
    c.id,
    a.rows,
    payload.value.date,
    done,
    { kind: "up", pence: c.moneyPence },
    now,
  );
  return "applied" as const;
}

/** Cancel this change (§9.7, Owner): its link is withdrawn; no e-mail. */
export async function cancelWaitingChange(
  db: Db,
  gw: Gw,
  orderId: number,
  by: string,
  now = new Date(),
) {
  const w = await waitingChange(db, orderId);
  if (!w) return false;
  if (w.link && w.link.status === "open")
    await withdrawPayLink(db, gw as never, w.link.id);
  await db
    .update(orderChanges)
    .set({ status: "dropped" })
    .where(eq(orderChanges.id, w.change.id));
  await db
    .insert(orderHistory)
    .values({
      orderId,
      at: now,
      byName: by,
      what: "Cancelled the waiting change — its link is withdrawn",
    });
  return true;
}

/** 03:00 (§12): a waiting change still unpaid after 23:59 on the order's date is dropped and its link withdrawn. */
export async function dropStaleWaitingChanges(
  db: Db,
  gw: Gw,
  now = new Date(),
) {
  const today = londonDate(now);
  const stale = await db
    .select({ orderId: orderChanges.orderId })
    .from(orderChanges)
    .innerJoin(orders, eq(orders.id, orderChanges.orderId))
    .where(
      and(
        eq(orderChanges.status, "pending"),
        eq(orderChanges.by, "linda"),
        lt(orders.date, today),
      ),
    );
  for (const s of stale)
    await cancelWaitingChange(db, gw, s.orderId, "The site", now);
  return stale.length;
}

/** 8.6a's name, kept for its callers: the order's own fields only. */
export const changeOrderFields = (
  db: Db,
  gw: Gw,
  input: {
    orderId: number;
    seenVersion: number;
    by: string;
    owner: boolean;
    value: ChangeValue;
  },
  now = new Date(),
) => changeOrder(db, gw, { ...input, cakes: {} }, now);
