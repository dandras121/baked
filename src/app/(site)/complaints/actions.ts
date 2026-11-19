"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { saveComplaint } from "@/db/complaint-repo";
import { connectionKey, takeFormSend } from "@/db/contact-repo";
import { processMail } from "@/db/mail-repo";
import { getSiteSettings } from "@/db/site-settings";
import {
  cleanComplaint,
  COMPLAINT_COPY,
  complaintErrors,
  type ComplaintErrors,
} from "@/lib/complaint";
import { CONTACT } from "@/lib/contact";
import { mailTransport } from "@/lib/mail/transport";
import { sentToken } from "@/lib/sent-token";

export type ComplaintState = {
  errors: ComplaintErrors;
  /** Under the button: the send limit or a failed send (§10.8, §10.9). */
  notice: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clientAddress() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Send my complaint (§7.5): the checks, the send limit, the stored complaint with its pictures, Linda's alert and
 * e-mail 17; then `/complaints/sent`. A filled honeypot looks sent and is kept as possible spam.
 */
export async function sendComplaint(
  _previous: ComplaintState,
  form: FormData,
): Promise<ComplaintState> {
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(String(form.get("complaint") ?? "{}"));
  } catch {
    // An empty complaint is checked like any other.
  }
  const complaint = cleanComplaint(raw);
  const spam = !!String(form.get(CONTACT.honeypot) ?? "").trim();
  const errors = spam ? {} : complaintErrors(complaint);
  if (Object.keys(errors).length) return { errors, notice: null };

  const given = String(form.get("formKey") ?? "");
  const formKey = UUID.test(given) ? given : crypto.randomUUID();
  let pictures: string[] = [];
  try {
    const list = JSON.parse(String(form.get("pictures") ?? "[]"));
    if (Array.isArray(list)) pictures = list.map(String).slice(0, 3);
  } catch {
    // No pictures.
  }
  const settings = await getSiteSettings();
  if (!databaseUrl() || !settings)
    return { errors: {}, notice: COMPLAINT_COPY.failed };
  const now = new Date();
  const { db, close } = connect();
  let reference = "";
  try {
    if (
      !spam &&
      !(await takeFormSend(
        db,
        "complaint",
        connectionKey(await clientAddress()),
        now,
      ))
    )
      return { errors: {}, notice: COMPLAINT_COPY.tooMany(settings.email) };
    reference = (
      await saveComplaint(db, { complaint, formKey, spam, pictures }, now)
    ).reference;
    if (!spam)
      await processMail(db, mailTransport(), SITE_URL, now).catch((e) =>
        console.error("complaint mail", e),
      );
  } catch (error) {
    console.error("complaint", error);
    return { errors: {}, notice: COMPLAINT_COPY.failed };
  } finally {
    await close();
  }
  redirect(
    `/complaints/sent?ref=${encodeURIComponent(reference)}&t=${sentToken(`complaint:${reference}`)}`,
  );
}
