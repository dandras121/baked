// Money (§9.9, Owner): the four tiles (§13), the orders with still to pay > 0 with their latest open link, and the
// paid-in-full line. One read; the flags come with slice 8.8b.
import { eq, inArray } from "drizzle-orm";
import {
  addDays,
  londonDate,
  londonInstant,
  weekStart,
  type CalendarDate,
} from "@/lib/london-time";
import type { connect } from "./client";
import { moneyByOrder, moneyTaken } from "./money-repo";
import { orders, paymentLinks } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export type MoneyRow = {
  id: number;
  number: string;
  name: string;
  date: CalendarDate;
  totalPence: number;
  paidPence: number;
  stillToPayPence: number;
  /** The latest open link (Redelivery links are the fee's, not the cake's) and how many more are open. */
  link: { sentOn: CalendarDate; pence: number; more: number } | null;
};

export type MoneyScreen = {
  tiles: {
    stillToPay: number;
    paidThisWeek: number;
    dueWithin7: number;
    takenThisYear: number;
  };
  rows: MoneyRow[];
  paidInFull: { count: number; totalPence: number };
};

export async function moneyScreen(
  db: Db,
  now = new Date(),
): Promise<MoneyScreen> {
  const today = londonDate(now);
  const monday = weekStart(today);
  const year = today.slice(0, 4);
  const [live, money, links, paidThisWeek, takenThisYear] = await Promise.all([
    db
      .select({
        id: orders.id,
        number: orders.number,
        name: orders.customerName,
        date: orders.date,
        total: orders.totalPence,
        confirmedAt: orders.confirmedAt,
      })
      .from(orders)
      .where(inArray(orders.status, ["confirmed", "completed"])),
    moneyByOrder(db),
    db
      .select({
        orderId: paymentLinks.orderId,
        purpose: paymentLinks.purpose,
        sentOn: paymentLinks.sentOn,
        pence: paymentLinks.amountPence,
        id: paymentLinks.id,
      })
      .from(paymentLinks)
      .where(eq(paymentLinks.status, "open")),
    moneyTaken(db, monday, addDays(monday, 7)),
    moneyTaken(db, `${year}-01-01`, `${Number(year) + 1}-01-01`),
  ]);
  const open = new Map<
    number,
    { sentOn: CalendarDate; pence: number; id: number }[]
  >();
  for (const l of links)
    if (l.purpose !== "redelivery")
      open.set(l.orderId, [
        ...(open.get(l.orderId) ?? []),
        { sentOn: String(l.sentOn), pence: l.pence, id: l.id },
      ]);

  const rows: MoneyRow[] = [];
  let stillToPay = 0;
  let dueWithin7 = 0;
  const paidInFull = { count: 0, totalPence: 0 };
  const yearStart = londonInstant(`${year}-01-01`, 0);
  const yearEnd = londonInstant(`${Number(year) + 1}-01-01`, 0);
  for (const o of live) {
    const m = money.get(o.id);
    const due = m?.stillToPayPence ?? 0;
    const date = String(o.date);
    if (due > 0) {
      stillToPay += due;
      if (date >= today && date <= addDays(today, 6)) dueWithin7 += due;
      const mine = (open.get(o.id) ?? []).sort(
        (a, b) => b.sentOn.localeCompare(a.sentOn) || b.id - a.id,
      );
      rows.push({
        id: o.id,
        number: o.number,
        name: o.name,
        date,
        totalPence: o.total,
        paidPence: m?.netPaidPence ?? 0,
        stillToPayPence: due,
        link: mine[0]
          ? {
              sentOn: mine[0].sentOn,
              pence: mine[0].pence,
              more: mine.length - 1,
            }
          : null,
      });
    } else if (o.confirmedAt >= yearStart && o.confirmedAt < yearEnd) {
      paidInFull.count++;
      paidInFull.totalPence += o.total;
    }
  }
  // By date, soonest first (§9.9).
  rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number),
  );
  return {
    tiles: { stillToPay, paidThisWeek, dueWithin7, takenThisYear },
    rows,
    paidInFull,
  };
}
