// The status link (§6.1, §10.5): how long it works, what unlocks it, and the cookie that remembers the answer.
// The token is a random value stored with the order; the expiry is worked out here, never carried in the token.
import { createHmac, timingSafeEqual } from "node:crypto";
import { normalisePostcode } from "./handover";
import { addDays, londonInstant, type CalendarDate } from "./london-time";

/** Until 23:59 on the 30th day after the order's current date (a cancelled order keeps its date). */
export const statusLinkValidUntil = (date: CalendarDate) =>
  londonInstant(addDays(date, 30), 23, 59, 59);

export const statusLinkValid = (date: CalendarDate, now = new Date()) =>
  now.getTime() <= statusLinkValidUntil(date).getTime();

/** What the second check asks: the delivery postcode, or the last four digits of the phone (collection). */
export type CheckKind = "postcode" | "phone";
export const checkKind = (handover: string): CheckKind =>
  handover === "delivery" ? "postcode" : "phone";

const lastFour = (phone: string) => phone.replace(/\D/g, "").slice(-4);

/** Postcode: case and spaces ignored. Phone: exactly the last four digits. */
export function answerMatches(
  o: { handover: string; postcode: string | null; phone: string },
  answer: string,
): boolean {
  if (checkKind(o.handover) === "postcode") {
    const want = normalisePostcode(o.postcode ?? "").replace(/\s/g, "");
    return (
      want.length > 0 && normalisePostcode(answer).replace(/\s/g, "") === want
    );
  }
  const digits = answer.replace(/\s/g, "");
  return /^\d{4}$/.test(digits) && digits === lastFour(o.phone);
}

export const CHECK = {
  /** Wrong answers on one link before it locks, and for how long (§6.1). */
  perLink: 5,
  lockMs: 15 * 60 * 1000,
  /** Wrong answers per connection per hour, across all links. */
  perConnection: 20,
  /** The unlock cookie lasts 24 hours. */
  cookieMs: 24 * 60 * 60 * 1000,
} as const;

export const UNLOCK_COOKIE = "bbl_unlock";

function secret() {
  return process.env.RATE_LIMIT_SALT || "bbl-development";
}
const mac = (token: string, until: number) =>
  createHmac("sha256", secret())
    .update(`unlock:${token}:${until}`)
    .digest("base64url")
    .slice(0, 27);

/** The cookie value for a link: its own expiry and a signature over the token (scoped to the link's path). */
export function unlockValue(token: string, now = Date.now()): string {
  const until = now + CHECK.cookieMs;
  return `${until.toString(36)}.${mac(token, until)}`;
}

export function unlockValid(
  token: string,
  value: string | undefined,
  now = Date.now(),
): boolean {
  const [time, sig] = (value ?? "").split(".");
  const until = parseInt(time ?? "", 36);
  if (!sig || !Number.isFinite(until) || until < now) return false;
  const want = Buffer.from(mac(token, until));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Card copy (§6.1; the first state is not drawn, Proposal copy; A is `1199:9211`). */
export const LINK_COPY = {
  title: "Open your order",
  intro: {
    postcode:
      "To keep your details private, put in the postcode the cake is going to.",
    phone:
      "To keep your details private, put in the last four digits of the phone number you ordered with.",
  },
  label: {
    postcode: "Delivery postcode",
    phone: "Last four digits of your phone number",
  },
  open: "Open my order",
  retry: "Try again",
  wrongTitle: "Nothing has opened yet",
  wrong: {
    postcode: (phone: string) =>
      `This link only unlocks once the postcode matches the order on file. Check what you typed above, or call me on ${phone} and I’ll find your order for you.`,
    phone: (phone: string) =>
      `This link only unlocks once the last four digits match the phone number on the order. Check what you typed above, or call me on ${phone} and I’ll find your order for you.`,
  },
  locked: (phone: string) =>
    `Nothing has opened yet — too many tries. Wait 15 minutes, or call me on ${phone}.`,
  empty: {
    postcode: "Put in the delivery postcode first — nothing has opened yet.",
    phone: "Put in the last four digits first — nothing has opened yet.",
  },
  call: (phone: string) => `Call ${phone}`,
  expiredEyebrow: "This link has expired",
  expiredTitle: "Let me send you a new one",
  expiredText:
    "Order links work until 30 days after your date. Put in the e-mail you ordered with and, if you have an order still open, a fresh link arrives in a minute. For an older order, e-mail or call me.",
  emailLabel: "Email",
  send: "Send me a new link",
  /** Under the button in D (1037:9232). */
  noPassword: "No password and no account — the link is the key.",
  sentTitle: "New link sent",
  sentText: "Check your inbox — it usually arrives within a minute.",
  find: "Find my order",
  /** B “Too many requests” (1199:9227). */
  tooManyTitle: "Nothing new has been sent",
  tooManyAddress: (phone: string) =>
    `You’ve asked three times in the last hour, so a fourth won’t go out until it resets. If that address has an order, the link already in your inbox still opens it — or ring me on ${phone}.`,
  tooManyConnection: (phone: string) =>
    `There have been too many requests from this connection in the last hour — try again later, or ring me on ${phone}.`,
  emailInvalid: "Put in the e-mail you ordered with — nothing was sent.",
} as const;
