// Add an order (§9.6): the rules of the form — what is required, the limits, the day's count line and its calm warnings.
import { readPounds } from "@/lib/admin/cancel";
import { UK_ALLERGENS, type Allergen } from "@/lib/constants";
import { WINDOWS } from "@/lib/handover";
import { isUkPostcode, normalisePostcode } from "@/lib/handover";
import { formatAdminMoney } from "@/lib/money";
import { toE164 } from "@/lib/phone";

export const TIERS = [
  "Single tier",
  "Two tiers",
  "Three tiers",
  "Four tiers",
  "Five tiers",
  "Six tiers",
];

export type AddOrderForm = {
  name: string;
  email: string;
  phone: string;
  date: string;
  handover: "delivery" | "collection";
  address: string;
  town: string;
  postcode: string;
  window: string;
  collectionTime: string;
  what: string;
  serves: string;
  tiers: string;
  inscription: string;
  allergens: string[];
  alsoContains: string;
  allergyNote: string;
  total: string;
  paid: string;
  method: string;
  emails: "on" | "off";
};

export const EMPTY_FORM: AddOrderForm = {
  name: "",
  email: "",
  phone: "",
  date: "",
  handover: "delivery",
  address: "",
  town: "",
  postcode: "",
  window: "",
  collectionTime: "",
  what: "",
  serves: "",
  tiers: "1",
  inscription: "",
  allergens: [],
  alsoContains: "",
  allergyNote: "",
  total: "",
  paid: "0",
  method: "",
  emails: "on",
};

