// Today (§9.3): the rules that need no database — the order of the rows, the subtitle and the ready-written text.
import { WINDOWS } from "@/lib/handover";
import { numberInWords } from "@/lib/words";

export type TodayFlag =
  "check-day" | "change-waiting" | "no-choice" | "not-collected";

export const FLAG_LINES: Record<TodayFlag, string> = {
  "check-day": "Booked after its hold ran out — check the day",
  "change-waiting": "Change waiting for payment",
  "no-choice": "No choice yet — ring them",
  "not-collected": "Not collected yet — ring them",
};

const WINDOW_START: Record<string, number> = {
  morning: 9 * 60,
  afternoon: 12 * 60,
  evening: 16 * 60,
};

/** Minutes after midnight from a collection time as typed: “12 noon”, “14:30”, “2pm”, “2.30 pm”; else null. */
export function collectionMinutes(time: string | null): number | null {
  const t = (time ?? "").trim().toLowerCase();
  if (!t) return null;
  if (/^12\s*noon$|^noon$/.test(t)) return 12 * 60;
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (h > 23 || min > 59 || (!m[3] && !m[2] && h < 7)) return null;
  return h * 60 + min;
}

/** A row's start: the delivery window's start, or the collection time when it reads as a time; else null (last). */
export function startMinutes(r: {
  handover: "delivery" | "collection";
  window: string | null;
  collectionTime: string | null;
}) {
  return r.handover === "delivery"
    ? (WINDOW_START[r.window ?? ""] ?? null)
    : collectionMinutes(r.collectionTime);
}

/** “9am – 12pm” for a window; “12 noon” or “Collection” for a collection. */
export function whenLabel(r: {
  handover: "delivery" | "collection";
  window: string | null;
  collectionTime: string | null;
}) {
  if (r.handover === "delivery")
    return WINDOWS.find((w) => w.key === r.window)?.times ?? "Delivery";
  return r.collectionTime?.trim() || "Time not set";
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (n: number) => (n < 100 ? numberInWords(n) : String(n));

/**
 * “Three going out today · one collection · one payment still open” (each part left out when 0; the payment part only
 * for an Owner). The phone's shorter form: “Three going out · one collection · one payment open”.
 */
export function todaySubtitle(
  c: { out: number; collections: number; payments: number | null },
  short = false,
) {
  const parts = [
    c.out && `${words(c.out)} going out${short ? "" : " today"}`,
    c.collections &&
      `${words(c.collections)} ${c.collections === 1 ? "collection" : "collections"}`,
    c.payments &&
      `${words(c.payments)} ${c.payments === 1 ? "payment" : "payments"} ${short ? "open" : "still open"}`,
  ].filter(Boolean) as string[];
  return parts.length ? cap(parts.join(" · ")) : "";
}

/**
 * Send a text (§9.3, Admin / 20 1598:10472): always signed as Linda; delivery = first name + the booked window (Linda
 * narrows it before sending); collection = first name + the agreed time (else “today”) + the kitchen address.
 */
export function readyText(r: {
  name: string;
  handover: "delivery" | "collection";
  window: string | null;
  collectionTime: string | null;
  kitchen: string;
}) {
  const first = r.name.trim().split(/\s+/)[0] ?? "";
  if (r.handover === "delivery") {
    const times = WINDOWS.find((w) => w.key === r.window)?.times;
    const between = times ? times.replace(" – ", " and ") : null;
    return `Hi ${first}, it’s Linda from Baked by Linda. Your cake is coming today — I’ll be with you ${
      between ? `between ${between}` : "today"
    }. Any problem, just reply to this text.`;
  }
  const at = r.collectionTime?.trim();
  return `Hi ${first}, it’s Linda from Baked by Linda. Your cake is ready — see you ${
    at ? `at ${at}` : "today"
  } at ${r.kitchen}. Running late? Just reply to this text.`;
}

/** Only a mobile can take a text: a UK mobile (+447…) or any number from abroad (§10.8; Proposal). */
export const canText = (e164: string | null) =>
  !!e164 && (!e164.startsWith("+44") || e164.startsWith("+447"));

/** The `sms:` link that works on both iOS and Android (§9.3). */
export const smsHref = (e164: string, text: string) =>
  `sms:${e164}?&body=${encodeURIComponent(text)}`;
