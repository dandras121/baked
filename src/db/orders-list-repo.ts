// Orders (§9.4): one page of the list for a filter and a search, with its total; the subtitle numbers (§13).
import {
  and,
  count,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { paidCell, searchWords, type OrderFilter } from "@/lib/admin/orders";
import {
  addDays,
  londonInstant,
  weekStart,
  type CalendarDate,
} from "@/lib/london-time";
import type { connect } from "./client";
import { moneyByOrder, moneyTaken, stillToPayAll } from "./money-repo";
import { orderLines, orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export type OrderListRow = {
  number: string;
  date: string;
  name: string;
  cake: string;
  where: string;
  paid: string;
  owes: boolean;
  status: string;
};

export async function listOrders(
  db: Db,
  o: {
    filter: OrderFilter;
    q?: string;
    shown: number;
    today: CalendarDate;
  },
) {
  const conds: SQL[] = [];
  const monday = weekStart(o.today);
  if (o.filter === "week")
    conds.push(gte(orders.date, monday), lte(orders.date, addDays(monday, 6)));
  if (o.filter === "upcoming")
    conds.push(
      gte(orders.date, o.today),
      inArray(orders.status, ["confirmed", "completed"]),
    );
  if (o.filter === "completed") conds.push(eq(orders.status, "completed"));
  if (o.filter === "cancelled")
    conds.push(inArray(orders.status, ["cancelled", "refunded"]));
  if (o.filter === "topay") {
    const owing = [...(await moneyByOrder(db))]
      .filter(([, m]) => m.stillToPayPence > 0)
      .map(([id]) => id);
    conds.push(inArray(orders.id, [...owing, -1]));
  }
  const w = searchWords(o.q);
  if (w) {
    const like = `%${w.text}%`;
    const any: (SQL | undefined)[] = [
      ilike(orders.customerName, like),
      ilike(orders.town, like),
      ilike(orders.email, like),
      ilike(orders.number, `%${w.number}%`),
      sql`replace(upper(coalesce(${orders.postcode}, '')), ' ', '') like ${`%${w.postcode}%`}`,
    ];
    if (w.digits)
      any.push(
        sql`regexp_replace(${orders.phone}, '\\D', '', 'g') like ${`%${w.digits}%`}`,
        sql`coalesce(${orders.phoneE164}, '') like ${`%${w.international ?? w.digits}%`}`,
      );
    conds.push(or(...any)!);
  }
  const where = conds.length ? and(...conds) : undefined;
  // The total and the page at once; upcoming by date ascending, then the past by date descending (§9.4).
  const [[{ total }], page] = await Promise.all([
    db.select({ total: count() }).from(orders).where(where),
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(
        sql`case when ${orders.date} >= ${o.today} then ${orders.date} end asc nulls last`,
        sql`${orders.date} desc`,
        sql`${orders.id} desc`,
      )
      .limit(o.shown),
  ]);
  const ids = page.map((p) => p.id);
  const [lines, money] = await Promise.all([
    ids.length
      ? db
          .select({ orderId: orderLines.orderId, name: orderLines.name })
          .from(orderLines)
          .where(inArray(orderLines.orderId, ids))
          .orderBy(orderLines.orderId, orderLines.position)
      : [],
    moneyByOrder(db, ids),
  ]);
  // An order removed between the two reads (e.g. Delete this customer at the same moment) is left out, not a crash.
  const rows: OrderListRow[] = page.flatMap((p) => {
    const cakes = lines.filter((l) => l.orderId === p.id);
    const m = money.get(p.id);
    if (!m) return [];
    return {
      number: p.number,
      date: String(p.date),
      name: p.customerName,
      cake: cakes[0]
        ? `${cakes[0].name}${cakes.length > 1 ? ` +${cakes.length - 1}` : ""}`
        : "",
      where:
        p.handover === "collection"
          ? "Collection"
          : (p.town ?? p.postcode ?? ""),
      paid: paidCell(p.status, m),
      owes:
        (p.status === "confirmed" || p.status === "completed") &&
        m.stillToPayPence > 0,
      status: p.status,
    };
  });
  return { rows, total };
}

/** The Owner's subtitle (§13): orders confirmed this year that still stand · money taken this year · still to pay. */
export async function ordersYear(db: Db, today: CalendarDate) {
  const year = today.slice(0, 4);
  const from = `${year}-01-01`;
  const to = `${Number(year) + 1}-01-01`;
  const [[{ n }], taken, still] = await Promise.all([
    db
      .select({ n: count() })
      .from(orders)
      .where(
        and(
          gte(orders.confirmedAt, londonInstant(from, 0)),
          lt(orders.confirmedAt, londonInstant(to, 0)),
          inArray(orders.status, ["confirmed", "completed"]),
        ),
      ),
    moneyTaken(db, from, to),
    stillToPayAll(db),
  ]);
  return { count: n, taken, still };
}
