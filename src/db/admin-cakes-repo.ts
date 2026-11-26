// Cakes (§9.13, Owner): the list in Linda's drag order with each cake's smallest size, and the new order saved at once.
import { asc, eq, isNull } from "drizzle-orm";
import type { connect } from "./client";
import { cakeSizes, cakes } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export type AdminCake = {
  id: number;
  name: string;
  flavour: string;
  whatItIs: string;
  visible: boolean;
  categories: string[];
  /** The smallest size: “serves 24 · from £185”. */
  serves: number | null;
  fromPence: number | null;
};

export async function adminCakes(db: Db): Promise<AdminCake[]> {
  const [rows, sizes] = await Promise.all([
    db
      .select()
      .from(cakes)
      .where(isNull(cakes.deletedAt))
      .orderBy(asc(cakes.position), asc(cakes.id)),
    db.select().from(cakeSizes).orderBy(asc(cakeSizes.serves)),
  ]);
  const smallest = new Map<number, { serves: number; price: number }>();
  for (const s of sizes) {
    const cur = smallest.get(s.cakeId);
    if (
      !cur ||
      s.pricePence < cur.price ||
      (s.pricePence === cur.price && s.serves < cur.serves)
    )
      smallest.set(s.cakeId, { serves: s.serves, price: s.pricePence });
  }
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    flavour: c.flavour,
    whatItIs: c.whatItIs,
    visible: c.visible,
    categories: c.categories,
    serves: smallest.get(c.id)?.serves ?? null,
    fromPence: smallest.get(c.id)?.price ?? null,
  }));
}

/**
 * Drag ⠿ (§9.13): the whole list in its new order, saved at once. Refused unless it names every live cake once (a list
 * drawn before another change would otherwise drop or duplicate one).
 */
export async function reorderCakes(db: Db, ids: number[]): Promise<boolean> {
  const live = await db
    .select({ id: cakes.id })
    .from(cakes)
    .where(isNull(cakes.deletedAt));
  const want = new Set(live.map((c) => c.id));
  if (
    ids.length !== want.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !want.has(id))
  )
    return false;
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(cakes)
        .set({ position: i + 1 })
        .where(eq(cakes.id, id));
  });
  return true;
}
