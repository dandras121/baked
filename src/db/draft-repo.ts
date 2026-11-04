// The checkout draft (SITE-FLOWS §10.2): find it from the cookie, add a cake, list its lines.
import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import type { Answers } from "@/lib/cake-config";
import {
  allergenLine,
  lineAllergens,
  linePricePence,
  tierWords,
} from "@/lib/cake-config";
import type { Allergen } from "@/lib/constants";
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
  /** “The Lothian · serves 24 · “Happy 30th, Mairi”” (the cake page's Added panel). */
  title: string;
  options: string;
  pricePence: number;
  /** For the order summary (1674:11944): the cake's name and address, “Two tiers · serves 24”, the message. */
  name: string;
  slug: string;
  sizeLine: string;
  /** The inscription as it goes on the cake, “” for none; null when the cake offers none. */
  message: string | null;
  /** “The Lothian contains gluten (wheat), eggs and milk.” — the cake with its chosen options (§5.3). */
  contains: string;
  /** “Contains gluten (wheat), eggs and milk.” — the same sentence without the name (step 4, §5.4). */
  allergenText: string;
  /** The 14-allergen keys of this cake with its options (for the kitchen sentence, §5.4). */
  allergenKeys: Allergen[];
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
      name: cake.name,
      slug: cake.slug,
      sizeLine: `${tierWords(size.tiers)} · serves ${size.serves}`,
      message: cake.offerInscription ? line.inscription : null,
      contains: containsLine(
        cake.name,
        allergenLine(cake.allergens, cake.options, answers, []),
      ),
      allergenText: allergenLine(cake.allergens, cake.options, answers, []),
      allergenKeys: lineAllergens(cake.allergens, cake.options, answers)
        .allergens as Allergen[],
    });
  }
  return views;
}

/**
 * What the cookie points at: a live draft, one that was cleared after 24 hours without activity (marked
 * `abandoned` here, §10.2), or nothing.
 */
export async function draftStatus(
  db: Db,
  id: string | undefined,
  now = new Date(),
): Promise<"live" | "cleared" | "none"> {
  if (!id || !UUID.test(id)) return "none";
  const [d] = await db.select().from(drafts).where(eq(drafts.id, id));
  if (!d) return "none";
  if (d.status === "abandoned") return "cleared";
  if (d.status !== "draft") return "none";
  if (d.lastActivityAt.getTime() > now.getTime() - DRAFT_IDLE_MS) return "live";
  await db
    .update(drafts)
    .set({ status: "abandoned" })
    .where(and(eq(drafts.id, id), eq(drafts.status, "draft")));
  return "cleared";
}

export type StoredLine = {
  id: number;
  slug: string;
  sizeId: number;
  answers: Answers;
  inscription: string;
};

/** One line of the live draft (edit mode, §5.1), or null when it is not in this draft. */
export async function readLine(
  db: Db,
  draftId: string | undefined,
  lineId: number,
  now = new Date(),
): Promise<StoredLine | null> {
  const d = await liveDraft(db, draftId, now);
  if (!d || !Number.isInteger(lineId)) return null;
  const [row] = await db
    .select({ line: draftLines, slug: cakes.slug })
    .from(draftLines)
    .innerJoin(cakes, eq(cakes.id, draftLines.cakeId))
    .where(and(eq(draftLines.id, lineId), eq(draftLines.draftId, d.id)));
  if (!row) return null;
  return {
    id: row.line.id,
    slug: row.slug,
    sizeId: row.line.sizeId,
    answers: row.line.answers as Answers,
    inscription: row.line.inscription,
  };
}

/** Save this cake (edit mode): the line keeps its place in the order; false when it is not in this draft. */
export async function updateLine(
  db: Db,
  draftId: string | undefined,
  lineId: number,
  line: { sizeId: number; answers: Answers; inscription: string },
  now = new Date(),
): Promise<boolean> {
  const d = await liveDraft(db, draftId, now);
  if (!d) return false;
  const done = await db
    .update(draftLines)
    .set(line)
    .where(and(eq(draftLines.id, lineId), eq(draftLines.draftId, d.id)))
    .returning({ id: draftLines.id });
  if (!done.length) return false;
  await db
    .update(drafts)
    .set({ lastActivityAt: now })
    .where(eq(drafts.id, d.id));
  return true;
}

