// Saving cakes (§9.13): the cake, its sizes, options and choices in one transaction, after the rules of
// src/lib/cakes.ts. The admin editor (9.1) uses the same path.
import { and, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { cakeProblems, sortSizes, type CakeInput } from "@/lib/cakes";
import { SAMPLE_CATALOGUE } from "@/lib/sample-catalogue";
import { slugify } from "@/lib/slug";
import type { connect } from "./client";
import {
  cakeCardVideos,
  cakeMedia,
  cakeOptionChoices,
  cakeOptions,
  cakeSizes,
  cakes,
} from "./schema";

type Db = ReturnType<typeof connect>["db"];

export class CakeRejected extends Error {
  constructor(public problems: string[]) {
    super(`cake not saved: ${problems.join("; ")}`);
  }
}

/** Adds a cake at the end of the catalogue order; returns its id. */
export async function insertCake(db: Db, input: CakeInput): Promise<number> {
  const problems = cakeProblems(input);
  if (problems.length) throw new CakeRejected(problems);
  return db.transaction(async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${cakes.position}), 0) + 1` })
      .from(cakes);
    const [cake] = await tx
      .insert(cakes)
      .values({
        slug: await freeSlug(tx as unknown as Db, input.name),
        name: input.name.trim(),
        whatItIs: input.whatItIs,
        flavour: input.flavour,
        allergens: input.allergens,
        glutenKinds: input.glutenKinds ?? "",
        nutKinds: input.nutKinds ?? "",
        alsoContains: input.alsoContains ?? "",
        categories: input.categories,
        offerInscription: input.offerInscription ?? true,
        visible: input.visible,
        position: Number(next),
      })
      .returning({ id: cakes.id });
    await tx
      .insert(cakeSizes)
      .values(sortSizes(input.sizes).map((s) => ({ ...s, cakeId: cake.id })));
    for (const [i, o] of (input.options ?? []).entries()) {
      const [option] = await tx
        .insert(cakeOptions)
        .values({
          cakeId: cake.id,
          position: i + 1,
          type: o.type,
          label: o.label,
          help: o.help ?? "",
          required: o.required ?? false,
          minPicks: o.minPicks ?? 0,
          maxPicks: o.maxPicks ?? 10,
          maxLength: o.maxLength ?? 40,
        })
        .returning({ id: cakeOptions.id });
      if (o.choices.length)
        await tx.insert(cakeOptionChoices).values(
          o.choices.map((c, j) => ({
            optionId: option.id,
            position: j + 1,
            label: c.label,
            pricePence: c.pricePence,
            allergens: c.allergens,
            glutenKinds: c.glutenKinds ?? "",
            nutKinds: c.nutKinds ?? "",
            alsoContains: c.alsoContains ?? "",
          })),
        );
    }
    return cake.id;
  });
}

/**
 * A slug no cake has had: a deleted cake's slug is never given again (§9.13), so “-2”, “-3” … follow.
 */
async function freeSlug(db: Db, name: string): Promise<string> {
  const base = slugify(name);
  const taken = new Set(
    (await db.select({ slug: cakes.slug }).from(cakes)).map((r) => r.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** The sample catalogue (development and previews): adds the cakes whose names are not there yet. */
export async function ensureSampleCatalogue(db: Db): Promise<number> {
  const live = new Set(
    (
      await db
        .select({ name: cakes.name })
        .from(cakes)
        .where(isNull(cakes.deletedAt))
    ).map((r) => r.name.toLowerCase()),
  );
  let added = 0;
  for (const cake of SAMPLE_CATALOGUE)
    if (!live.has(cake.name.toLowerCase())) {
      await insertCake(db, cake);
      added++;
    }
  return added;
}

/** Soft delete (§9.13): out of sight, the slug kept for good. */
export async function deleteCake(db: Db, id: number, at = new Date()) {
  await db
    .update(cakes)
    .set({ deletedAt: at, visible: false })
    .where(eq(cakes.id, id));
}

/**
 * Previews only: the Home samples of 2.3 (one size, no allergens, “Sample cake 6–10”) give way to the sample
 * catalogue. Only sample names are touched, and only in their old shape.
 */
export async function replaceOldSamples(db: Db): Promise<number> {
  const names = SAMPLE_CATALOGUE.map((c) => c.name);
  const old = await db
    .delete(cakes)
    .where(
      and(
        sql`cardinality(${cakes.allergens}) = 0`,
        or(inArray(cakes.name, names), like(cakes.name, "Sample cake %")),
      ),
    )
    .returning({ id: cakes.id });
  return old.length;
}

/** The synthetic test clip (scripts/card-test-clip.geq) as the card video of five sample cakes (dev and previews). */
export const SAMPLE_CARD_VIDEO = {
  path1080: "/samples/card-video/card-1080.mp4",
  path1440: "/samples/card-video/card-1440.mp4",
  stillPath: "/samples/card-video/card-still.webp",
};
const WITH_CARD_VIDEO = [
  "The Lothian",
  "Bramble & Cream",
  "Sugar Peony",
  "Almond & Rose",
  "Midnight Berry",
];

export async function ensureSampleCardVideos(db: Db): Promise<number> {
  const rows = await db
    .select({ id: cakes.id })
    .from(cakes)
    .where(and(inArray(cakes.name, WITH_CARD_VIDEO), isNull(cakes.deletedAt)));
  if (!rows.length) return 0;
  const added = await db
    .insert(cakeCardVideos)
    .values(rows.map((r) => ({ cakeId: r.id, ...SAMPLE_CARD_VIDEO })))
    .onConflictDoNothing()
    .returning({ id: cakeCardVideos.cakeId });
  return added.length;
}

/** Sample cake-page media (dev and previews): three photos and a video on The Lothian, one photo on Bramble & Cream. */
export async function ensureSampleMedia(db: Db): Promise<number> {
  const plan: Record<
    string,
    { kind: "photo" | "video"; path: string; poster?: string; alt: string }[]
  > = {
    "The Lothian": [
      {
        kind: "photo",
        path: "/samples/cake-photos/sample-1.webp",
        alt: "Sample photo 1 of The Lothian",
      },
      {
        kind: "photo",
        path: "/samples/cake-photos/sample-2.webp",
        alt: "Sample photo 2 of The Lothian",
      },
      {
        kind: "video",
        path: SAMPLE_CARD_VIDEO.path1080,
        poster: SAMPLE_CARD_VIDEO.stillPath,
        alt: "",
      },
      {
        kind: "photo",
        path: "/samples/cake-photos/sample-3.webp",
        alt: "Sample photo 3 of The Lothian",
      },
    ],
    "Bramble & Cream": [
      {
        kind: "photo",
        path: "/samples/cake-photos/sample-2.webp",
        alt: "Sample photo of Bramble & Cream",
      },
    ],
  };
  let added = 0;
  for (const [name, items] of Object.entries(plan)) {
    const [cake] = await db
      .select({ id: cakes.id })
      .from(cakes)
      .where(and(eq(cakes.name, name), isNull(cakes.deletedAt)));
    if (!cake) continue;
    const [any] = await db
      .select({ id: cakeMedia.id })
      .from(cakeMedia)
      .where(eq(cakeMedia.cakeId, cake.id))
      .limit(1);
    if (any) continue;
    await db.insert(cakeMedia).values(
      items.map((m, i) => ({
        cakeId: cake.id,
        kind: m.kind,
        position: i + 1,
        path: m.path,
        posterPath: m.poster ?? null,
        altText: m.alt,
      })),
    );
    added += items.length;
  }
  return added;
}
