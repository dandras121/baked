// The data e-mails about an order are made from (§8.1): the order, its lines, the kept facts, the accepted revisions.
import { eq, inArray } from "drizzle-orm";
import { londonDate } from "@/lib/london-time";
import type { OrderMailView } from "@/lib/mail/order-confirmed";
import { placeholderValues, type Placeholder } from "@/lib/placeholders";
import type { connect } from "./client";
import { legalRevisions, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

export async function orderMailView(
  db: Db,
  orderId: number,
): Promise<OrderMailView | null> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return null;
  const lines = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, o.id))
    .orderBy(orderLines.position);
  const consents = (o.consents ?? {}) as {
    terms?: {
      termsRevisionId?: number | null;
      cancellationsRevisionId?: number | null;
    } | null;
  };
  const ids = [
    consents.terms?.termsRevisionId,
    consents.terms?.cancellationsRevisionId,
  ].filter((x): x is number => typeof x === "number");
  const revs = ids.length
    ? await db
        .select({
          id: legalRevisions.id,
          slug: legalRevisions.slug,
          updatedOn: legalRevisions.updatedOn,
        })
        .from(legalRevisions)
        .where(inArray(legalRevisions.id, ids))
    : [];
  const rev = (slug: string) => {
    const r = revs.find((x) => x.slug === slug);
    return r ? { id: r.id, updatedOn: String(r.updatedOn) } : null;
  };
  // Orders confirmed before the facts were kept (slice 4.6) fall back to today's Settings.
  const facts =
    (o.facts as Record<Placeholder, string> | null) ??
    placeholderValues(await readSettings(db));
  return {
    number: o.number,
    token: o.token,
    customerName: o.customerName,
    date: String(o.date),
    earliestDate: String(o.earliestDate),
    confirmedOn: londonDate(o.confirmedAt),
    handover: o.handover === "delivery" ? "delivery" : "collection",
    window: o.deliveryWindow,
    address: o.address,
    town: o.town,
    postcode: o.postcode,
    totalPence: o.totalPence,
    manual: o.kind === "manual",
    lines: lines.map((l) => ({
      name: l.name,
      flavour: l.flavour,
      sizeLine: l.sizeLine,
      options: l.options,
      message: l.message,
      allergenText: l.allergenText,
    })),
    facts,
    terms: rev("terms"),
    cancellations: rev("cancellations"),
  };
}
