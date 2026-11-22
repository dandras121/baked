// Add an order (§9.6, Owner): the day's count for the form, and Save — a manual order, confirmed, with one cake that
// counts one against both caps, the paid-so-far line by hand, HISTORY, and e-mail 1 (always, Decided 2026-10-17).
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  sizeLine,
  type AddOrderValue,
  type DayInfo,
} from "@/lib/admin/add-order";
import { allergenLine } from "@/lib/cake-config";
import {
  addDays,
  londonDate,
  weekStart,
  type CalendarDate,
} from "@/lib/london-time";
import { weekCount } from "@/lib/capacity";
import { placeholderValues } from "@/lib/placeholders";
import type { connect } from "./client";
import { dayCounts } from "./hold-repo";
import { readLegalRevision } from "./legal-repo";
import { queueMail } from "./mail-repo";
import { nextNumber } from "./order-repo";
import {
  closedDays,
  handPayments,
  orderHistory,
  orderLines,
  orders,
} from "./schema";
import { readSettings } from "./settings-repo";
import { attachPictures } from "./upload-repo";

type Db = ReturnType<typeof connect>["db"];

/** The live count under the date (§9.6): cakes booked that day and that week, and whether the day is closed. */
export async function dayInfo(
  db: Db,
  date: CalendarDate,
  now = new Date(),
): Promise<DayInfo> {
  // That day's Monday–Sunday week only, however far ahead the day is.
  const monday = weekStart(date);
  const [s, counts, [closed]] = await Promise.all([
    readSettings(db),
    dayCounts(db, monday, addDays(monday, 6), now),
    db.select().from(closedDays).where(eq(closedDays.day, date)),
  ]);
  return {
    day: counts.get(date) ?? 0,
    dailyCap: s.dailyCap,
    week: weekCount(date, counts),
    weeklyCap: s.weeklyCap,
    closed: closed ? (closed.note ?? "") : null,
  };
}

export async function addOrder(
  db: Db,
  v: AddOrderValue,
  by: string,
  now = new Date(),
  /** Add a sketch or photo (§9.6): this form's own uploads, up to three. */
  pictures: { formKey: string; ids: string[] } | null = null,
) {
  const s = await readSettings(db);
  const [terms, cancellations] = await Promise.all([
    readLegalRevision(db, "terms"),
    readLegalRevision(db, "cancellations"),
  ]);
  const allergenText = allergenLine(
    { allergens: v.allergens, alsoContains: v.alsoContains || undefined },
    [],
    { picks: {}, texts: {} },
    s.kitchenHandles,
  );
  const saved = await db.transaction(async (tx) => {
    const number = await nextNumber(tx, Number(londonDate(now).slice(0, 4)));
    const [o] = await tx
      .insert(orders)
      .values({
        number,
        kind: "manual",
        token: randomBytes(24).toString("base64url"),
        date: v.date,
        earliestDate: v.date,
        handover: v.handover,
        deliveryWindow: v.window,
        address: v.address,
        town: v.town,
        postcode: v.postcode,
        customerName: v.name,
        email: v.email,
        phone: v.phone,
        phoneE164: v.phoneE164,
        allergyNote: v.allergyNote,
        // Agreed with Linda, not ticked online: the terms in force today apply (their PDFs go with e-mail 1).
        consents: {
          manual: { by, at: now.toISOString() },
          terms: {
            at: now.toISOString(),
            termsRevisionId: terms?.id ?? null,
            cancellationsRevisionId: cancellations?.id ?? null,
          },
          marketing: null,
        },
        totalPence: v.totalPence,
        amountReceivedPence: 0,
        snapshot: { takenAt: now.toISOString(), manual: true },
        facts: placeholderValues(s),
        confirmedAt: now,
        collectionTime: v.collectionTime,
        customerEmails: v.customerEmails,
        changedBy: `member:${by}`,
        changedAt: now,
      })
      .returning();
    await tx.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "bespoke",
      name: v.what,
      sizeLine: sizeLine(v.tiers, v.serves),
      message: v.inscription || null,
      pricePence: v.totalPence,
      allergenText,
      allergenKeys: v.allergens,
    });
    if (v.paidPence > 0 && v.method)
      await tx.insert(handPayments).values({
        orderId: o.id,
        method: v.method,
        amountPence: v.paidPence,
        paidOn: londonDate(now),
        byName: by,
        createdAt: now,
      });
    if (pictures?.ids.length)
      await attachPictures(
        tx,
        pictures.ids,
        pictures.formKey,
        { orderId: o.id },
        now,
      );
    await tx.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: by,
      what: "Added the order by hand",
    });
    return o;
  });
  // E-mail 1, the bespoke version — also with customer e-mails off (§8.2).
  await queueMail(
    db,
    {
      key: `order:${saved.id}:1:${saved.id}`,
      template: "order-confirmed",
      data: { orderId: saved.id },
      to: saved.email,
    },
    now,
  );
  return saved.number;
}
