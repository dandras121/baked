// Sign in (§9.2): the rules that need no database — the code, its hash, the session id and the words on the page.
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

export const SIGN_IN = {
  codeMinutes: 10,
  tries: 5,
  sessionDays: 30,
  /** “During its last 24 hours a quiet line … reads ‘Your sign-in ends …’”. */
  warnHours: 24,
  /** Code requests per hour: per address from one connection, per address in all, per connection (§9.2). */
  perAddressAndIp: 5,
  perAddress: 10,
  perIp: 20,
  cookie: "__Host-bbl_admin",
} as const;

export const SIGN_IN_COPY = {
  title: "Sign in",
  intro:
    "Your email address — I will send a six-digit code. There is no password to forget.",
  send: "Send me a code",
  checkTitle: "Check your email",
  checkIntro: (email: string) =>
    `I have sent a six-digit code to ${email}. It works for ten minutes.`,
  signIn: "Sign in",
  resend: "Resend the code",
  restart: "Wrong address? Start again",
  whyTitle: "Why there is no password",
  why: "A code sent to your inbox is harder to lose than a password and cannot be guessed. The session lasts thirty days on a device you trust.",
  emailMissing: "Please give your email address.",
  emailInvalid: "That does not look like a full email address.",
  tooMany: "Too many codes asked for — try again in an hour.",
  wrong: (left: number) =>
    `That code is not right — ${left === 1 ? "1 try" : `${left} tries`} left.`,
  usedUp: "That code is used up. Nothing has been signed in.",
  newCode: "Send me a new code",
  expired: "That code has run out.",
  incomplete: "Please type all six digits.",
  again: "For safety, please sign in again.",
  owner: "That page is for the owner.",
  failed: "Nothing was sent — please try again.",
} as const;

/** Six digits, every value equally likely. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** “419 270”, as the code e-mail shows it. */
export const spacedCode = (code: string) =>
  `${code.slice(0, 3)} ${code.slice(3)}`;

function secret() {
  return process.env.RATE_LIMIT_SALT || "bbl-development";
}

/** Codes are stored only as a keyed hash, bound to the person, so a leaked table gives nothing away. */
export function codeHash(memberId: number, code: string) {
  return createHmac("sha256", secret())
    .update(`sign-in:${memberId}:${code}`)
    .digest("hex");
}

/** A new session id for the cookie, and the hash the server keeps. */
export function newSessionId() {
  const id = randomBytes(32).toString("base64url");
  return { id, hash: sessionHash(id) };
}

export const sessionHash = (id: string) =>
  createHash("sha256").update(id).digest("hex");

/** Only digits, at most six (a pasted “419 270” or “419-270” fills all six boxes). */
export const codeDigits = (typed: string) =>
  typed.replace(/\D/g, "").slice(0, 6);

/** “Chrome on macOS” from a user agent, for Signed-in devices (§9.15). */
export function deviceName(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "A browser";
  const os = /iPhone|iPad/.test(ua)
    ? /iPad/.test(ua)
      ? "iPad"
      : "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}