export type AddOrderValue = {
  name: string;
  email: string;
  phone: string;
  phoneE164: string | null;
  date: string;
  handover: "delivery" | "collection";
  address: string | null;
  town: string | null;
  postcode: string | null;
  window: string | null;
  collectionTime: string | null;
  what: string;
  serves: number;
  tiers: number;
  inscription: string;
  allergens: Allergen[];
  alsoContains: string;
  allergyNote: string | null;
  totalPence: number;
  paidPence: number;
  method: "cash" | "bank" | null;
  customerEmails: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const chars = (s: string) => [...s].length;

/** Checks the form (§9.6); every message says what is wrong and what to do. */
export function checkAddOrder(f: AddOrderForm, today: string) {
  const e: Partial<Record<keyof AddOrderForm, string>> = {};
  const name = f.name.trim().replace(/\s+/g, " ");
  if (chars(name) < 2 || chars(name) > 80)
    e.name = "Type their name — 2 to 80 characters.";
  const email = f.email.trim();
  if (!EMAIL.test(email))
    e.email = "Type an e-mail address, like name@example.co.uk.";
  const phoneE164 = f.phone.trim() ? toE164(f.phone) : null;
  if (f.phone.trim() && !phoneE164)
    e.phone =
      "That does not look like a phone number — a UK number, or one with its country code (+353 …).";
  else if (!f.phone.trim() && f.handover === "collection")
    e.phone =
      "A collection needs a phone number — the order page checks its last four digits.";
  else if (!f.phone.trim() && f.emails === "off")
    e.phone =
      "With customer e-mails off, add a phone number so you can ring them.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) e.date = "Pick the day.";
  else if (f.date < today) e.date = "Pick a day from today on.";
  const postcode = normalisePostcode(f.postcode);
  if (f.handover === "delivery") {
    if (!f.address.trim()) e.address = "Type the address for the delivery.";
    if (!isUkPostcode(postcode))
      e.postcode = "Type a UK postcode, like EH49 6HH.";
    if (!WINDOWS.some((w) => w.key === f.window)) e.window = "Pick a window.";
  }
  const what = f.what.trim();
  if (!what || chars(what) > 300)
    e.what = "Say what the cake is — up to 300 characters.";
  const serves = Number(f.serves);
  if (!Number.isInteger(serves) || serves < 1 || serves > 500)
    e.serves = "Type how many it serves — 1 to 500.";
  const tiers = Number(f.tiers);
  if (!Number.isInteger(tiers) || tiers < 1 || tiers > TIERS.length)
    e.tiers = "Pick the tiers.";
  if (chars(f.inscription.trim()) > 24)
    e.inscription = "Keep the message to 24 characters.";
  if (chars(f.alsoContains.trim()) > 100)
    e.alsoContains = "Keep it to 100 characters.";
  if (chars(f.allergyNote.trim()) > 400)
    e.allergyNote = "Keep the allergy note to 400 characters.";
  const total = readPounds(f.total);
  if (total === null || total > 500000)
    e.total = "Type the total, from £0 to £5,000 — for example 380 or 92.50.";
  const paid = readPounds(f.paid || "0");
  if (paid === null) e.paid = "Type what was paid so far, or 0.";
  else if (total !== null && paid > total)
    e.paid = `That is more than the ${formatAdminMoney(total, "breakdown")} total.`;
  if (paid && paid > 0 && f.method !== "cash" && f.method !== "bank")
    e.method = "Say how it was paid: cash or bank transfer.";
  if (Object.keys(e).length) return { errors: e, value: null as AddOrderValue | null };
  const value: AddOrderValue = {
    name,
    email,
    phone: f.phone.trim(),
    phoneE164,
    date: f.date,
    handover: f.handover,
    address: f.handover === "delivery" ? f.address.trim() : null,
    town: f.handover === "delivery" ? f.town.trim() || null : null,
    postcode: f.handover === "delivery" ? postcode : null,
    window: f.handover === "delivery" ? f.window : null,
    collectionTime:
      f.handover === "collection"
        ? f.collectionTime.trim().slice(0, 40) || null
        : null,
    what,
    serves,
    tiers,
    inscription: f.inscription.trim(),
    allergens: UK_ALLERGENS.filter((a) => f.allergens.includes(a)),
    alsoContains: f.alsoContains.trim(),
    allergyNote: f.allergyNote.trim() || null,
    totalPence: total!,
    paidPence: paid ?? 0,
    method: paid ? (f.method as "cash" | "bank") : null,
    customerEmails: f.emails === "on",
  };
  return { errors: e, value: value as AddOrderValue | null };
}

/** “Three tiers · serves 100” — the order line's size. */
export const sizeLine = (tiers: number, serves: number) =>
  `${TIERS[tiers - 1] ?? TIERS[0]} · serves ${serves}`;

export type DayInfo = {
  day: number;
  dailyCap: number;
  week: number;
  weeklyCap: number;
  closed: string | null;
};

/** “That day: 0 of 2 booked · that week: 3 of 9 booked” (§9.6). */
export const dayLine = (d: DayInfo) =>
  `That day: ${d.day} of ${d.dailyCap} booked · that week: ${d.week} of ${d.weeklyCap} booked`;

/** The calm warnings (§9.6, Decided D4): saving is allowed. One manual order counts one cake. */
export function dayWarnings(d: DayInfo) {
  const out: string[] = [];
  if (d.closed !== null)
    out.push(
      `That day is closed${d.closed ? ` — ${d.closed}` : ""} — saving books it anyway.`,
    );
  if (d.day >= d.dailyCap)
    out.push(
      `That day is full (${d.day} of ${d.dailyCap}) — saving puts it at ${d.day + 1} of ${d.dailyCap}.`,
    );
  if (d.week >= d.weeklyCap)
    out.push(
      `That week is full (${d.week} of ${d.weeklyCap}) — saving puts it at ${d.week + 1} of ${d.weeklyCap}.`,
    );
  return out;
}

/** The hint under the e-mail field (§9.6). */
export const emailHint = (name: string) =>
  `Ask ${name.trim().split(/\s+/)[0] || "the customer"} for an e-mail address — payment links and cancellations are sent by e-mail.`;
