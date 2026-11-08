"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { connectionKey, takeFormSend } from "@/db/contact-repo";
import { saveEnquiry } from "@/db/enquiry-repo";
import { processMail } from "@/db/mail-repo";
import { getSiteSettings } from "@/db/site-settings";
import {
  cleanEnquiry,
  ENQUIRY_COPY,
  hardErrors,
  missing,
  type EnquiryErrors,
  type MissingKey,
} from "@/lib/bespoke";
import { CONTACT } from "@/lib/contact";
import { londonDate } from "@/lib/london-time";
import { mailTransport } from "@/lib/mail/transport";
import { sentToken } from "@/lib/sent-token";

export type EnquiryState = {
  errors: EnquiryErrors;
  /** The answers still missing when “send it anyway” was not chosen (K). */
  missing: MissingKey[];
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
 * Send my enquiry (§7.1): the checks that can never be skipped, then the missing answers (unless “send it anyway”),
 * the send limit, the stored enquiry and Linda's alert; then `/bespoke/sent`. A filled honeypot looks sent and is kept
 * as possible spam.
 */
export async function sendEnquiry(
  _previous: EnquiryState,
  form: FormData,
): Promise<EnquiryState> {
  const settings = await getSiteSettings();
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(String(form.get("enquiry") ?? "{}"));
  } catch {
    // An empty enquiry is checked like any other.
  }
  const enquiry = cleanEnquiry(raw, settings?.bespokeMinimumPence ?? 16000);
  const spam = !!String(form.get(CONTACT.honeypot) ?? "").trim();
  const now = new Date();
  const today = londonDate(now);
  const errors = spam ? {} : hardErrors(enquiry, today);
  if (Object.keys(errors).length) return { errors, missing: [], notice: null };
  const gaps = missing(enquiry);
  const anyway = form.get("sendAnyway") === "1" && !!enquiry.phone.trim();
  if (!spam && gaps.length && !anyway)
    return { errors: {}, missing: gaps, notice: null };

  const given = String(form.get("formKey") ?? "");
  const formKey = UUID.test(given) ? given : crypto.randomUUID();
  const inspired = Number(form.get("inspired")) || null;
  if (!databaseUrl() || !settings)
    return { errors: {}, missing: [], notice: ENQUIRY_COPY.failed };
  const { db, close } = connect();
  let reference = "";
  try {
    if (
      !spam &&
      !(await takeFormSend(
        db,
        "bespoke",
        connectionKey(await clientAddress()),
        now,
      ))
    )
      return {
        errors: {},
        missing: [],
        notice: ENQUIRY_COPY.rateLimit(settings.email),
      };
    reference = (
      await saveEnquiry(
        db,
        { enquiry, inspiredId: inspired, formKey, spam },
        today,
        now,
      )
    ).reference;
    if (!spam)
      await processMail(db, mailTransport(), SITE_URL, now).catch((e) =>
        console.error("enquiry mail", e),
      );
  } catch (error) {
    console.error("bespoke enquiry", error);
    return { errors: {}, missing: [], notice: ENQUIRY_COPY.failed };
  } finally {
    await close();
  }
  redirect(
    `/bespoke/sent?ref=${encodeURIComponent(reference)}&t=${sentToken(`bespoke:${reference}`)}`,
  );
}
