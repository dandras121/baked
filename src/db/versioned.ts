// Saving with a version (§9.1 Two people at once): the update happens only when the version the page was drawn from
// is still the current one; otherwise nothing changes and the caller gets the current row to show beside the kept
// inputs.
import { and, eq, sql } from "drizzle-orm";
import { conflictLine, type ChangedBy } from "@/lib/admin/versions";
import type { connect } from "./client";
import { orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Order = typeof orders.$inferSelect;

export type VersionedSave<T> =
  { ok: true; row: T } | { ok: false; current: T; line: string };

/** An admin save on an order: the given fields, a new version, who and when — or the newer order and its line. */
export async function saveOrderVersioned(
  db: Db | Tx,
  orderId: number,
  seenVersion: number,
  values: Partial<typeof orders.$inferInsert>,
  by: ChangedBy,
  now = new Date(),
): Promise<VersionedSave<Order>> {
  const [row] = await db
    .update(orders)
    .set({
      ...values,
      version: sql`${orders.version} + 1`,
      changedBy: by,
      changedAt: now,
    })
    .where(and(eq(orders.id, orderId), eq(orders.version, seenVersion)))
    .returning();
  if (row) return { ok: true, row };
  const [current] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!current) throw new Error(`order ${orderId} not found`);
  return {
    ok: false,
    current,
    line: conflictLine(current.changedBy, current.changedAt),
  };
}