/** Remove a cake from the draft (§5.4 Line Remove); false when the line is not in this draft. */
export async function removeLine(
  db: Db,
  draftId: string | undefined,
  lineId: number,
  now = new Date(),
): Promise<boolean> {
  const d = await liveDraft(db, draftId, now);
  if (!d || !Number.isInteger(lineId)) return false;
  const gone = await db
    .delete(draftLines)
    .where(and(eq(draftLines.id, lineId), eq(draftLines.draftId, d.id)))
    .returning({ id: draftLines.id });
  if (!gone.length) return false;
  const [{ n }] = await db
    .select({ n: count() })
    .from(draftLines)
    .where(eq(draftLines.draftId, d.id));
  // The hold counts the draft's cakes, so it shrinks by itself; the last cake removed releases it (§10.3).
  await db
    .update(drafts)
    .set(
      n === 0
        ? {
            lastActivityAt: now,
            holdDate: null,
            holdExpiresAt: null,
            holdExtensions: 0,
            holdConnection: null,
          }
        : { lastActivityAt: now },
    )
    .where(eq(drafts.id, d.id));
  return true;
}

/** The last line added (step 2's “← Back to the cake” opens it in edit mode, §5.2). */
export function lastAdded(lines: LineView[]): LineView | null {
  return lines.reduce<LineView | null>(
    (a, l) => (!a || l.id > a.id ? l : a),
    null,
  );
}

/**
 * Saves step 2's handover (§5.2). Typed address fields stay in the draft when Collect is chosen (switching back
 * finds them again); the order made from a collection draft never takes them.
 */
export async function saveHandover(
  db: Db,
  draftId: string,
  h: {
    handover: "delivery" | "collection";
    address: string;
    town: string;
    postcode: string;
    window: string;
  },
): Promise<void> {
  const keep = (s: string) => s.trim() || null;
  await db
    .update(drafts)
    .set({
      handover: h.handover,
      address: keep(h.address),
      town: keep(h.town),
      postcode: keep(h.postcode),
      deliveryWindow: ["morning", "afternoon", "evening"].includes(h.window)
        ? h.window
        : null,
      lastActivityAt: new Date(),
    })
    .where(eq(drafts.id, draftId));
}

/** Step 3's answers as typed (§5.3 “saved on blur, so a refresh keeps them”): no checks, no consents. */
export async function saveDetailsText(
  db: Db,
  draftId: string,
  t: {
    name: string;
    email: string;
    phone: string;
    cakeFor: string;
    note: string;
  },
): Promise<void> {
  const keep = (s: string) => (s.trim() ? s.trim() : null);
  await db
    .update(drafts)
    .set({
      customerName: keep(t.name),
      email: keep(t.email),
      phone: keep(t.phone),
      cakeFor: keep(t.cakeFor),
      allergyNote: keep(t.note),
      lastActivityAt: new Date(),
    })
    .where(eq(drafts.id, draftId));
}

/**
 * Continue on step 3 with everything valid: the answers, the phone in E.164, the allergy consent with its time and
 * wording (D16; cleared with the note), the terms acceptance with the Terms and Cancellations revisions shown, the
 * yearly e-mail opt-in with its wording (§5.3, §10.10).
 */
export async function acceptDetails(
  db: Db,
  draftId: string,
  d: {
    name: string;
    email: string;
    phone: string;
    phoneE164: string;
    cakeFor: string;
    note: string;
    consentWording: string;
    termsRevisionId: number | null;
    cancellationsRevisionId: number | null;
    marketing: boolean;
    marketingWording: string;
  },
  now = new Date(),
): Promise<void> {
  const note = d.note.trim();
  await db
    .update(drafts)
    .set({
      customerName: d.name.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      phoneE164: d.phoneE164,
      cakeFor: d.cakeFor.trim() || null,
      allergyNote: note || null,
      allergyConsentAt: note ? now : null,
      allergyConsentWording: note ? d.consentWording : null,
      termsAcceptedAt: now,
      termsRevisionId: d.termsRevisionId,
      cancellationsRevisionId: d.cancellationsRevisionId,
      marketingOptIn: d.marketing,
      marketingWording: d.marketing ? d.marketingWording : null,
      furthestStep: 4,
      lastActivityAt: now,
    })
    .where(eq(drafts.id, draftId));
}

/** “Contains gluten …” → “The Lothian contains gluten …” (one line per cake on step 3, §5.3). */
export const containsLine = (name: string, line: string) =>
  `${name} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
