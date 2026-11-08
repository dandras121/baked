// The bespoke enquiry (SITE-FLOWS §7.1): the pills as drawn (660:4068), the date warnings, what counts as missing and
// the checks that can never be skipped. Shared by the form and the server.
import { toE164 } from "./phone";
import { isEmail } from "./contact";
import {
  addDays,
  daysBetween,
  formatLongDate,
  type CalendarDate,
} from "./london-time";
import { formatPrice } from "./money";
import { countCharacters, numberInWords } from "./words";

export const OCCASIONS = [
  "Birthday",
  "Wedding",
  "Christening",
  "Corporate",
  "Something else",
] as const;
export const SERVINGS = [
  "Up to 20",
  "20 – 40",
  "40 – 70",
  "70 – 120",
  "120+",
  "Not sure yet",
] as const;
export const AREAS = [
  "Edinburgh",
  "West Lothian",
  "Falkirk & Stirling",
  "Somewhere else",
] as const;
export const FINISHES = [
  "Buttercream",
  "Fondant",
  "Semi-naked",
  "Not sure",
] as const;
export const FLAVOURS = [
  "Vanilla",
  "Chocolate",
  "Lemon & elderflower",
  "Red velvet",
  "Open to ideas",
] as const;
export const DIETARY = [
  "None",
  "No nuts",
  "No gluten",
  "Vegan",
  "No dairy",
  "Other",
] as const;

/** The budget bands: the first reads “£{minimum} – 250” and is left out from a £250 minimum (§7.1). */
export function budgets(minimumPence: number): string[] {
  const fixed = ["£250 – 400", "£400 – 600", "£600+", "Not sure yet"];
  return minimumPence >= 25000
    ? fixed
    : [`${formatPrice(minimumPence)} – 250`, ...fixed];
}

export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  venueMax: 200,
  anythingMax: 1000,
  monthsAhead: 24,
} as const;

export type Enquiry = {
  occasion: string;
  date: string;
  flexible: boolean;
  servings: string;
  area: string;
  venue: string;
  budget: string;
  finish: string;
  flavour: string;
  dietary: string[];
  dietaryConsent: boolean;
  anything: string;
  name: string;
  phone: string;
  email: string;
  callMe: boolean;
};

export const EMPTY_ENQUIRY: Enquiry = {
  occasion: "",
  date: "",
  flexible: false,
  servings: "",
  area: "",
  venue: "",
  budget: "",
  finish: "",
  flavour: "",
  dietary: [],
  dietaryConsent: false,
  anything: "",
  name: "",
  phone: "",
  email: "",
  callMe: false,
};

/** Dietary pills (§7.1): None clears the others; any other clears None. */
export function toggleDietary(current: string[], pill: string): string[] {
  if (current.includes(pill)) return current.filter((p) => p !== pill);
  if (pill === "None") return ["None"];
  return [...current.filter((p) => p !== "None"), pill];
}

/** A dietary answer other than None needs the consent box (Decided D16). */
export const needsConsent = (dietary: string[]) =>
  dietary.some((p) => p !== "None");

/** The date field's range: tomorrow to 24 months ahead (§7.1). */
export function dateRange(today: CalendarDate) {
  const [y, m, d] = today.split("-").map(Number);
  const max = new Date(Date.UTC(y + 2, m - 1, d)).toISOString().slice(0, 10);
  return { min: addDays(today, 1), max };
}

/** Whole calendar months from today to the date (at least 1). */
function monthsBetween(today: CalendarDate, date: CalendarDate) {
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  let n = (y - ty) * 12 + (m - tm);
  if (d < td) n -= 1;
  return Math.max(1, n);
}

const words = (n: number) => (n <= 10 ? numberInWords(n) : String(n));

/**
 * The calm date warning (§7.1), or null: inside the bespoke lead time → “That is {n} days away — very soon…”
 * (worded for a wedding when it is one); a wedding inside six calendar months → the wedding line. Never blocks.
 */
export function dateWarning(
  v: { date: string; occasion: string },
  today: CalendarDate,
  leadWeeks: number,
): { line: string; wedding: boolean } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || v.date <= today) return null;
  const days = daysBetween(today, v.date);
  const wedding = v.occasion === "Wedding";
  if (days < leadWeeks * 7)
    return {
      line: `That is ${days < 100 ? numberInWords(days) : days} days away — very soon for ${wedding ? "a wedding cake" : "a bespoke cake"}. You can still send it; I will tell you within 24 hours whether I can fit it in.`,
      wedding,
    };
  const sixMonths = (() => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + 6, d)).toISOString().slice(0, 10);
  })();
  if (wedding && v.date < sixMonths) {
    const n = monthsBetween(today, v.date);
    return {
      line: `That is ${words(n)} month${n === 1 ? "" : "s"} away — weddings are usually booked about six months ahead.`,
      wedding: true,
    };
  }
  return null;
}

/** The long date under the field (“Saturday 20 June 2027”, the year always shown). */
export const longDate = (date: string, today: CalendarDate) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? formatLongDate(date, `${Number(today.slice(0, 4)) - 1}-01-01`)
    : "";

export type MissingKey =
  | "occasion"
  | "date"
  | "servings"
  | "area"
  | "budget"
  | "finish"
  | "flavour"
  | "email";

