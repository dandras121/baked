// Bespoke enquiries (§7.1): kept with a BBL-YYYY-E-NNNN reference (§10.7) and a token for the read-only page (§7.2).
// One per form key, so a repeated press or a retry returns the same reference. Linda gets “New enquiry” (§8.3);
// a filled honeypot is kept as possible spam, with no e-mail at all.
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { dateAnswer, missing, type Enquiry } from "@/lib/bespoke";
import type { CalendarDate } from "@/lib/london-time";
import { toE164 } from "@/lib/phone";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { enquiries, galleryPhotos, referenceCounters } from "./schema";
import { attachPictures } from "./upload-repo";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The next BBL-YYYY-{kind}-NNNN of the year (§10.7). */
export async function nextReference(
  tx: Db | Tx,
  kind: "E" | "C",
  year: number,
) {
  const [row] = await tx
    .insert(referenceCounters)
    .values({ kind, year, last: 1 })
    .onConflictDoUpdate({
      target: [referenceCounters.kind, referenceCounters.year],
      set: { last: sql`${referenceCounters.last} + 1` },
    })
    .returning({ last: referenceCounters.last });
  return `BBL-${year}-${kind}-${String(row.last).padStart(4, "0")}`;
}

/** A showing gallery photo for the “Inspired by” card (§7.1); an unknown or hidden id is ignored. */
export async function inspiredPhoto(db: Db, id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [p] = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, id));
  return p && p.showing ? p : null;
}

/** Linda's alert line: servings, budget, a call, or how to reach them without an e-mail. */
function alertDetail(e: Enquiry, phone: string | null, pictures: number) {
  return [
    e.servings && `Serves ${e.servings.toLowerCase()}`,
    e.budget && `budget ${e.budget}`,
    e.callMe && "they would like a phone call",
    pictures === 1 && "1 picture",
    pictures > 1 && `${pictures} pictures`,
    !e.email.trim() && phone && `no e-mail — ring ${phone}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .replace(/^./, (c) => c.toUpperCase())
    .concat(".");
}

export async function saveEnquiry(
  db: Db,
  input: {
    enquiry: Enquiry;
    inspiredId: number | null;
    formKey: string;
    spam: boolean;
    /** The ids of this form's uploaded pictures, in order (at most three are attached). */
    pictures?: string[];
  },
  today: CalendarDate,
  now = new Date(),
): Promise<{ reference: string; token: string; email: string | null }> {
  const [same] = await db
    .select()
    .from(enquiries)
    .where(eq(enquiries.formKey, input.formKey));
  if (same)
    return { reference: same.reference, token: same.token, email: same.email };
  const e = input.enquiry;
  const phone = e.phone.trim() ? toE164(e.phone) : null;
  const inspired = input.inspiredId
    ? await inspiredPhoto(db, input.inspiredId)
    : null;
  const saved = await db.transaction(async (tx) => {
    const reference = await nextReference(tx, "E", Number(today.slice(0, 4)));
    const token = randomBytes(24).toString("base64url");
    // The answers without the contact, which has its own columns.
    const answers: Partial<Enquiry> = { ...e };
    delete answers.name;
    delete answers.email;
    delete answers.phone;
    const [row] = await tx
      .insert(enquiries)
      .values({
        reference,
        token,
        formKey: input.formKey,
        status: input.spam ? "spam" : "new",
        answers,
        withGaps: missing(e).length > 0,
        callMe: e.callMe,
        name: e.name.trim(),
        email: e.email.trim() || null,
        phone,
        inspiredPhotoId: inspired?.id ?? null,
        createdAt: now,
      })
      .returning({ id: enquiries.id });
    const pictures = await attachPictures(
      tx,
      input.pictures ?? [],
      input.formKey,
      { enquiryId: row.id },
      now,
    );
    return { reference, token, pictures };
  });
  if (!input.spam)
    await queueMail(
      db,
      {
        key: `alert:enquiry:${saved.reference}`,
        template: "alert",
        data: {
          kind: "new-enquiry",
          view: {
            reference: saved.reference,
            occasion: e.occasion || "Occasion not answered",
            date: e.date || null,
            today,
            detail: `${alertDetail(e, phone, saved.pictures)} When: ${dateAnswer(e, today)}.`,
          },
        },
        to: (await readSettings(db)).email,
        replyTo: e.email.trim() || null,
      },
      now,
    );
  return {
    reference: saved.reference,
    token: saved.token,
    email: e.email.trim() || null,
  };
}
