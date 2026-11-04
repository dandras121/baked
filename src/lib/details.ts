// Step 3 — Your details (SITE-FLOWS §5.3, §10.8, Decided D16).
import { CONTACT_COPY } from "./contact";
import { toE164 } from "./phone";

export const DETAILS_COPY = {
  nameMissing: CONTACT_COPY.nameMissing,
  nameShort: CONTACT_COPY.nameShort,
  nameLong: CONTACT_COPY.nameLong,
  emailMissing:
    "Please give your email address — your confirmation goes there.",
  emailInvalid: CONTACT_COPY.emailInvalid,
  phone:
    "Please give a mobile number, like 07700 900 000 or +353 85 123 4567 — I text you on the day.",
  cakeForLong: "That is a little long — 80 characters at most.",
  noteLong: (n: number) =>
    `${n} of 400 characters — a little too long. Please shorten it.`,
  consent: "I agree to Linda using this to make my cake safely.",
  consentMissing: "Please tick this so I can use your allergy note.",
  termsMissing:
    "Please tick this to agree to the terms — nothing else is lost.",
  marketing:
    "Send me an email once a year, around this date, in case you would like another one. You can stop it any time.",
  boxesNote:
    "None of these boxes is ticked for you. The terms box is required; the e-mail box is up to you.",
  failed: "Nothing was saved — please try again.",
} as const;

export const NAME_MAX = 80;
export const CAKE_FOR_MAX = 80;
export const NOTE_MAX = 400;

export type DetailsInput = {
  name: string;
  email: string;
  phone: string;
  cakeFor: string;
  note: string;
  consent: boolean;
  terms: boolean;
  marketing: boolean;
};

export type DetailsField =
  "name" | "email" | "phone" | "cakeFor" | "note" | "consent" | "terms";
export type DetailsErrors = Partial<Record<DetailsField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const count = (s: string) => [...s.trim()].length;

/**
 * A mobile number in E.164 (§5.3, Decided 2026-10-17): UK 07… / +44 7…, or an international number with its
 * country code; null when it is neither.
 */
export function mobileE164(raw: string): string | null {
  const text = raw.trim();
  const e164 = toE164(text);
  if (!e164) return null;
  if (e164.startsWith("+44")) return e164.startsWith("+447") ? e164 : null;
  // Abroad only with the country code written (+… or 00…), so a UK landline cannot slip through as foreign.
  return /^(\+|00)/.test(text) ? e164 : null;
}

/** One field's message, or null when it is fine. */
export function detailsFieldError(
  field: DetailsField,
  i: DetailsInput,
): string | null {
  switch (field) {
    case "name": {
      const n = count(i.name);
      if (n === 0) return DETAILS_COPY.nameMissing;
      if (n < 2) return DETAILS_COPY.nameShort;
      return n > NAME_MAX ? DETAILS_COPY.nameLong : null;
    }
    case "email":
      if (!i.email.trim()) return DETAILS_COPY.emailMissing;
      return EMAIL.test(i.email.trim()) ? null : DETAILS_COPY.emailInvalid;
    case "phone":
      return mobileE164(i.phone) ? null : DETAILS_COPY.phone;
    case "cakeFor":
      return count(i.cakeFor) > CAKE_FOR_MAX ? DETAILS_COPY.cakeForLong : null;
    case "note": {
      const n = count(i.note);
      return n > NOTE_MAX ? DETAILS_COPY.noteLong(n) : null;
    }
    case "consent":
      return i.note.trim() && !i.consent ? DETAILS_COPY.consentMissing : null;
    case "terms":
      return i.terms ? null : DETAILS_COPY.termsMissing;
  }
}

const ORDER: DetailsField[] = [
  "name",
  "email",
  "phone",
  "cakeFor",
  "note",
  "consent",
  "terms",
];

/** Every message on Continue, in the order of the page (the focus goes to the first). */
export function validateDetails(i: DetailsInput): DetailsErrors {
  const e: DetailsErrors = {};
  for (const f of ORDER) {
    const m = detailsFieldError(f, i);
    if (m) e[f] = m;
  }
  return e;
}

/** Step 3 is done when everything required is there and the terms were accepted (§10.2). */
export const detailsDone = (d: {
  customerName: string | null;
  email: string | null;
  phoneE164: string | null;
  termsAcceptedAt: Date | null;
}) => !!(d.customerName && d.email && d.phoneE164 && d.termsAcceptedAt);

/**
 * The helper under the allergy note (639:3347), from Settings → the kitchen also handles: “I will always tell you
 * what is in the cake, but I cannot promise a kitchen free of tree nuts, soya and sesame.”
 */
export function kitchenHelper(kitchen: string[]): string {
  if (!kitchen.length) return "I will always tell you what is in the cake.";
  const list =
    kitchen.length === 1
      ? kitchen[0]
      : `${kitchen.slice(0, -1).join(", ")} and ${kitchen.at(-1)}`;
  return `I will always tell you what is in the cake, but I cannot promise a kitchen free of ${list}.`;
}
