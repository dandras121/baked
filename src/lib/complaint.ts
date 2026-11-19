// Complaints (§7.5; the form on the Complaints procedure page 666:4722, phone 844:8217): order number (optional,
// loosely tidied, never rejected), name, e-mail, what's wrong (max 400), up to three pictures (§7.1 rules) and one
// optional “What would help”. The name and e-mail checks are Contact's (§7.4), so both forms say the same.
import { CONTACT_COPY, contactFieldError } from "./contact";
import { countCharacters } from "./words";

export const WANTED = [
  "Repair",
  "Replacement cake",
  "Partial refund",
  "Full refund",
] as const;

export const COMPLAINT = { bodyMax: 400, orderMax: 40 } as const;

export type Complaint = {
  orderNumber: string;
  name: string;
  email: string;
  body: string;
  wanted: string;
};

export const EMPTY_COMPLAINT: Complaint = {
  orderNumber: "",
  name: "",
  email: "",
  body: "",
  wanted: "",
};

export type ComplaintErrors = Partial<Record<keyof Complaint, string>>;

export const COMPLAINT_COPY = {
  bodyMissing: "Please tell me what went wrong.",
  bodyLong: (n: number) =>
    `${n} of 400 characters — a little too long. Please shorten it, or email me.`,
  orderLong: "That is longer than an order number — 40 characters at most.",
  failed: CONTACT_COPY.failed,
  tooMany: CONTACT_COPY.tooMany,
} as const;

/**
 * The order number as people type it, tidied: “bbl 2026 147” or “2026-147” → “BBL-2026-0147”. Anything else is kept
 * as typed (it is never rejected — Linda can still find the order by hand).
 */
export function tidyOrderNumber(raw: string): string {
  const typed = raw.trim().replace(/\s+/g, " ");
  const m = /^(?:BBL)?[\s-]*(\d{4})[\s-]+(\d{1,5})$/i.exec(typed);
  return m ? `BBL-${m[1]}-${m[2].padStart(4, "0")}` : typed;
}

export function complaintErrors(v: Complaint): ComplaintErrors {
  const e: ComplaintErrors = {};
  const name = contactFieldError("name", v.name);
  if (name) e.name = name;
  const email = contactFieldError("email", v.email);
  if (email) e.email = email;
  const n = countCharacters(v.body);
  if (!v.body.trim()) e.body = COMPLAINT_COPY.bodyMissing;
  else if (n > COMPLAINT.bodyMax) e.body = COMPLAINT_COPY.bodyLong(n);
  if (countCharacters(v.orderNumber.trim()) > COMPLAINT.orderMax)
    e.orderNumber = COMPLAINT_COPY.orderLong;
  return e;
}

/** Only the drawn pill counts as “What would help”; the text fields as strings. */
export function cleanComplaint(raw: Record<string, unknown>): Complaint {
  const text = (k: keyof Complaint) =>
    typeof raw[k] === "string" ? (raw[k] as string) : "";
  const wanted = text("wanted");
  return {
    orderNumber: text("orderNumber"),
    name: text("name"),
    email: text("email"),
    body: text("body"),
    wanted: (WANTED as readonly string[]).includes(wanted) ? wanted : "",
  };
}

/** The line on the sent page: the reference, the matched order, and the first 60 characters of what's wrong. */
export function complaintSummary(c: {
  reference: string;
  matchedOrder: string | null;
  body: string;
}) {
  const words = c.body.trim().replace(/\s+/g, " ");
  const chars = [...words];
  const short =
    chars.length > 60 ? `${chars.slice(0, 60).join("").trimEnd()}…` : words;
  const head = c.matchedOrder
    ? `${c.reference} · order ${c.matchedOrder}`
    : c.reference;
  return `${head} · ${short}`;
}
