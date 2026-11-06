// Orders (SITE-FLOWS §10.6, §10.7, §1 Snapshot): made once, at confirmation, from the draft and its snapshot.
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { londonDate } from "@/lib/london-time";
import type { connect } from "./client";
import type { SnapshotLine } from "./payment-repo";
import { drafts, orderCounters, orderLines, orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Draft = typeof drafts.$inferSelect;

/** BBL-2026-0147: the year of confirmation and its sequence, zero-padded to 4 (5 digits past 9999). */
export const orderNumber = (year: number, seq: number) =>
  `BBL-${year}-${String(seq).padStart(4, "0")}`;

/** The next number of the year, without gaps: one counter row per year, raised inside the confirming transaction. */
async function nextNumber(tx: Tx, year: number): Promise<string> {
  const [row] = await tx
    .insert(orderCounters)
    .values({ year, last: 1 })
    .onConflictDoUpdate({
      target: orderCounters.year,
      set: { last: sql`${orderCounters.last} + 1` },
    })
    .returning({ last: orderCounters.last });
  return orderNumber(year, row.last);
}

/**
 * The order for a draft that Stripe has confirmed, inside the confirming transaction. `lines` and `totalPence` are
 * the snapshot's when its amount is the one received, otherwise the draft's current ones (§5.5 After an unlock).
 * Returns its number; a draft that already has an order keeps it.
 */
export async function createOrder(
  tx: Tx,
  d: Draft,
  lines: SnapshotLine[],
  totalPence: number,
  amountReceivedPence: number,
  snapshot: unknown,
  now: Date,
): Promise<string> {
  const [had] = await tx
    .select({ number: orders.number })
    .from(orders)
    .where(eq(orders.draftId, d.id));
  if (had) return had.number;
  const number = await nextNumber(tx, Number(londonDate(now).slice(0, 4)));
  const date = d.holdDate ?? londonDate(now);
  const linesTotal = lines.reduce((s, l) => s + l.pricePence, 0);
  const [o] = await tx
    .insert(orders)
    .values({
      number,
      kind: "catalogue",
      draftId: d.id,
      token: randomBytes(24).toString("base64url"),
      date,
      earliestDate: date,
      handover: d.handover ?? "collection",
      deliveryWindow: d.handover === "delivery" ? d.deliveryWindow : null,
      address: d.handover === "delivery" ? d.address : null,
      town: d.handover === "delivery" ? d.town : null,
      postcode: d.handover === "delivery" ? d.postcode : null,
      customerName: d.customerName ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
      phoneE164: d.phoneE164,
      cakeFor: d.cakeFor,
      allergyNote: d.allergyNote,
      consents: {
        allergy: d.allergyConsentAt
          ? {
              at: d.allergyConsentAt.toISOString(),
              wording: d.allergyConsentWording,
            }
          : null,
        terms: d.termsAcceptedAt
          ? {
              at: d.termsAcceptedAt.toISOString(),
              termsRevisionId: d.termsRevisionId,
              cancellationsRevisionId: d.cancellationsRevisionId,
            }
          : null,
        marketing: d.marketingOptIn ? { wording: d.marketingWording } : null,
      },
      marketingOptIn: d.marketingOptIn,
      deliveryChargePence: Math.max(0, totalPence - linesTotal),
      totalPence,
      amountReceivedPence,
      paymentIntentId: d.paymentIntentId,
      snapshot: snapshot ?? { takenAt: now.toISOString(), lines },
      confirmedAt: now,
    })
    .returning({ id: orders.id });
  if (lines.length)
    await tx.insert(orderLines).values(
      lines.map((l, i) => ({
        orderId: o.id,
        position: i + 1,
        slug: l.slug,
        name: l.name,
        sizeLine: l.sizeLine,
        options: l.options,
        message: l.message,
        pricePence: l.pricePence,
        allergenText: l.allergenText,
        allergenKeys: l.allergenKeys,
      })),
    );
  return number;
}

/** The order made from this draft (the confirmation page), with its lines; null when there is none. */
export async function orderForDraft(db: Db, draftId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.draftId, draftId));
  if (!o) return null;
  const lines = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, o.id))
    .orderBy(orderLines.position);
  return { ...o, lines };
}
