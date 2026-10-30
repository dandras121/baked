import { describe, expect, it } from "vitest";
import {
  CONSENT_MAX_AGE_S,
  CONSENT_VERSION,
  consentCookie,
  isAnalyticsCookie,
  readConsent,
} from "./consent";

const now = new Date("2026-10-30T12:00:00Z");
const cookieValue = (s: string) => s.split(";")[0];

describe("§3.3 the bbl_consent cookie", () => {
  it("stores {v, analytics, ts} for 12 months, Secure, SameSite=Lax, whole site", () => {
    const c = consentCookie(true, now);
    expect(c).toMatch(/^bbl_consent=/);
    expect(c).toContain(`Max-Age=${365 * 24 * 3600}`);
    expect(c).toContain("Path=/");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    const json = JSON.parse(decodeURIComponent(cookieValue(c).split("=")[1]));
    expect(json).toEqual({
      v: 1,
      analytics: true,
      ts: "2026-10-30T12:00:00.000Z",
    });
  });

  it("reads back what it stores, among other cookies", () => {
    const header = `a=1; ${cookieValue(consentCookie(false, now))}; b=2`;
    expect(readConsent(header, now)).toEqual({
      analytics: false,
      ts: now.toISOString(),
    });
  });

  it("missing → no choice (the bar shows)", () => {
    expect(readConsent("", now)).toBeNull();
    expect(readConsent(undefined, now)).toBeNull();
    expect(readConsent("a=1", now)).toBeNull();
  });

  it("an older version → no choice (raising v re-shows the bar)", () => {
    const old = encodeURIComponent(
      JSON.stringify({
        v: CONSENT_VERSION - 1,
        analytics: true,
        ts: now.toISOString(),
      }),
    );
    expect(readConsent(`bbl_consent=${old}`, now)).toBeNull();
  });

  it("older than 12 months → no choice", () => {
    const stored = new Date(now.getTime() - CONSENT_MAX_AGE_S * 1000 - 1000);
    expect(
      readConsent(cookieValue(consentCookie(true, stored)), now),
    ).toBeNull();
    const fresh = new Date(now.getTime() - CONSENT_MAX_AGE_S * 1000 + 60_000);
    expect(
      readConsent(cookieValue(consentCookie(true, fresh)), now),
    ).not.toBeNull();
  });

  it("anything malformed → no choice", () => {
    expect(readConsent("bbl_consent=%7Bnope", now)).toBeNull();
    const wrong = encodeURIComponent(
      JSON.stringify({ v: 1, analytics: "yes", ts: now.toISOString() }),
    );
    expect(readConsent(`bbl_consent=${wrong}`, now)).toBeNull();
  });

  it("§10.11 analytics cookies are recognised for deletion; the essential ones are not", () => {
    expect(isAnalyticsCookie("_ga_ABC")).toBe(true);
    for (const name of [
      "bbl_consent",
      "bbl_session",
      "bbl_csrf",
      "__Host-bbl_admin",
      "__stripe_mid",
    ])
      expect(isAnalyticsCookie(name)).toBe(false);
  });
});