/** The summary's lines (K 975:9128), in the form's order. */
export const MISSING_LINES: Record<MissingKey, string> = {
  occasion: "The occasion.",
  date: "The date of the event — or tap My date is still flexible.",
  servings: "How many servings.",
  area: "Where it needs to go.",
  budget: "The budget.",
  finish: "The finish.",
  flavour: "The flavour.",
  email: "Your email address.",
};

/** What can be skipped with “send it anyway” (§7.1 Missing answers): never name, contact, consent or the phone. */
export function missing(v: Enquiry): MissingKey[] {
  const out: MissingKey[] = [];
  if (!v.occasion) out.push("occasion");
  if (!v.date && !v.flexible) out.push("date");
  if (!v.servings) out.push("servings");
  if (!v.area) out.push("area");
  if (!v.budget) out.push("budget");
  if (!v.finish) out.push("finish");
  if (!v.flavour) out.push("flavour");
  if (!v.email.trim() && v.phone.trim()) out.push("email");
  return out;
}

export const missingHeading = (n: number) =>
  n === 1
    ? "One thing still needs you"
    : `${numberInWords(n).replace(/^./, (c) => c.toUpperCase())} things still need you`;

export type EnquiryField =
  | "name"
  | "phone"
  | "email"
  | "contact"
  | "dietaryConsent"
  | "venue"
  | "anything"
  | "date";
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

export const ENQUIRY_COPY = {
  name: "Add your name — between 2 and 80 characters.",
  contact: "Add an email address or a phone number so I can reply.",
  email: "That email address does not look right — check it for a typo.",
  phone:
    "That phone number does not look right. Use a UK number, or put the country code first.",
  callMe: "Add a phone number so I can ring you",
  consent: "Please tick this so I can use your dietary answers.",
  venue: `Keep it to ${LIMITS.venueMax} characters.`,
  anything: `Keep it to ${LIMITS.anythingMax} characters.`,
  date: "Pick a date from tomorrow up to two years ahead.",
  rateLimit: (email: string) =>
    `Too many messages from this connection in the last hour — nothing was sent. Please try again later, or email ${email}.`,
  failed: "Nothing was sent — please try again.",
} as const;

/** The checks that can never be skipped (§7.1, §10.8). */
export function hardErrors(v: Enquiry, today: CalendarDate): EnquiryErrors {
  const e: EnquiryErrors = {};
  const name = v.name.trim();
  if (
    countCharacters(name) < LIMITS.nameMin ||
    countCharacters(name) > LIMITS.nameMax
  )
    e.name = ENQUIRY_COPY.name;
  const email = v.email.trim();
  const phone = v.phone.trim();
  if (email && !isEmail(email)) e.email = ENQUIRY_COPY.email;
  if (phone && !toE164(phone)) e.phone = ENQUIRY_COPY.phone;
  if (v.callMe && !phone) e.phone = ENQUIRY_COPY.callMe;
  if (!email && !phone && !e.phone) e.contact = ENQUIRY_COPY.contact;
  if (needsConsent(v.dietary) && !v.dietaryConsent)
    e.dietaryConsent = ENQUIRY_COPY.consent;
  if (countCharacters(v.venue) > LIMITS.venueMax) e.venue = ENQUIRY_COPY.venue;
  if (countCharacters(v.anything) > LIMITS.anythingMax)
    e.anything = ENQUIRY_COPY.anything;
  if (v.date) {
    const r = dateRange(today);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || v.date < r.min || v.date > r.max)
      e.date = ENQUIRY_COPY.date;
  }
  return e;
}

/** A pill answer must be one of the drawn pills; anything else is dropped. */
export function cleanEnquiry(
  raw: Partial<Record<keyof Enquiry, unknown>>,
  minimumPence: number,
): Enquiry {
  const one = (v: unknown, list: readonly string[]) =>
    typeof v === "string" && list.includes(v) ? v : "";
  const text = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : "";
  const dietary = Array.isArray(raw.dietary)
    ? DIETARY.filter((p) => (raw.dietary as unknown[]).includes(p))
    : [];
  return {
    occasion: one(raw.occasion, OCCASIONS),
    date: text(raw.date, 10),
    flexible: raw.flexible === true || raw.flexible === "1",
    servings: one(raw.servings, SERVINGS),
    area: one(raw.area, AREAS),
    venue: text(raw.venue, 400),
    budget: one(raw.budget, budgets(minimumPence)),
    finish: one(raw.finish, FINISHES),
    flavour: one(raw.flavour, FLAVOURS),
    dietary: dietary.includes("None") ? ["None"] : dietary,
    dietaryConsent: raw.dietaryConsent === true || raw.dietaryConsent === "1",
    anything: text(raw.anything, 2000),
    name: text(raw.name, 200),
    phone: text(raw.phone, 40),
    email: text(raw.email, 254),
    callMe: raw.callMe === true || raw.callMe === "1",
  };
}

/** The date as stored and shown: “Flexible — no date yet”, “{date} · flexible”, the date, or “Not answered”. */
export function dateAnswer(
  v: Pick<Enquiry, "date" | "flexible">,
  today: CalendarDate,
) {
  if (!v.date) return v.flexible ? "Flexible — no date yet" : "Not answered";
  const d = longDate(v.date, today);
  return v.flexible ? `${d} · flexible` : d;
}
