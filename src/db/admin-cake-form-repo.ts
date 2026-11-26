// Add or edit a cake (§9.13, Owner): one transaction for the cake and its sizes; each size keeps its id when edited,
// so drafts and orders keep pointing at the same size. A removed size takes its draft lines with it (§5.5).
import {
  and,
  count,
  eq,
  inArray,
  isNull,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import {
  formFromCake,
  type CakeForm,
  type CakeValue,
} from "@/lib/admin/cake-form";
import type { Allergen } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import type { connect } from "./client";
import { deleteCake } from "./cake-repo";
import { cakeMedia, cakeSizes, cakes } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export async function cakeForEdit(
  db: Db,
  id: number,
): Promise<{
  id: number;
  slug: string;
  form: CakeForm;
  photos: number;
} | null> {
  const [c] = await db
    .select()
    .from(cakes)
    .where(and(eq(cakes.id, id), isNull(cakes.deletedAt)));
  if (!c) return null;
  const [sizes, [{ n }]] = await Promise.all([
    db.select().from(cakeSizes).where(eq(cakeSizes.cakeId, id)),
    db
      .select({ n: count() })
      .from(cakeMedia)
      .where(and(eq(cakeMedia.cakeId, id), eq(cakeMedia.kind, "photo"))),
  ]);
  return {
    id: c.id,
    slug: c.slug,
    form: formFromCake({ ...c, allergens: c.allergens as Allergen[] }, sizes),
    photos: Number(n),
  };
}

export type SaveCakeResult =
  | { kind: "saved"; id: number; slug: string }
  | { kind: "name-taken" }
  | { kind: "needs-photo" }
  | { kind: "gone" };

export async function saveCake(
  db: Db,
  id: number | null,
  v: CakeValue,
): Promise<SaveCakeResult> {
  return db.transaction(async (tx) => {
    // The name is unique among cakes not deleted (any case).
    const [clash] = await tx
      .select({ id: cakes.id })
      .from(cakes)
      .where(
        and(
          isNull(cakes.deletedAt),
          sql`lower(${cakes.name}) = lower(${v.name})`,
          id === null ? undefined : ne(cakes.id, id),
        ),
      );
    if (clash) return { kind: "name-taken" } as const;
    if (v.visible) {
      const [{ n }] =
        id === null
          ? [{ n: 0 }]
          : await tx
              .select({ n: count() })
              .from(cakeMedia)
              .where(
                and(eq(cakeMedia.cakeId, id), eq(cakeMedia.kind, "photo")),
              );
      if (Number(n) === 0) return { kind: "needs-photo" } as const;
    }
    const fields = {
      name: v.name,
      whatItIs: v.whatItIs,
      flavour: v.flavour,
      allergens: v.allergens,
      glutenKinds: v.glutenKinds ?? "",
      nutKinds: v.nutKinds ?? "",
      alsoContains: v.alsoContains ?? "",
      categories: v.categories,
      visible: v.visible,
    };
    let cakeId: number;
    let slug: string;
    if (id === null) {
      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${cakes.position}), 0) + 1` })
        .from(cakes);
      // A slug no cake has had: a deleted cake's slug is never given again (§9.13).
      const taken = new Set(
        (await tx.select({ slug: cakes.slug }).from(cakes)).map((r) => r.slug),
      );
      const base = slugify(v.name);
      slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      const [c] = await tx
        .insert(cakes)
        .values({ ...fields, slug, position: Number(next) })
        .returning({ id: cakes.id });
      cakeId = c.id;
    } else {
      const [c] = await tx
        .update(cakes)
        .set(fields)
        .where(and(eq(cakes.id, id), isNull(cakes.deletedAt)))
        .returning({ id: cakes.id, slug: cakes.slug });
      if (!c) return { kind: "gone" } as const;
      cakeId = c.id;
      slug = c.slug;
    }
    // Sizes: the ones kept keep their id; removed ones go (and their draft lines); new ones are added.
    const keep = v.sizes.filter((s) => s.id !== null).map((s) => s.id!);
    await tx
      .delete(cakeSizes)
      .where(
        and(
          eq(cakeSizes.cakeId, cakeId),
          keep.length ? notInArray(cakeSizes.id, keep) : undefined,
        ),
      );
    const mine = keep.length
      ? new Set(
          (
            await tx
              .select({ id: cakeSizes.id })
              .from(cakeSizes)
              .where(
                and(eq(cakeSizes.cakeId, cakeId), inArray(cakeSizes.id, keep)),
              )
          ).map((r) => r.id),
        )
      : new Set<number>();
    for (const s of v.sizes) {
      const row = {
        serves: s.serves,
        tiers: s.tiers,
        pricePence: s.pricePence,
      };
      if (s.id !== null && mine.has(s.id))
        await tx.update(cakeSizes).set(row).where(eq(cakeSizes.id, s.id));
      else await tx.insert(cakeSizes).values({ ...row, cakeId });
    }
    return { kind: "saved", id: cakeId, slug } as const;
  });
}

/** Delete this design (soft delete, §9.13) or Hide it instead. */
export async function removeCake(
  db: Db,
  id: number,
  how: "delete" | "hide",
): Promise<boolean> {
  const [c] = await db
    .select({ id: cakes.id })
    .from(cakes)
    .where(and(eq(cakes.id, id), isNull(cakes.deletedAt)));
  if (!c) return false;
  if (how === "delete") await deleteCake(db, id);
  else await db.update(cakes).set({ visible: false }).where(eq(cakes.id, id));
  return true;
}
