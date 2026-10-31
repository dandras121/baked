// The checkout draft (SITE-FLOWS §10.2): find it from the cookie, add a cake, list its lines.
import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import type { Answers } from "@/lib/cake-config";
import { linePricePence } from "@/lib/cake-config";
import { MAX_CAKES, lineTitle, optionsLine } from "@/lib/order-line";
import { readCakePage } from "./cake-page-repo";
import type { connect } from "./client";
import { cakes, draftLines, drafts } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export const DRAFT_COOKIE = "bbl_session";
/** The cookie lasts 7 days, renewed on each visit (§10.2). */
export const DRAFT_COOKIE_DAYS = 7;
/** A draft is deleted after 24 hours without activity (§10.2). */
export const DRAFT_IDLE_MS = 24 * 60 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LineView = {
  id: number;
  title: string;
  options: string;
  pricePence: number;
};

/** The live draft for this cookie value, or null (none, unknown, not a draft any more, or 24 hours idle). */
export async function liveDraft(
  db: Db,
  id: string | undefined,
  now = new Date(),
) {
  if (!id || !UUID.test(id)) return null;
  const [d] = await db
    .select()
    .from(drafts)
    .where(
      and(
        eq(drafts.id, id),
        eq(drafts.status, "draft"),
        gt(drafts.lastActivityAt, new Date(now.getTime() - DRAFT_IDLE_MS)),
      ),
    );
  return d ?? null;
}

/** True when the live draft already holds five cakes (§5.1: checked before anything else is asked). */
export async function draftIsFull(
  db: Db,
  id: string | undefined,
  now = new Date(),
) {
  const d = await liveDraft(db, id, now);
  if (!d) return false;
  const [{ n }] = await db
    .select({ n: count() })
    .from(draftLines)
    .where(eq(draftLines.draftId, d.id));
  return n >= MAX_CAKES;
}

export type AddResult =
  | { kind: "added"; draftId: string; lineId: number }
  | { kind: "cap"; draftId: string };

/**
 * Adds one cake to the draft (a new draft when there is none). The 5-cake cap is checked first, inside the same
 * transaction with the draft row locked, so two tabs can never make it six.
 */
export async function addLine(
  db: Db,
  draftId: string | undefined,
  line: {
    cakeId: number;
    sizeId: number;
    answers: Answers;
    inscription: string;
  },
  now = new Date(),
): Promise<AddResult> {
  const live = await liveDraft(db, draftId, now);
  return db.transaction(async (tx) => {
    let id = live?.id;
    if (id)
      await tx.execute(
        sql`select 1 from ${drafts} where ${drafts.id} = ${id} for update`,
      );
    else {
      const [d] = await tx
        .insert(drafts)
        .values({ createdAt: now, lastActivityAt: now })
        .returning();
      id = d.id;
    }
    const [{ n }] = await tx
      .select({ n: count() })
      .from(draftLines)
      .where(eq(draftLines.draftId, id));
    if (n >= MAX_CAKES) return { kind: "cap", draftId: id } as const;
    const [last] = await tx
      .select({ p: sql<number>`coalesce(max(${draftLines.position}), 0)` })
      .from(draftLines)
      .where(eq(draftLines.draftId, id));
    const [row] = await tx
      .insert(draftLines)
      .values({
        draftId: id,
        position: Number(last.p) + 1,
        ...line,
        createdAt: now,
      })
      .returning({ id: draftLines.id });
    await tx
      .update(drafts)
      .set({ lastActivityAt: now })
      .where(eq(drafts.id, id));
    return { kind: "added", draftId: id, lineId: row.id } as const;
  });
}

/** The draft's cakes as the customer sees them, in order (1096:9111). */
export async function draftLineViews(
  db: Db,
  draftId: string,
): Promise<LineView[]> {
  const rows = await db
    .select({ line: draftLines, slug: cakes.slug })
    .from(draftLines)
    .innerJoin(cakes, eq(cakes.id, draftLines.cakeId))
    .where(eq(draftLines.draftId, draftId))
    .orderBy(asc(draftLines.position));
  const views: LineView[] = [];
  for (const { line, slug } of rows) {
    const cake = await readCakePage(db, slug);
    const size = cake?.sizes.find((s) => s.id === line.sizeId);
    if (!cake || !size) continue;
    const answers = line.answers as Answers;
    views.push({
      id: line.id,
      title: lineTitle(cake.name, size.serves, {
        offered: cake.offerInscription,
        text: line.inscription,
      }),
      options: optionsLine(cake.options, answers),
      pricePence: linePricePence(size, cake.options, answers),
    });
  }
  return views;
}
