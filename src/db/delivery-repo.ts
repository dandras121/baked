// Delivery attempts (§6.8): Linda's Nobody was in, e-mail 13, and the customer's choice through `/delivery/[token]`.
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  collectOffer,
  deliveryPhase,
  redeliveryOffered,
} from "@/lib/delivery";
import { addDays, londonDate, type CalendarDate } from "@/lib/london-time";
import type { MissedView } from "@/lib/mail/after-emails";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { closedDays, deliveryAttempts, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Order = typeof orders.$inferSelect;
export type AttemptRow = typeof deliveryAttempts.$inferSelect;

/** The order's latest attempt row, or null while the first (its own date and window) has no record yet. */
export async function latestAttempt(db: Db, orderId: number) {
  const [a] = await db
    .select()
    .from(deliveryAttempts)
    .where(eq(deliveryAttempts.orderId, orderId))
    .orderBy(desc(deliveryAttempts.attempt))
    .limit(1);
  return a ?? null;
}

const isClosed = async (db: Db, day: CalendarDate) =>
  (
    await db
      .select({ day: closedDays.day })
      .from(closedDays)
      .where(eq(closedDays.day, day))
  ).length > 0;

export type RecordResult =
  | { kind: "recorded"; token: string; attempt: number }
  | { kind: "not-delivery" }
  | { kind: "not-yet" }
  | { kind: "already" };

/**
 * Nobody was in (§6.8): on the latest attempt, on or after its day. Gives the attempt its delivery token and queues
 * e-mail 13 — with Redeliver only on a first attempt whose next day is open.
 */
export async function recordNobodyIn(
  db: Db,
  orderId: number,
  now = new Date(),
): Promise<RecordResult> {
  const today = londonDate(now);
  const result = await db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!o || o.handover !== "delivery" || o.status !== "confirmed")
      return { kind: "not-delivery" } as const;
    const latest = await latestAttempt(tx as unknown as Db, o.id);
    if (latest && latest.outcome !== "none") return { kind: "already" } as const;
    const day = latest ? String(latest.day) : String(o.date);
    if (day > today) return { kind: "not-yet" } as const;
    const token = randomBytes(24).toString("base64url");
    const fields = {
      outcome: "nobody-in",
      recordedOn: today,
      recordedAt: now,
      token,
    };
    let row: AttemptRow;
    if (latest)
      [row] = await tx
        .update(deliveryAttempts)
        .set(fields)
        .where(eq(deliveryAttempts.id, latest.id))
        .returning();
    else
      [row] = await tx
        .insert(deliveryAttempts)
        .values({
          orderId: o.id,
          attempt: 1,
          day,
          deliveryWindow: o.deliveryWindow,
          ...fields,
        })
        .returning();
    return { kind: "recorded", order: o, row } as const;
  });
  if (result.kind !== "recorded") return result;
  const { order: o, row } = result;
  const s = await readSettings(db);
  const view: MissedView = {
    number: o.number,
    date: String(o.date),
    today,
    window: row.deliveryWindow,
    town: s.town,
    feePence: s.secondAttemptFeePence,
    deliveryToken: row.token!,
    late: false,
    redeliveryOffered: redeliveryOffered(
      row.attempt,
      await isClosed(db, addDays(today, 1)),
    ),
  };
  if (o.email)
    await queueMail(
      db,
      {
        key: `order:${o.id}:13:${row.attempt}`,
        template: "missed-you",
        data: { view },
        to: o.email,
      },
      now,
    );
  return { kind: "recorded", token: row.token!, attempt: row.attempt };
}

/** What `/delivery/[token]` needs: the attempt, its order and whether redelivery is offered. */
export async function attemptByToken(db: Db, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [r] = await db
    .select({ a: deliveryAttempts, o: orders })
    .from(deliveryAttempts)
    .innerJoin(orders, eq(orders.id, deliveryAttempts.orderId))
    .where(eq(deliveryAttempts.token, token));
  if (!r) return null;
  const offer = redeliveryOffered(
    r.a.attempt,
    await isClosed(db, addDays(String(r.a.recordedOn), 1)),
  );
  return { attempt: r.a, order: r.o as Order, offerRedelivery: offer };
}

export type ChooseResult =
  | { kind: "chosen"; collectDay: CalendarDate }
  | { kind: "already" }
  | { kind: "closed" }
  | { kind: "missing" };

/** Yes, I will collect it (§6.8): final; the day follows 18:00; Linda is told. */
export async function chooseCollect(
  db: Db,
  token: string,
  now = new Date(),
): Promise<ChooseResult> {
  const result = await db.transaction(async (tx) => {
    const [a] = await tx
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.token, token))
      .for("update");
    if (!a || a.outcome !== "nobody-in") return { kind: "missing" } as const;
    const phase = deliveryPhase(
      {
        ...a,
        recordedOn: a.recordedOn && String(a.recordedOn),
        collectDay: null,
      },
      now,
    );
    if (phase === "collect" || phase === "redeliver")
      return { kind: "already" } as const;
    if (phase === "closed") return { kind: "closed" } as const;
    const collectDay = collectOffer(String(a.recordedOn), now).day;
    await tx
      .update(deliveryAttempts)
      .set({ choice: "collect", chosenAt: now, collectDay })
      .where(
        and(
          eq(deliveryAttempts.id, a.id),
          eq(deliveryAttempts.choice, "none"),
        ),
      );
    const [o] = await tx
      .select({ id: orders.id, number: orders.number, email: orders.email })
      .from(orders)
      .where(eq(orders.id, a.orderId));
    return { kind: "chosen", collectDay, order: o, attempt: a } as const;
  });
  if (result.kind !== "chosen") return result;
  await queueMail(
    db,
    {
      key: `alert:delivery-choice:${result.attempt.id}`,
      template: "alert",
      data: {
        kind: "delivery-choice",
        view: {
          number: result.order.number,
          choice: "collect",
          date: result.collectDay,
          today: londonDate(now),
        },
      },
      to: (await readSettings(db)).email,
      replyTo: result.order.email || null,
    },
    now,
  );
  return { kind: "chosen", collectDay: result.collectDay };
}
