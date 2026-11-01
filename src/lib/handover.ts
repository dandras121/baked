// Step 2's handover (SITE-FLOWS §5.2, §11.1): delivery or collection, the address, the postcode area, the window.
import { formatPrice } from "./money";

export type Handover = "delivery" | "collection";
export type WindowKey = "morning" | "afternoon" | "evening";

/** The three delivery windows (§5.2): desktop and tablet show the times, the phone the names only. */
export const WINDOWS: { key: WindowKey; name: string; times: string }[] = [
  { key: "morning", name: "Morning", times: "9am – 12pm" },
  { key: "afternoon", name: "Afternoon", times: "12 – 4pm" },
  { key: "evening", name: "Evening", times: "4 – 7pm" },
];

export const HANDOVER_COPY = {
  handover: "Choose delivery or collection.",
  window: "Choose a time window.",
  address: "Enter the street address.",
  town: "Enter the town.",
  postcode: "Enter a full postcode, like EH52 6AA.",
  outsideTitle: (outward: string, area: string) =>
    `I do not deliver to ${outward} — it is outside ${area}.`,
  /** Under the windows (637:3297; §5.4 Decided: Linda sends this text by hand). */
  textLine: "I will text you that morning with a tighter window.",
  outsideText:
    "Collection is still open — or a courier for boxed single tiers.",
} as const;

/** “Free across Edinburgh & the Lothians.” / “£8 across …” (§5.2 Delivery-area text). */
export function deliveryAreaText(chargePence: number, area: string): string {
  return `${chargePence === 0 ? "Free" : formatPrice(chargePence)} across ${area}.`;
}

/** “20 Church View, Winchburgh — free, at a time we agree” (637:3278, the address from Settings). */
export const collectionText = (address: string) =>
  `${address} — free, at a time we agree`;

/** Upper case with one space before the inward code: “eh52  6sz” → “EH52 6SZ”. */
export function normalisePostcode(raw: string): string {
  const s = raw.toUpperCase().replace(/\s+/g, "");
  return s.length > 3 ? `${s.slice(0, -3)} ${s.slice(-3)}` : s;
}

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/;
export const isUkPostcode = (p: string) =>
  UK_POSTCODE.test(normalisePostcode(p));

/** The outward code, “EH52” from “EH52 6SZ”. */
export const outwardCode = (p: string) => normalisePostcode(p).split(" ")[0];

/**
 * Delivery is offered when the outward code equals a listed district or falls in a listed range — same letters,
 * numbers inclusive (§11.1 Postcode districts: “EH1–EH42, EH47–EH55”).
 */
export function inDistricts(outward: string, spec: string): boolean {
  const m = /^([A-Z]{1,2})(\d+)[A-Z]?$/.exec(outward.toUpperCase());
  if (!m) return false;
  const [, letters, num] = m;
  for (const part of spec
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)) {
    const r = /^([A-Z]{1,2})(\d+)\s*[–-]\s*([A-Z]{1,2})?(\d+)$/.exec(part);
    if (r) {
      if (
        r[1] === letters &&
        (!r[3] || r[3] === letters) &&
        +num >= +r[2] &&
        +num <= +r[4]
      )
        return true;
      continue;
    }
    if (part === outward.toUpperCase()) return true;
  }
  return false;
}

export type HandoverInput = {
  handover: string;
  address: string;
  town: string;
  postcode: string;
  window: string;
};

export type HandoverErrors = Partial<
  Record<"handover" | "address" | "town" | "postcode" | "window", string>
>;

/** The checks on Continue (§5.2 Errors on Continue, Address fields). Collection asks for nothing more. */
export function handoverErrors(
  i: HandoverInput,
  districts: string,
): HandoverErrors {
  const e: HandoverErrors = {};
  if (i.handover !== "delivery" && i.handover !== "collection")
    return { handover: HANDOVER_COPY.handover };
  if (i.handover === "collection") return e;
  const address = i.address.trim();
  const town = i.town.trim();
  if (address.length < 3 || address.length > 100)
    e.address = HANDOVER_COPY.address;
  if (town.length < 2 || town.length > 50) e.town = HANDOVER_COPY.town;
  if (!isUkPostcode(i.postcode)) e.postcode = HANDOVER_COPY.postcode;
  else if (!inDistricts(outwardCode(i.postcode), districts))
    e.postcode = "outside";
  if (!WINDOWS.some((w) => w.key === i.window)) e.window = HANDOVER_COPY.window;
  return e;
}

/** The summary's handover row (1674:11978; collection 1096:9106 · D): “Delivery · morning” / “Free”, or
 *  “Collection time” / “Agreed with Linda”. */
export function handoverRow(
  handover: Handover,
  window: string | null,
  chargePence: number,
) {
  if (handover === "collection")
    return { label: "Collection time", value: "Agreed with Linda" };
  const w = WINDOWS.find((x) => x.key === window);
  return {
    label: w ? `Delivery · ${w.name.toLowerCase()}` : "Delivery",
    value: chargePence === 0 ? "Free" : formatPrice(chargePence),
  };
}

/** What the delivery adds to the total: the charge for delivery, nothing for collection or before a choice. */
export const handoverCharge = (handover: string | null, chargePence: number) =>
  handover === "delivery" ? chargePence : 0;

/** The phone bar's second line (1102:9148): “1 cake · delivery free”, “2 cakes · collection free”, “… · delivery £8”. */
export function barLine(
  cakes: number,
  handover: string | null,
  chargePence: number,
): string {
  const n = cakes === 1 ? "1 cake" : `${cakes} cakes`;
  if (handover === "collection") return `${n} · collection free`;
  return `${n} · delivery ${chargePence === 0 ? "free" : formatPrice(chargePence)}`;
}
