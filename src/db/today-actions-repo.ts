// Today's actions (§9.3): Mark handed over and its Undo, Checked, and Nobody was in (through §6.8's recordNobodyIn).
// Each is recorded in the order's HISTORY with the person's name (§9.1).
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { memberChange } from "@/lib/admin/versions";
import { londonDate } from "@/lib/london-time";
import type { connect } from "./client";
import { recordNobodyIn } from "./delivery-repo";
import { orderHistory, orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];

async function note(
  db: Db,
  orderId: number,
  by: string,
  what: string,
  at: Date,
) {
  await db.insert(orderHistory).values({ orderId, at, byName: by, what });
}

/** Mark handed over: on or after the order's date while confirmed → completed (the only way to complete an order). */
export async function markHandedOver(
  db: Db,
  orderId: number,
  by: string,
  now = new Date(),
) {
  const [o] = await db
    .update(orders)
    .set({
      status: "completed",
      handedOverAt: now,
      version: sql`${orders.version} + 1`,
      changedBy: memberChange(by),
      changedAt: now,
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, "confirmed"),
        lte(orders.date, londonDate(now)),
      ),
    )
    .returning({ id: orders.id });
  if (!o) return false;
  await note(db, orderId, by, "Marked handed over", now);
  return true;
}

/** Undo: back to confirmed, until 23:59 of the day it was handed over (§9.3). */
export async function undoHandedOver(
  db: Db,
  orderId: number,
  by: string,
  now = new Date(),
) {
  const [o] = await db
    .select({ at: orders.handedOverAt, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (
    !o?.at ||
    o.status !== "completed" ||
    londonDate(o.at) !== londonDate(now)
  )
    return false;
  await db
    .update(orders)
    .set({
      status: "confirmed",
      handedOverAt: null,
      version: sql`${orders.version} + 1`,
      changedBy: memberChange(by),
      changedAt: now,
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["completed"])));
  await note(db, orderId, by, "Undid handed over", now);
  return true;
}

/** Checked: clears “Booked after its hold ran out — check the day” (both roles). */
export async function checkedDay(
  db: Db,
  orderId: number,
  by: string,
  now = new Date(),
) {
  const [o] = await db
    .update(orders)
    .set({ checkDay: false, changedBy: memberChange(by), changedAt: now })
    .where(and(eq(orders.id, orderId), eq(orders.checkDay, true)))
    .returning({ id: orders.id });
  if (o) await note(db, orderId, by, "Checked the day", now);
  return !!o;
}

/** Nobody was in: the outcome on the current attempt and e-mail 13 (§6.8). */
export async function nobodyWasIn(
  db: Db,
  orderId: number,
  by: string,
  now = new Date(),
) {
  const r = await recordNobodyIn(db, orderId, now);
  if (r.kind !== "recorded") return false;
  await note(
    db,
    orderId,
    by,
    "Nobody was in — the “I missed you” e-mail sent",
    now,
  );
  return true;
}
