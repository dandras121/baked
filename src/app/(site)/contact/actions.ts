"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import {
  connectionKey,
  contactFormKeyUsed,
  saveContactMessage,
  takeFormSend,
} from "@/db/contact-repo";
import { getSiteSettings } from "@/db/site-settings";
import {
  CONTACT,
  CONTACT_COPY,
  CONTACT_FIELDS,
  contactEmail,
  validateContact,
  type ContactErrors,
  type ContactInput,
} from "@/lib/contact";
import { emailAdapter } from "@/lib/email/adapter";
import { sentToken } from "@/lib/sent-token";

export type ContactState = {
  errors: ContactErrors;
  values: ContactInput;
  /** Under the button: the send limit or a failed send (§10.8, §10.9). */
  notice: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sent(): Promise<never> {
  redirect(`/contact/sent?t=${sentToken("contact")}`);
}

async function clientAddress(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Send message (§7.4): checks, the send limit, the stored message and the e-mail to Linda. */
export async function sendContact(
  _previous: ContactState,
  form: FormData,
): Promise<ContactState> {
  const values = Object.fromEntries(
    CONTACT_FIELDS.map((f) => [f, String(form.get(f) ?? "")]),
  ) as ContactInput;
  // The honeypot (§7.1): a filled one looks sent, and nothing is stored or sent.
  if (String(form.get(CONTACT.honeypot) ?? "").trim()) await sent();

  const checked = validateContact(values);
  if (!checked.ok) return { errors: checked.errors, values, notice: null };

  const given = String(form.get("formKey") ?? "");
  const formKey = UUID.test(given) ? given : crypto.randomUUID();
  const settings = await getSiteSettings();
  if (!databaseUrl() || !settings)
    return { errors: {}, values, notice: CONTACT_COPY.failed };

  const { db, close } = connect();
  let outcome: "sent" | "limit" | "failed" = "failed";
  try {
    if (await contactFormKeyUsed(db, formKey)) outcome = "sent";
    else if (
      !(await takeFormSend(db, "contact", connectionKey(await clientAddress())))
    )
      outcome = "limit";
    else {
      const now = new Date();
      const id = await saveContactMessage(
        db,
        checked.value,
        formKey,
        "/contact",
        now,
      );
      if (id !== null)
        await emailAdapter().send(
          contactEmail(checked.value, settings.email, now, "/contact"),
        );
      outcome = "sent";
    }
  } catch (error) {
    console.error("contact form", error);
  } finally {
    await close();
  }
  if (outcome === "sent") await sent();
  return {
    errors: {},
    values,
    notice:
      outcome === "limit"
        ? CONTACT_COPY.tooMany(settings.email)
        : CONTACT_COPY.failed,
  };
}
