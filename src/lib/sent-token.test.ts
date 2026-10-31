import { describe, expect, it } from "vitest";
import { sentToken, sentTokenValid } from "./sent-token";

describe("§7.4 Message sent only straight after a send", () => {
  const t = Date.UTC(2026, 9, 31, 12);
  it("valid for 10 minutes, for its own form only", () => {
    const token = sentToken("contact", t);
    expect(sentTokenValid("contact", token, t + 60_000)).toBe(true);
    expect(sentTokenValid("contact", token, t + 10 * 60_000 + 1)).toBe(false);
    expect(sentTokenValid("bespoke", token, t + 60_000)).toBe(false);
  });
  it("missing, made up or changed: not valid", () => {
    expect(sentTokenValid("contact", null, t)).toBe(false);
    expect(sentTokenValid("contact", "abc", t)).toBe(false);
    const [time, mac] = sentToken("contact", t).split(".");
    expect(sentTokenValid("contact", `${(t + 1).toString(36)}.${mac}`, t)).toBe(
      false,
    );
    expect(sentTokenValid("contact", `${time}.${mac.slice(1)}x`, t)).toBe(
      false,
    );
  });
});
