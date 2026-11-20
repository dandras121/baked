// Today (§9.3): the rows, their flags, the tiles and the subtitle numbers — one source for the admin screen and for
// e-mail 4, so the 06:00 list and the screen always agree.
import { and, count, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { startMinutes, type TodayFlag } from "@/lib/admin/today";
import { addDays, weekStart, type CalendarDate } from "@/lib/london-time";
import type { connect } from "./client";
import { moneyTaken, stillToPay, stillToPayAll } from "./money-repo";
import {
  deliveryAttempts,
  enquiries,
  orderChanges,
  orderLines,
  orders,
} from "./schema";

type Db = ReturnType<typeof connect>["db"];
type Order = typeof orders.$inferSelect;

export type TodayRow = {
  orderId: number;
  number: string;
  name: string;
  phone: string;
  phoneE164: string | null;
  handover: "delivery" | "collection";
  window: string | null;
  collectionTime: string | null;
  cakes: string[];
  address: string | null;
  town: string | null;
  allergyNote: string | null;
  status: string;
  handedOverAt: Date | null;
  /** today · redelivery · collect (a missed delivery collected today) · no-choice · not-collected */
  kind: "today" | "redelivery" | "collect" | "no-choice" | "not-collected";
  flags: TodayFlag[];
  stillToPayPence: number;
  /** Nobody was in can be recorded (8.3b): a delivery, confirmed, today's attempt has no outcome yet. */
  canNobodyIn: boolean;
};

const LIVE = ["confirmed", "completed"];

export async function todayBoard(db: Db, day: CalendarDate) {
  const yesterday = addDays(day, -1);
  // Every order that can appear: dated today, earlier and not handed over, or with an attempt that matters today.
  const attempts = await db
    .select()
    .from(deliveryAttempts)
    .orderBy(desc(deliveryAttempts.attempt));
  const latest = new Map<number, (typeof attempts)[number]>();
  for (const a of attempts)
    if (!latest.has(a.orderId)) latest.set(a.orderId, a);

  const candidates = await db
    .select()
    .from(orders)
    .where(
      or(
        and(eq(orders.date, day), inArray(orders.status, LIVE)),
        and(lte(orders.date, yesterday), eq(orders.status, "confirmed")),
        inArray(orders.id, [...latest.keys(), -1]),
      ),
    );

  const rows: (TodayRow & { booked: number })[] = [];
  for (const o of candidates) {
    const a = latest.get(o.id);
    const date = String(o.date);
    let kind: TodayRow["kind"] | null = null;
    if (a && a.attempt > 1 && String(a.day) === day && LIVE.includes(o.status))
      kind = "redelivery";
    else if (
      a?.choice === "collect" &&
      a.collectDay &&
      o.status === "confirmed"
    )
      kind =
        String(a.collectDay) === day
          ? "collect"
          : String(a.collectDay) < day
            ? "not-collected"
            : null;
    else if (
      a?.outcome === "nobody-in" &&
      a.choice === "none" &&
      o.status === "confirmed" &&
      String(a.day) < day
    )
      kind = "no-choice";
    else if (date === day && LIVE.includes(o.status)) kind = "today";
    else if (
      date < day &&
      o.status === "confirmed" &&
      o.handover === "collection"
    )
      kind = "not-collected";
    if (!kind) continue;
    rows.push({ ...base(o, kind, a, day), booked: o.confirmedAt.getTime() });
  }

  const ids = rows.map((r) => r.orderId);
  const lines = ids.length
    ? await db
        .select({ orderId: orderLines.orderId, name: orderLines.name })
        .from(orderLines)
        .where(inArray(orderLines.orderId, ids))
        .orderBy(orderLines.orderId, orderLines.position)
    : [];
  const waiting = ids.length
    ? await db
        .select({ orderId: orderChanges.orderId })
        .from(orderChanges)
        .where(
          and(
            inArray(orderChanges.orderId, ids),
            eq(orderChanges.status, "pending"),
          ),
        )
    : [];
  for (const r of rows) {
    r.cakes = lines.filter((l) => l.orderId === r.orderId).map((l) => l.name);
    if (waiting.some((w) => w.orderId === r.orderId))
      r.flags.push("change-waiting");
    const o = candidates.find((c) => c.id === r.orderId)!;
    r.stillToPayPence = await stillToPay(db, o);
  }

  // “Not collected yet” at the top; the rest by start time; collections without a time last, in booking order.
  const flagged = rows.filter((r) => r.kind === "not-collected");
  const rest = rows
    .filter((r) => r.kind !== "not-collected")
    .sort((a, b) => {
      const x = startMinutes(a) ?? Infinity;
      const y = startMinutes(b) ?? Infinity;
      return x === y ? a.booked - b.booked : x - y;
    });
  return [...flagged.sort((a, b) => a.booked - b.booked), ...rest].map((r) => {
    const row: TodayRow & { booked?: number } = { ...r };
    delete row.booked;
    return row as TodayRow;
  });
}

function base(
  o: Order,
  kind: TodayRow["kind"],
  a: typeof deliveryAttempts.$inferSelect | undefined,
  day: CalendarDate,
): TodayRow {
  const collect =
    kind === "collect" || (kind === "not-collected" && a?.choice === "collect");
  const flags: TodayFlag[] = [];
  if (o.checkDay && String(o.date) >= day) flags.push("check-day");
  if (kind === "no-choice") flags.push("no-choice");
  if (kind === "not-collected") flags.push("not-collected");
  const attemptToday = a ? String(a.day) === day : String(o.date) === day;
  return {
    orderId: o.id,
    number: o.number,
    name: o.customerName,
    phone: o.phone,
    phoneE164: o.phoneE164,
    handover: collect
      ? "collection"
      : o.handover === "delivery"
        ? "delivery"
        : "collection",
    window:
      kind === "redelivery"
        ? (a?.deliveryWindow ?? o.deliveryWindow)
        : o.deliveryWindow,
    collectionTime: o.collectionTime,
    cakes: [],
    address: o.address,
    town: o.town,
    allergyNote: o.allergyNote,
    status: o.status,
    handedOverAt: o.handedOverAt,
    kind,
    flags,
    stillToPayPence: 0,
    canNobodyIn:
      o.handover === "delivery" &&
      !collect &&
      o.status === "confirmed" &&
      (kind === "today" || kind === "redelivery") &&
      attemptToday &&
      (a?.outcome ?? "none") === "none",
  };
}

/** The desktop tiles (§13) and the subtitle numbers of a day. */
export async function todayNumbers(
  db: Db,
  day: CalendarDate,
  rows: TodayRow[],
) {
  const monday = weekStart(day);
  const sunday = addDays(monday, 6);
  const cakesOn = async (from: CalendarDate, to: CalendarDate) => {
    const [r] = await db
      .select({ n: count() })
      .from(orderLines)
      .innerJoin(orders, eq(orders.id, orderLines.orderId))
      .where(
        and(
          gte(orders.date, from),
          lte(orders.date, to),
          inArray(orders.status, LIVE),
        ),
      );
    return r?.n ?? 0;
  };
  const redeliveryCakes = rows
    .filter((r) => r.kind === "redelivery")
    .reduce((n, r) => n + r.cakes.length, 0);
  const [{ n: newEnquiries }] = await db
    .select({ n: count() })
    .from(enquiries)
    .where(eq(enquiries.status, "new"));
  const going = rows.filter(
    (r) => r.kind !== "not-collected" && r.kind !== "no-choice",
  );
  return {
    outToday: (await cakesOn(day, day)) + redeliveryCakes,
    thisWeek: await cakesOn(monday, sunday),
    newEnquiries,
    takenThisWeek: await moneyTaken(db, monday, addDays(sunday, 1)),
    stillToPay: await stillToPayAll(db),
    subtitle: {
      out: going.length,
      collections: going.filter((r) => r.handover === "collection").length,
      payments: going.filter((r) => r.stillToPayPence > 0).length,
    },
  };
}

/** The next day with handovers, for the empty state: “Next: {Saturday 19 September} · {2} cakes.” */
export async function nextHandoverDay(db: Db, day: CalendarDate) {
  const [next] = await db
    .select({ date: orders.date })
    .from(orders)
    .where(and(gte(orders.date, addDays(day, 1)), inArray(orders.status, LIVE)))
    .orderBy(orders.date)
    .limit(1);
  if (!next) return null;
  const date = String(next.date);
  const [{ n }] = await db
    .select({ n: count() })
    .from(orderLines)
    .innerJoin(orders, eq(orders.id, orderLines.orderId))
    .where(and(eq(orders.date, date), inArray(orders.status, LIVE)));
  return { date, cakes: n };
}
