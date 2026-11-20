// The data e-mails about an order are made from (§8.1): the order, its lines, the kept facts, the accepted revisions.
import { eq, inArray } from "drizzle-orm";
import { londonDate, type CalendarDate } from "@/lib/london-time";
import { readyText } from "@/lib/admin/today";
import type { OrderMailView } from "@/lib/mail/order-confirmed";
import { placeholderValues, type Placeholder } from "@/lib/placeholders";
import type { connect } from "./client";
import { legalRevisions, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";
import { todayBoard, type TodayRow } from "./today-repo";

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

/**
 * Today's rows for e-mail 4 (§8.2 row 4): the same rows and order as admin Today at 06:00 (§9.3) — the handovers
 * (incl. redeliveries and missed deliveries collected today), then the rows to ring (“Not collected yet”, “No choice
 * yet”). Send a text carries the same ready-written text as Today.
 */
export async function todayRows(db: Db, day: CalendarDate) {
  const board = await todayBoard(db, day);
  const kitchen = (await readSettings(db)).addressLine;
  const row = (r: TodayRow) => ({
    number: r.number,
    name: r.name,
    phone: r.phone,
    phoneE164: r.phoneE164,
    handover: r.handover,
    window: r.window,
    collectionTime: r.collectionTime,
    cakes: r.cakes,
    address: [r.address, r.town].filter(Boolean).join(", ") || null,
    allergyNote: r.allergyNote,
    smsBody: readyText({ ...r, kitchen }),
  });
  const ring = (r: TodayRow) =>
    r.kind === "not-collected" || r.kind === "no-choice";
  return {
    date: day,
    handovers: board.filter((r) => !ring(r)).map(row),
    notCollected: board.filter(ring).map(row),
  };
}
