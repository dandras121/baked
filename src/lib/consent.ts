// The cookie choice (SITE-FLOWS §3.3, §10.11): a first-party cookie bbl_consent =
// {"v":1,"analytics":true|false,"ts":"<ISO time>"}, 12 months, Secure; SameSite=Lax.
// Missing, expired or an older version → the bar shows again. Raise the version whenever the
// list of cookies changes.

export const CONSENT_COOKIE = "bbl_consent";
export const CONSENT_VERSION = 1;
/** 12 months (the Cookie policy, 664:4570). */
export const CONSENT_MAX_AGE_S = 365 * 24 * 60 * 60;

export type Consent = { analytics: boolean; ts: string };

/** Reads the choice from a cookie header (document.cookie or the request's Cookie header). */
export function readConsent(
  cookieHeader: string | null | undefined,
  now: Date = new Date(),
): Consent | null {
  if (!cookieHeader) return null;
  const raw = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as {
      v?: unknown;
      analytics?: unknown;
      ts?: unknown;
    };
    if (value.v !== CONSENT_VERSION) return null;
    if (typeof value.analytics !== "boolean" || typeof value.ts !== "string")
      return null;
    const age = now.getTime() - Date.parse(value.ts);
    if (!Number.isFinite(age) || age > CONSENT_MAX_AGE_S * 1000) return null;
    return { analytics: value.analytics, ts: value.ts };
  } catch {
    return null;
  }
}

/** The Set-Cookie / document.cookie string that stores a choice. */
export function consentCookie(analytics: boolean, now: Date = new Date()) {
  const value = encodeURIComponent(
    JSON.stringify({ v: CONSENT_VERSION, analytics, ts: now.toISOString() }),
  );
  return `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_S}; Path=/; Secure; SameSite=Lax`;
}

/**
 * Cookie names an analytics provider may have set. No provider is chosen yet (§14.1), so nothing ever
 * sets them; withdrawing consent still deletes any of these at once, without a reload (§3.3).
 */
export const ANALYTICS_COOKIE_PREFIXES = [
  "_ga",
  "_gid",
  "_gat",
  "_pk_",
  "_hj",
  "plausible",
];

export const isAnalyticsCookie = (name: string) =>
  ANALYTICS_COOKIE_PREFIXES.some((p) => name.startsWith(p));
