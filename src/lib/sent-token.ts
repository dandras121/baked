// “Message sent” is shown only straight after a send (§7.4). The send redirects to /contact/sent?t=<token>: the
// time of the send, signed, valid for 10 minutes. No cookie is set (§10.11 lists every cookie).
import { createHmac, timingSafeEqual } from "node:crypto";

const VALID_MS = 10 * 60 * 1000;

function secret() {
  return process.env.RATE_LIMIT_SALT || "bbl-development";
}

function sign(form: string, at: number) {
  return createHmac("sha256", secret())
    .update(`${form}:${at}`)
    .digest("base64url")
    .slice(0, 22);
}

export function sentToken(form: string, now = Date.now()): string {
  return `${now.toString(36)}.${sign(form, now)}`;
}

export function sentTokenValid(
  form: string,
  token: string | null,
  now = Date.now(),
): boolean {
  const [time, mac] = (token ?? "").split(".");
  const at = parseInt(time ?? "", 36);
  if (!mac || !Number.isFinite(at) || now - at > VALID_MS || at > now + 60_000)
    return false;
  const want = Buffer.from(sign(form, at));
  const got = Buffer.from(mac);
  return want.length === got.length && timingSafeEqual(want, got);
}
