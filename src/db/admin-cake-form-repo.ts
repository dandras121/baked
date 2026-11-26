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
import { optionsFromCake } from "@/lib/admin/cake-options";
import type { Allergen } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import type { connect } from "./client";
import { deleteCake } from "./cake-repo";
import {
  cakeMedia,
  cakeOptionChoices,
  cakeOptions,
  cakeSizes,
  cakes,
} from "./schema";

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
  const [sizes, [{ n }], options] = await Promise.all([
    db.select().from(cakeSizes).where(eq(cakeSizes.cakeId, id)),
    db
      .select({ n: count() })
      .from(cakeMedia)
      .where(and(eq(cakeMedia.cakeId, id), eq(cakeMedia.kind, "photo"))),
    db.select().from(cakeOptions).where(eq(cakeOptions.cakeId, id)),
  ]);
  const choices = options.length
    ? await db
        .select()
        .from(cakeOptionChoices)
        .where(
          inArray(
            cakeOptionChoices.optionId,
            options.map((o) => o.id),
          ),
        )
    : [];
  return {
    id: c.id,
    slug: c.slug,
    form: formFromCake(
      { ...c, allergens: c.allergens as Allergen[] },
      sizes,
      optionsFromCake(
        options,
        choices.map((ch) => ({ ...ch, allergens: ch.allergens as Allergen[] })),
      ),
    ),
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
      offerInscription: v.offerInscription,
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
    await saveOptions(tx as unknown as Db, cakeId, v);
    return { kind: "saved", id: cakeId, slug } as const;
  });
}

/**
 * The Options card (§5.8): options and choices keep their ids when edited (drafts store them, §10.2); removed ones go
 * (a draft that used one is re-priced at its next step, §5.5); new ones are added; the order is Linda's.
 */
async function saveOptions(tx: Db, cakeId: number, v: CakeValue) {
  const existing = await tx
    .select({ id: cakeOptions.id })
    .from(cakeOptions)
    .where(eq(cakeOptions.cakeId, cakeId));
  const mine = new Set(existing.map((o) => o.id));
  const keep = v.options
    .filter((o) => o.id !== null && mine.has(o.id))
    .map((o) => o.id!);
  const drop = existing.map((o) => o.id).filter((id) => !keep.includes(id));
  if (drop.length)
    await tx.delete(cakeOptions).where(inArray(cakeOptions.id, drop));
  for (const [i, o] of v.options.entries()) {
    const row = {
      position: i + 1,
      type: o.type,
      label: o.label,
      help: o.help,
      required: o.required,
      minPicks: o.minPicks,
      maxPicks: o.maxPicks,
      maxLength: o.maxLength,
    };
    let optionId: number;
    if (o.id !== null && keep.includes(o.id)) {
      await tx.update(cakeOptions).set(row).where(eq(cakeOptions.id, o.id));
      optionId = o.id;
    } else {
      const [n] = await tx
        .insert(cakeOptions)
        .values({ ...row, cakeId })
        .returning({ id: cakeOptions.id });
      optionId = n.id;
    }
    const had = new Set(
      (
        await tx
          .select({ id: cakeOptionChoices.id })
          .from(cakeOptionChoices)
          .where(eq(cakeOptionChoices.optionId, optionId))
      ).map((c) => c.id),
    );
    const keepChoices = o.choices
      .filter((c) => c.id !== null && had.has(c.id))
      .map((c) => c.id!);
    const dropChoices = [...had].filter((id) => !keepChoices.includes(id));
    if (dropChoices.length)
      await tx
        .delete(cakeOptionChoices)
        .where(inArray(cakeOptionChoices.id, dropChoices));
    for (const [j, c] of o.choices.entries()) {
      const crow = {
        position: j + 1,
        label: c.label,
        pricePence: c.pricePence,
        allergens: c.allergens,
        glutenKinds: c.glutenKinds ?? "",
        nutKinds: c.nutKinds ?? "",
        alsoContains: c.alsoContains ?? "",
      };
      if (c.id !== null && keepChoices.includes(c.id))
        await tx
          .update(cakeOptionChoices)
          .set(crow)
          .where(eq(cakeOptionChoices.id, c.id));
      else await tx.insert(cakeOptionChoices).values({ ...crow, optionId });
    }
  }
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
