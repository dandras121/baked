// Complaints (§7.5): every one its own BBL-YYYY-C-NNNN (§10.7), one per form key; matched to an order when its number
// and the e-mail agree; Linda's “Complaint” alert (Reply-To the customer, §8.3) and e-mail 17 to the customer
// (Decided D18). A filled honeypot is kept as possible spam (30 days, §10.10) with no e-mail at all.
import { and, eq, sql } from "drizzle-orm";
import { tidyOrderNumber, type Complaint } from "@/lib/complaint";
import {
  londonDate,
  londonOffsetMinutes,
  type CalendarDate,
} from "@/lib/london-time";
import type { connect } from "./client";
import { nextReference } from "./enquiry-repo";
import { queueMail } from "./mail-repo";
import { complaints, orders } from "./schema";
import { readSettings } from "./settings-repo";
import { attachPictures } from "./upload-repo";

type Db = ReturnType<typeof connect>["db"];

/** London wall-clock hours and minutes of an instant (for “Sent Thursday 19 November, 3:42pm”). */
function londonClock(at: Date) {
  const minutes =
    (at.getUTCHours() * 60 + at.getUTCMinutes() + londonOffsetMinutes(at)) %
    (24 * 60);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

export async function saveComplaint(
  db: Db,
  input: {
    complaint: Complaint;
    formKey: string;
    spam: boolean;
    pictures?: string[];
  },
  now = new Date(),
): Promise<{ reference: string; matchedOrder: string | null }> {
  const [same] = await db
    .select({ reference: complaints.reference, orderId: complaints.orderId })
    .from(complaints)
    .where(eq(complaints.formKey, input.formKey));
  const c = input.complaint;
  const email = c.email.trim();
  const typed = tidyOrderNumber(c.orderNumber);
  const [order] = typed
    ? await db
        .select({ id: orders.id, number: orders.number })
        .from(orders)
        .where(
          and(
            eq(orders.number, typed),
            sql`lower(${orders.email}) = lower(${email})`,
          ),
        )
    : [];
  if (same)
    return { reference: same.reference, matchedOrder: order?.number ?? null };

  const today: CalendarDate = londonDate(now);
  const reference = await db.transaction(async (tx) => {
    const ref = await nextReference(tx, "C", Number(today.slice(0, 4)));
    const [row] = await tx
      .insert(complaints)
      .values({
        reference: ref,
        formKey: input.formKey,
        status: input.spam ? "spam" : "new",
        orderNumber: typed || null,
        orderId: order?.id ?? null,
        name: c.name.trim().replace(/\s+/g, " "),
        email,
        body: c.body.trim(),
        wanted: c.wanted || null,
        createdAt: now,
      })
      .returning({ id: complaints.id });
    await attachPictures(
      tx,
      input.pictures ?? [],
      input.formKey,
      { complaintId: row.id },
      now,
    );
    return ref;
  });

  if (!input.spam) {
    const settings = await readSettings(db);
    await queueMail(
      db,
      {
        key: `alert:complaint:${reference}`,
        template: "alert",
        data: {
          kind: "complaint",
          view: {
            reference,
            name: c.name.trim(),
            orderNumber: typed || null,
          },
        },
        to: settings.email,
        replyTo: email,
      },
      now,
    );
    await queueMail(
      db,
      {
        key: `complaint:${reference}:17`,
        template: "complaint-received",
        data: {
          view: {
            reference,
            orderNumber: order?.number ?? null,
            sentOn: today,
            sentAt: londonClock(now),
            phone: settings.phone,
          },
        },
        to: email,
      },
      now,
    );
  }
  return { reference, matchedOrder: order?.number ?? null };
}

/** The sent page's line: the complaint by its reference (only straight after a send; the link is signed). */
export async function complaintByReference(db: Db, reference: string) {
  const [row] = await db
    .select({
      reference: complaints.reference,
      body: complaints.body,
      matchedOrder: orders.number,
    })
    .from(complaints)
    .leftJoin(orders, eq(orders.id, complaints.orderId))
    .where(eq(complaints.reference, reference));
  return row ?? null;
}
