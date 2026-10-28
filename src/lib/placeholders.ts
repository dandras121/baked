// Templates inside text (SITE-FLOWS §11.8): FAQ answers and legal pages Linda edits carry placeholders such as
// {phone}; they are filled from Settings (public pages) or from the facts kept with an order (e-mail 1).
import { formatPrice } from "./money";
import type { Settings } from "./settings";
import { leadTimeWords, numberInWords } from "./words";

export const PLACEHOLDERS = [
  "trading_name",
  "legal_name",
  "phone",
  "email",
  "address",
  "postcode",
  "town",
  "delivery_area",
  "delivery_charge",
  "second_attempt_fee",
  "lead_time_words",
  "bespoke_lead_time_words",
  "bespoke_minimum",
  "kitchen_handles",
  "council",
  "hygiene_rating",
] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/** “nuts, wheat, egg, milk, soya and sesame”. */
export function listInWords(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Delivery charge in copy: “Free” at £0 (§11.1). The bespoke minimum is never shown as “Free”. */
const charge = (pence: number) => (pence === 0 ? "Free" : formatPrice(pence));

export function placeholderValues(s: Settings): Record<Placeholder, string> {
  return {
    trading_name: s.tradingName,
    legal_name: s.legalName,
    phone: s.phone,
    email: s.email,
    address: s.addressLine,
    postcode: s.postcode,
    town: s.town,
    delivery_area: s.deliveryArea,
    delivery_charge: charge(s.deliveryChargePence),
    second_attempt_fee: formatPrice(s.secondAttemptFeePence),
    lead_time_words: leadTimeWords(s.leadTimeDays),
    bespoke_lead_time_words: `${numberInWords(s.bespokeLeadTimeWeeks)} to ${numberInWords(s.bespokeLeadTimeWeeks + 1)} weeks`,
    bespoke_minimum: formatPrice(s.bespokeMinimumPence),
    kitchen_handles: listInWords(s.kitchenHandles),
    council: s.council,
    hygiene_rating: s.hygieneRating,
  };
}

const TOKEN = /\{([a-z_]+)\}/g;

/** Fills every known {placeholder}. An unknown one is an error, so a typo never reaches a customer. */
export function renderTemplate(
  text: string,
  values: Record<Placeholder, string>,
): string {
  return text.replace(TOKEN, (whole, key: string) => {
    if (!(PLACEHOLDERS as readonly string[]).includes(key))
      throw new Error(`Unknown placeholder ${whole}`);
    return values[key as Placeholder];
  });
}

/** The placeholders a text uses — for the admin editor's chips and to check a text before saving. */
export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(TOKEN)].map((m) => m[1]);
}
