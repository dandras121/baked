// The date hold and capacity counts (SITE-FLOWS §10.3, §10.4). Taking or renewing a hold re-checks the caps under
// one lock, so two buyers can never both take the last slot.
import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { canHold, nearestDates, type CapacityInput } from "@/lib/capacity";
import { holdMinutes, MAX_CONNECTION_HOLDS, MAX_EXTENSIONS } from "@/lib/hold";
import { addDays, londonDate, type CalendarDate } from "@/lib/london-time";
import type { connect } from "./client";
import { closedDays, draftLines, drafts, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The live hold of a draft, or null (expired holds are simply gone, §10.3 Ends). */
export type Hold = { date: CalendarDate; expiresAt: Date; extensions: number };

export function liveHold(
  d: {
    holdDate: string | null;
    holdExpiresAt: Date | null;
    holdExtensions: number;
  },
  now = new Date(),
): Hold | null {
  if (
    !d.holdDate ||
    !d.holdExpiresAt ||
    d.holdExpiresAt.getTime() <= now.getTime()
  )
    return null;
  return {
    date: d.holdDate,
    expiresAt: d.holdExpiresAt,
    extensions: d.holdExtensions,
  };
}

/** Cakes in other customers' live holds and confirmed orders per day (§10.4 What counts). */
async function otherHoldCounts(
  db: Db | Tx,
  from: CalendarDate,
  to: CalendarDate,
  exceptDraft: string | null,
  now: Date,
  /** Change your order (§6.4): the order's own cakes count neither against the new day nor its week. */
  exceptOrder: number | null = null,
): Promise<Map<CalendarDate, number>> {
  // Live holds, also while being paid.
  const held = await db
    .select({ day: drafts.holdDate, n: count(draftLines.id) })
    .from(drafts)
    .innerJoin(draftLines, eq(draftLines.draftId, drafts.id))
    .where(
      and(
        isNotNull(drafts.holdDate),
        inArray(drafts.status, ["draft", "pending"]),
        gt(drafts.holdExpiresAt, now),
        gte(drafts.holdDate, from),
        lte(drafts.holdDate, to),
        exceptDraft ? ne(drafts.id, exceptDraft) : undefined,
      ),
    )
    .groupBy(drafts.holdDate);
  // Orders keep their day for good (cancelled and refunded ones free it, §10.6).
  const booked = await db
    .select({ day: orders.date, n: count(orderLines.id) })
    .from(orders)
    .innerJoin(orderLines, eq(orderLines.orderId, orders.id))
    .where(
      and(
        inArray(orders.status, ["confirmed", "completed"]),
        gte(orders.date, from),
        lte(orders.date, to),
        exceptDraft
          ? or(isNull(orders.draftId), ne(orders.draftId, exceptDraft))
          : undefined,
        exceptOrder ? ne(orders.id, exceptOrder) : undefined,
      ),
    )
    .groupBy(orders.date);
  // An order's own live hold on a new day while its move is being paid (§6.4).
  const moving = await db
    .select({ day: orders.holdDate, n: count(orderLines.id) })
    .from(orders)
    .innerJoin(orderLines, eq(orderLines.orderId, orders.id))
    .where(
      and(
        isNotNull(orders.holdDate),
        gt(orders.holdExpiresAt, now),
        gte(orders.holdDate, from),
        lte(orders.holdDate, to),
        exceptOrder ? ne(orders.id, exceptOrder) : undefined,
      ),
    )
    .groupBy(orders.holdDate);
  const counts = new Map<CalendarDate, number>();
  for (const r of [...held, ...booked, ...moving])
    counts.set(r.day!, (counts.get(r.day!) ?? 0) + Number(r.n));
  return counts;
}

/** Everything the calendar needs for one draft (§5.2, §10.4). */
export async function capacityFor(
  db: Db | Tx,
  draft: {
    id: string;
    holdDate: string | null;
    holdExpiresAt: Date | null;
    holdExtensions: number;
  } | null,
  now = new Date(),
): Promise<CapacityInput> {
  const today = londonDate(now);
  // A week reaches back up to six days before the first calendar day and on past the last.
  const from = addDays(today, -7);
  const to = addDays(today, 13 * 31 + 7);
  const s = await readSettings(db as Db);
  const closed = await db
    .select({ day: closedDays.day })
    .from(closedDays)
    .where(and(gte(closedDays.day, today), lte(closedDays.day, to)));
  return {
    today,
    leadTimeDays: s.leadTimeDays,
    dailyCap: s.dailyCap,
    weeklyCap: s.weeklyCap,
    closed: new Set(closed.map((c) => c.day)),
    dayCounts: await otherHoldCounts(db, from, to, draft?.id ?? null, now),
    ownHold: draft ? (liveHold(draft, now)?.date ?? null) : null,
  };
}

/** The calendar for moving an order (§6.4): every hold and order counts except the order's own cakes. */
export async function capacityForOrder(
  db: Db | Tx,
  orderId: number,
  now = new Date(),
): Promise<CapacityInput> {
  const c = await capacityFor(db, null, now);
  const today = londonDate(now);
  return {
    ...c,
    dayCounts: await otherHoldCounts(
      db,
      addDays(today, -7),
      addDays(today, 13 * 31 + 7),
      null,
      now,
      orderId,
    ),
  };
}

export type HoldResult =
  | { kind: "held"; hold: Hold }
  | { kind: "taken"; chips: CalendarDate[] }
  | { kind: "connection" };

/**
 * Continue on step 2 (§5.2, §10.3): the same date renews the hold (an extension; with none left it is kept as it
 * is — also when the day has meanwhile become too soon or full); a different date re-checks the caps and replaces
 * the old hold in the same transaction. A new hold is refused while two other drafts from this connection hold dates.
 */
export async function takeHold(
  db: Db,
  draftId: string,
  date: CalendarDate,
  connection: string,
  now = new Date(),
): Promise<HoldResult> {
  const minutes = holdMinutes();
  return db.transaction(async (tx) => {
    // One lock for every hold: counts and the new hold are one step.
    await tx.execute(sql`select pg_advisory_xact_lock(4210)`);
    const [d] = await tx
      .select()
      .from(drafts)
      .where(eq(drafts.id, draftId))
      .for("update");
    const own = liveHold(d, now);
    const until = new Date(now.getTime() + minutes * 60_000);
    if (own && own.date === date) {
      if (own.extensions >= MAX_EXTENSIONS)
        return { kind: "held", hold: own } as const;
      const hold = { date, expiresAt: until, extensions: own.extensions + 1 };
      await tx
        .update(drafts)
        .set({
          holdExpiresAt: until,
          holdExtensions: hold.extensions,
          lastActivityAt: now,
        })
        .where(eq(drafts.id, draftId));
      return { kind: "held", hold } as const;
    }
    const cap = await capacityFor(
      tx,
      { ...d, holdDate: null, holdExpiresAt: null },
      now,
    );
    if (!canHold(date, cap))
      return { kind: "taken", chips: nearestDates(date, cap) } as const;
    if (!own) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(drafts)
        .where(
          and(
            eq(drafts.holdConnection, connection),
            gt(drafts.holdExpiresAt, now),
            eq(drafts.status, "draft"),
            ne(drafts.id, draftId),
          ),
        );
      if (n >= MAX_CONNECTION_HOLDS) return { kind: "connection" } as const;
    }
    const hold = { date, expiresAt: until, extensions: 0 };
    await tx
      .update(drafts)
      .set({
        holdDate: date,
        holdExpiresAt: until,
        holdExtensions: 0,
        holdConnection: connection,
        lastActivityAt: now,
      })
      .where(eq(drafts.id, draftId));
    return { kind: "held", hold } as const;
  });
}

