// Phone numbers (SITE-FLOWS §10.8): any UK number, or an international one with its country code; stored in E.164.
import { parsePhoneNumberFromString } from "libphonenumber-js/min";

/**
 * Ofcom's mobile range for drama and examples (07700 900000–900999): not in the numbering plan, but it is the
 * number the site itself shows as an example (“like 07700 900 000”), so it is accepted.
 */
const OFCOM_DRAMA = /^\+447700900\d{3}$/;

/** The number in E.164 (“+447700900123”), or null when it is not a valid UK or international number. */
export function toE164(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  // “00” is the international prefix written out (00353 …).
  const normalised = text.replace(/^00(?=[1-9])/, "+");
  const parsed = parsePhoneNumberFromString(normalised, "GB");
  if (!parsed) return null;
  if (parsed.isValid() || OFCOM_DRAMA.test(parsed.number)) return parsed.number;
  return null;
}
