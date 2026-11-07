// The data e-mails about an order are made from (§8.1): the order, its lines, the kept facts, the accepted revisions.
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { addDays, londonDate, type CalendarDate } from "@/lib/london-time";
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
    allergyNote: o.allergyNote,
    phone: o.phone,
    phoneE164: o.phoneE164,
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

/** Today's rows for e-mail 4: the handovers of the day and yesterday's collections not marked (§9.3). */
export async function todayRows(db: Db, day: CalendarDate) {
  const list = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.date, addDays(day, -1)),
        lt(orders.date, addDays(day, 1)),
        inArray(orders.status, ["confirmed"]),
      ),
    );
  const lines = list.length
    ? await db
        .select({ orderId: orderLines.orderId, name: orderLines.name })
        .from(orderLines)
        .where(
          inArray(
            orderLines.orderId,
            list.map((o) => o.id),
          ),
        )
    : [];
  const row = (o: (typeof list)[number]) => ({
    number: o.number,
    name: o.customerName,
    phone: o.phone,
    phoneE164: o.phoneE164,
    handover: (o.handover === "delivery" ? "delivery" : "collection") as
      "delivery" | "collection",
    window: o.deliveryWindow,
    cakes: lines.filter((l) => l.orderId === o.id).map((l) => l.name),
    address: [o.address, o.town].filter(Boolean).join(", ") || null,
    allergyNote: o.allergyNote,
  });
  const order = (w: string | null) =>
    ["morning", "afternoon", "evening"].indexOf(w ?? "") + 1 || 9;
  return {
    date: day,
    handovers: list
      .filter((o) => String(o.date) === day)
      .sort((a, b) => order(a.deliveryWindow) - order(b.deliveryWindow))
      .map(row),
    notCollected: list
      .filter(
        (o) =>
          String(o.date) === addDays(day, -1) && o.handover === "collection",
      )
      .map(row),
  };
}
