// Change the order (§9.7) — the order's own fields: date and window, handover, address, collection time, and the
// customer's name, e-mail and phone. The rules that need no database: checks, the old → new rows, the earliest date.
import { WINDOWS, isUkPostcode, normalisePostcode } from "@/lib/handover";
import { formatLongDate, type CalendarDate } from "@/lib/london-time";
import { toE164 } from "@/lib/phone";

export type ChangeForm = {
  date: string;
  window: string;
  handover: "delivery" | "collection";
  address: string;
  town: string;
  postcode: string;
  collectionTime: string;
  name: string;
  email: string;
  phone: string;
  /** Shown when the date moves later (§9.7, Decided 2026-10-17): unticked, the refund counts from the new date. */
  customerAsked: boolean;
};

export type OrderFields = {
  date: string;
  earliestDate: string;
  deliveryWindow: string | null;
  handover: string;
  address: string | null;
  town: string | null;
  postcode: string | null;
  collectionTime: string | null;
  customerName: string;
  email: string;
  phone: string;
};

export function formFromOrder(o: OrderFields): ChangeForm {
  return {
    date: String(o.date),
    window: o.deliveryWindow ?? "",
    handover: o.handover === "delivery" ? "delivery" : "collection",
    address: o.address ?? "",
    town: o.town ?? "",
    postcode: o.postcode ?? "",
    collectionTime: o.collectionTime ?? "",
    name: o.customerName,
    email: o.email,
    phone: o.phone,
    customerAsked: false,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Checks (§9.7): the date from today on (an unchanged past date may stay); the §9.6 rules for the rest. */
export function checkChange(
  f: ChangeForm,
  o: OrderFields,
  today: CalendarDate,
) {
  const e: Partial<Record<keyof ChangeForm, string>> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) e.date = "Pick the day.";
  else if (f.date < today && f.date !== String(o.date))
    e.date = "Pick a day from today on.";
  const name = f.name.trim().replace(/\s+/g, " ");
  if ([...name].length < 2 || [...name].length > 80)
    e.name = "Type their name — 2 to 80 characters.";
  if (!EMAIL.test(f.email.trim()))
    e.email = "Type an e-mail address, like name@example.co.uk.";
  const phoneE164 = f.phone.trim() ? toE164(f.phone) : null;
  if (f.phone.trim() && !phoneE164)
    e.phone =
      "That does not look like a phone number — a UK number, or one with its country code (+353 …).";
  else if (!f.phone.trim() && f.handover === "collection")
    e.phone =
      "A collection needs a phone number — the order page checks its last four digits.";
  const postcode = normalisePostcode(f.postcode);
  if (f.handover === "delivery") {
    if (!f.address.trim()) e.address = "Type the address for the delivery.";
    if (!isUkPostcode(postcode))
      e.postcode = "Type a UK postcode, like EH49 6HH.";
    if (!WINDOWS.some((w) => w.key === f.window)) e.window = "Pick a window.";
  }
  return {
    errors: e,
    value: Object.keys(e).length
      ? null
      : {
          date: f.date,
          deliveryWindow: f.handover === "delivery" ? f.window : null,
          handover: f.handover,
          address: f.handover === "delivery" ? f.address.trim() : null,
          town: f.handover === "delivery" ? f.town.trim() || null : null,
          postcode: f.handover === "delivery" ? postcode : null,
          collectionTime:
            f.handover === "collection"
              ? f.collectionTime.trim().slice(0, 40) || null
              : null,
          customerName: name,
          email: f.email.trim(),
          phone: f.phone.trim(),
          phoneE164,
          customerAsked: f.customerAsked,
        },
  };
}

export type ChangeValue = NonNullable<ReturnType<typeof checkChange>["value"]>;

const windowTimes = (k: string | null) =>
  WINDOWS.find((w) => w.key === k)?.times ?? "—";
const where = (v: {
  address: string | null;
  town: string | null;
  postcode: string | null;
}) =>
  [v.address, [v.town, v.postcode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ") || "—";

/**
 * The [what, before, after] rows (e-mail 12, HISTORY) and whether the customer hears of it: name, e-mail and phone
 * alone send no e-mail 12 (§9.7).
 */
export function changeRows(
  o: OrderFields,
  v: ChangeValue,
  today: CalendarDate,
) {
  const rows: [string, string, string][] = [];
  const contact: [string, string, string][] = [];
  if (v.date !== String(o.date))
    rows.push([
      "Date",
      formatLongDate(String(o.date), today),
      formatLongDate(v.date, today),
    ]);
  if (v.handover !== o.handover)
    rows.push([
      "Handover",
      o.handover === "delivery" ? "Delivery" : "Collection",
      v.handover === "delivery" ? "Delivery" : "Collection",
    ]);
  if (
    v.handover === "delivery" &&
    (v.deliveryWindow ?? null) !== (o.deliveryWindow ?? null)
  )
    rows.push([
      "Window",
      windowTimes(o.deliveryWindow),
      windowTimes(v.deliveryWindow),
    ]);
  if (v.handover === "delivery" && where(v) !== where(o))
    rows.push(["Address", where(o), where(v)]);
  if (
    v.handover === "collection" &&
    (v.collectionTime ?? null) !== (o.collectionTime ?? null)
  )
    rows.push([
      "Collection time",
      o.collectionTime || "Agreed with Linda",
      v.collectionTime || "Agreed with Linda",
    ]);
  if (v.customerName !== o.customerName)
    contact.push(["Name", o.customerName, v.customerName]);
  if (v.email !== o.email) contact.push(["Email", o.email, v.email]);
  if (v.phone !== o.phone)
    contact.push(["Phone", o.phone || "—", v.phone || "—"]);
  return { rows, contact };
}

/**
 * The earliest date the refund tiers count from (§10.1, Decided 2026-10-17): an earlier date always lowers it; a later
 * date that the customer did not ask for moves it too, so they lose nothing by Linda's move.
 */
export function newEarliest(
  o: { date: string; earliestDate: string },
  date: string,
  customerAsked: boolean,
) {
  const earliest = String(o.earliestDate);
  if (date < earliest) return date;
  if (date > String(o.date) && !customerAsked) return date;
  return earliest;
}

/** The delivery charge after a handover switch (§9.7): collection → delivery adds today's; back removes the paid one. */
export function newCharge(
  o: { handover: string; deliveryChargePence: number },
  handover: string,
  chargeNow: number,
) {
  if (handover === o.handover) return o.deliveryChargePence;
  return handover === "delivery" ? chargeNow : 0;
}

/** The price note of Appendix A.3 (Owner only). */
export const PRICE_NOTE =
  "Higher total on a fully paid order: the customer gets a link for the difference and nothing changes until it is paid. Not fully paid: saved now, still to pay rises. Lower: anything paid over the new total is refunded automatically.";