/** Keep holding for 20 more minutes (§10.3): only with an extension left and while the date is still available. */
export async function extendHold(
  db: Db,
  draftId: string,
  now = new Date(),
): Promise<Hold | null> {
  const minutes = holdMinutes();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(4210)`);
    const [d] = await tx
      .select()
      .from(drafts)
      .where(eq(drafts.id, draftId))
      .for("update");
    const own = d ? liveHold(d, now) : null;
    if (!own || own.extensions >= MAX_EXTENSIONS) return null;
    const cap = await capacityFor(
      tx,
      { ...d, holdDate: null, holdExpiresAt: null },
      now,
    );
    if (!canHold(own.date, cap)) return null;
    const hold = {
      date: own.date,
      expiresAt: new Date(now.getTime() + minutes * 60_000),
      extensions: own.extensions + 1,
    };
    await tx
      .update(drafts)
      .set({
        holdExpiresAt: hold.expiresAt,
        holdExtensions: hold.extensions,
        lastActivityAt: now,
      })
      .where(eq(drafts.id, draftId));
    return hold;
  });
}

/** Release a draft's hold (the last cake removed, §10.3 Ends). Releasing twice does nothing. */
export async function releaseHold(db: Db, draftId: string): Promise<void> {
  await db
    .update(drafts)
    .set({
      holdDate: null,
      holdExpiresAt: null,
      holdExtensions: 0,
      holdConnection: null,
    })
    .where(eq(drafts.id, draftId));
}
