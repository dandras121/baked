// The contact form (SITE-FLOWS §7.4, §10.8, §10.9): its rules, its words and the e-mail Linda gets.
import { countCharacters } from "./words";
import { toE164 } from "./phone";

export const CONTACT = {
  nameMin: 2,
  nameMax: 80,
  messageMax: 400,
  /** §10.9: 5 sends per hour per connection and form. */
  perHour: 5,
  /** §10.10: contact messages are kept 30 days on the site. */
  keepDays: 30,
  /** The honeypot: a meaningless name, so autofill never fills it (§7.1). */
  honeypot: "bbl_ref_2",
} as const;

export type ContactField = "name" | "email" | "phone" | "message";
export type ContactErrors = Partial<Record<ContactField, string>>;
export type ContactInput = Record<ContactField, string>;
export type ContactMessage = {
  name: string;
  email: string;
  /** E.164, or null when none was given. */
  phone: string | null;
  message: string;
};

export const CONTACT_FIELDS: ContactField[] = [
  "name",
  "email",
  "phone",
  "message",
];

/** Standard format: something@domain.tld, no spaces (§10.8). */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const CONTACT_COPY = {
  nameMissing: "Please tell me your name.",
  nameShort: "Please write your name in full — at least two letters.",
  nameLong: "That is longer than a name needs — 80 characters at most.",
  emailMissing: "Please give your email address so I can answer you.",
  emailInvalid: "That does not look like a full email address.",
  phoneInvalid:
    "That does not look like a phone number — try 07700 900 000, or +353 85 123 4567 from abroad.",
  messageMissing: "Please tell me what I can help with.",
  messageLong: (n: number) =>
    `${n} of 400 characters — a little too long. Please shorten it, or email me.`,
  failed: "Nothing was sent — please try again.",
  tooMany: (email: string | null) =>
    `Too many messages from this connection in the last hour — nothing was sent. Please try again later${
      email ? `, or email ${email}` : ""
    }.`,
} as const;

/** Checks one field; null when it is fine. */
export function contactFieldError(
  field: ContactField,
  raw: string,
): string | null {
  const value = raw.trim();
  switch (field) {
    case "name": {
      const n = countCharacters(value);
      if (n === 0) return CONTACT_COPY.nameMissing;
      if (n < CONTACT.nameMin) return CONTACT_COPY.nameShort;
      if (n > CONTACT.nameMax) return CONTACT_COPY.nameLong;
      return null;
    }
    case "email":
      if (!value) return CONTACT_COPY.emailMissing;
      return EMAIL.test(value) && value.length <= 254
        ? null
        : CONTACT_COPY.emailInvalid;
    case "phone":
      if (!value) return null;
      return toE164(value) ? null : CONTACT_COPY.phoneInvalid;
    case "message": {
      if (!value) return CONTACT_COPY.messageMissing;
      const n = countCharacters(raw);
      return n > CONTACT.messageMax ? CONTACT_COPY.messageLong(n) : null;
    }
  }
}

/** Every rule at once: the clean message, or the errors in field order. */
export function validateContact(
  input: ContactInput,
): { ok: true; value: ContactMessage } | { ok: false; errors: ContactErrors } {
  const errors: ContactErrors = {};
  for (const field of CONTACT_FIELDS) {
    const error = contactFieldError(field, input[field] ?? "");
    if (error) errors[field] = error;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: input.name.trim().replace(/\s+/g, " "),
      email: input.email.trim(),
      phone: input.phone.trim() ? toE164(input.phone) : null,
      message: input.message.trim(),
    },
  };
}

export type OutgoingEmail = {
  stream: "transactional" | "broadcast";
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
};

/** London time, e.g. “Saturday 31 October 2026, 2:05pm”. */
function londonTime(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()}`;
}

/** The e-mail to Linda (§7.4): from the website, Reply-To the customer, every field, the time and the page. */
export function contactEmail(
  message: ContactMessage,
  to: string,
  at: Date,
  page: string,
): OutgoingEmail {
  return {
    stream: "transactional",
    from: "Baked by Linda website",
    to,
    replyTo: message.email,
    subject: `Website message — ${message.name}`,
    text: [
      `Name: ${message.name}`,
      `Email: ${message.email}`,
      `Phone: ${message.phone ?? "not given"}`,
      "",
      message.message,
      "",
      `Sent ${londonTime(at)} from ${page}`,
    ].join("\n"),
  };
}
