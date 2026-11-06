// The cake page's data (§5.1), cached until a cake changes (tag “cakes”).
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { cacheTag } from "next/cache";
import type { OptionView } from "@/lib/cake-config";
import { cakePage, type CakePageData, type MediaItem } from "@/lib/cake-page";
import type { OptionType } from "@/lib/cakes";
import { connect, databaseUrl } from "./client";
import { CAKES_TAG } from "./home-repo";
import {
  cakeMedia,
  cakeOptionChoices,
  cakeOptions,
  cakeSizes,
  cakes,
} from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** A visible, not deleted cake by its address; null otherwise (the page is a 404, §4.2). */
export async function readCakePage(
  db: Db,
  slug: string,
): Promise<CakePageData | null> {
  const [cake] = await db
    .select()
    .from(cakes)
    .where(
      and(
        eq(cakes.slug, slug),
        eq(cakes.visible, true),
        isNull(cakes.deletedAt),
      ),
    );
  if (!cake) return null;
  const sizes = await db
    .select()
    .from(cakeSizes)
    .where(eq(cakeSizes.cakeId, cake.id));
  const media = await db
    .select()
    .from(cakeMedia)
    .where(eq(cakeMedia.cakeId, cake.id))
    .orderBy(asc(cakeMedia.position));
  const photos = media.filter((m) => m.kind === "photo").slice(0, 8);
  const videos = media.filter((m) => m.kind === "video").slice(0, 2);
  const kept = new Set([...photos, ...videos].map((m) => m.id));
  const items: MediaItem[] = media
    .filter((m) => kept.has(m.id))
    .map((m) =>
      m.kind === "photo"
        ? {
            kind: "photo",
            src: m.path,
            alt: m.altText || cake.name,
            focalX: m.focalX,
            focalY: m.focalY,
          }
        : {
            kind: "video",
            src: m.path,
            poster: m.posterPath,
            alt: m.altText || `${cake.name}, video`,
          },
    );
  const optionRows = await db
    .select()
    .from(cakeOptions)
    .where(eq(cakeOptions.cakeId, cake.id))
    .orderBy(asc(cakeOptions.position));
  const choiceRows = optionRows.length
    ? await db
        .select()
        .from(cakeOptionChoices)
        .where(
          inArray(
            cakeOptionChoices.optionId,
            optionRows.map((o) => o.id),
          ),
        )
        .orderBy(asc(cakeOptionChoices.position))
    : [];
  const options: OptionView[] = optionRows.map((o) => ({
    id: o.id,
    type: o.type as OptionType,
    label: o.label,
    help: o.help,
    required: o.required,
    minPicks: o.minPicks,
    maxPicks: o.maxPicks,
    maxLength: o.maxLength,
    choices: choiceRows
      .filter((c) => c.optionId === o.id)
      .map((c) => ({
        id: c.id,
        label: c.label,
        pricePence: c.pricePence,
        allergens: c.allergens as OptionView["choices"][number]["allergens"],
        glutenKinds: c.glutenKinds,
        nutKinds: c.nutKinds,
        alsoContains: c.alsoContains,
      })),
  }));
  return cakePage(
    {
      ...cake,
      allergens: cake.allergens as CakePageData["allergens"]["allergens"],
    },
    sizes.map((s) => ({
      id: s.id,
      serves: s.serves,
      tiers: s.tiers,
      pricePence: s.pricePence,
    })),
    items,
    options,
  );
}

export async function getCakePage(slug: string): Promise<CakePageData | null> {
  "use cache";
  cacheTag(CAKES_TAG);
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    return await readCakePage(db, slug);
  } finally {
    await close();
  }
}
