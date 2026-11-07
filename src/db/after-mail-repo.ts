// What e-mails 5 and 18 are made from (§8.1): the order and its first cake, the cakes new this year, Linda's note,
// the lead times, the review link and the address's unsubscribe link.
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import type { YearLaterView, ThanksView } from "@/lib/mail/after-emails";
import { formatPrice } from "@/lib/money";
import { placeholderValues } from "@/lib/placeholders";
import type { connect } from "./client";
import { tokenFor } from "./consent-repo";
import { readMailSettings, reviewLink } from "./mail-settings-repo";
import { cakeSizes, cakes, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

async function orderWithFirstLine(db: Db, orderId: number) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return null;
  const [line] = await db
    .select({ name: orderLines.name, slug: orderLines.slug })
    .from(orderLines)
    .where(eq(orderLines.orderId, o.id))
    .orderBy(asc(orderLines.position))
    .limit(1);
  return { o, line: line ?? { name: "your cake", slug: "" } };
}

/**
 * “A few that are new this year”: up to three visible cakes created in the last 12 months, newest first, not the
 * one ordered; filled with the first visible designs (catalogue order) when fewer; none when no cake is visible.
 * Each with its smallest price. Cake photos arrive with 9.13: until then the drawn placeholder slot.
 */
export async function newThisYear(
  db: Db,
  exceptSlug: string,
  now: Date,
  origin: string,
): Promise<YearLaterView["tiles"]> {
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const visible = and(eq(cakes.visible, true), isNull(cakes.deletedAt));
  const fresh = await db
    .select({ id: cakes.id, name: cakes.name, slug: cakes.slug })
    .from(cakes)
    .where(and(visible, gte(cakes.createdAt, yearAgo)))
    .orderBy(desc(cakes.createdAt));
  const rest = await db
    .select({ id: cakes.id, name: cakes.name, slug: cakes.slug })
    .from(cakes)
    .where(visible)
    .orderBy(asc(cakes.position));
  const picked: typeof rest = [];
  for (const c of [...fresh, ...rest])
    if (
      picked.length < 3 &&
      c.slug !== exceptSlug &&
      !picked.some((p) => p.id === c.id)
    )
      picked.push(c);
  const sizes = await db.select().from(cakeSizes);
  return picked.map((c) => {
    const prices = sizes
      .filter((s) => s.cakeId === c.id)
      .map((s) => s.pricePence);
    return {
      name: c.name,
      slug: c.slug,
      from: prices.length ? `From ${formatPrice(Math.min(...prices))}` : "",
      image: `${origin}/email/placeholder-tile.png`,
    };
  });
}

export async function yearLaterView(
  db: Db,
  orderId: number,
  origin: string,
  late: boolean,
  now = new Date(),
): Promise<YearLaterView | null> {
  const found = await orderWithFirstLine(db, orderId);
  if (!found || !found.o.email) return null;
  const { o, line } = found;
  const [m, s] = await Promise.all([readMailSettings(db), readSettings(db)]);
  const facts = placeholderValues(s);
  const forWho = o.cakeFor?.trim() || null;
  return {
    cake: line.name,
    name: forWho ?? o.customerName.trim().split(/\s+/)[0] ?? "",
    forWho,
    late,
    hero: `${origin}/email/placeholder-hero.png`,
    tiles: await newThisYear(db, line.slug, now, origin),
    note: m.yearNote,
    leadTimeWords: facts.lead_time_words,
    bespokeLeadTimeWords: facts.bespoke_lead_time_words,
    reviewHref: reviewLink(m.googlePlaceId),
    unsubscribeHref: `${origin}/unsubscribe/${await tokenFor(db, o.email)}`,
  };
}

/** E-mail 18: null without a Place ID (it is then not sent, §8.1). */
export async function thanksView(
  db: Db,
  orderId: number,
  origin: string,
): Promise<ThanksView | null> {
  const found = await orderWithFirstLine(db, orderId);
  const review = reviewLink((await readMailSettings(db)).googlePlaceId);
  if (!found || !found.o.email || !review) return null;
  const { o, line } = found;
  return {
    customerName: o.customerName,
    cake: line.name,
    date: String(o.date),
    token: o.token,
    reviewHref: review,
    optOutHref: `${origin}/unsubscribe/${await tokenFor(db, o.email)}?list=thanks`,
  };
}
