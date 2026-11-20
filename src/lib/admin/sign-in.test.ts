import { describe, expect, it } from "vitest";
import {
  codeDigits,
  codeHash,
  deviceName,
  newCode,
  newSessionId,
  sessionHash,
  SIGN_IN_COPY,
  spacedCode,
} from "./sign-in";

describe("sign in (§9.2)", () => {
  it("codes are six digits; pasted codes keep only the digits", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/);
    expect(codeDigits("419 270")).toBe("419270");
    expect(codeDigits("419-2701")).toBe("419270");
    expect(spacedCode("419270")).toBe("419 270");
  });

  it("keeps codes and session ids only as hashes, bound to the person", () => {
    expect(codeHash(1, "419270")).not.toBe(codeHash(2, "419270"));
    const { id, hash } = newSessionId();
    expect(id.length).toBeGreaterThan(40);
    expect(hash).toBe(sessionHash(id));
    expect(hash).not.toContain(id);
  });

  it("the words", () => {
    expect(SIGN_IN_COPY.wrong(4)).toBe(
      "That code is not right — 4 tries left.",
    );
    expect(SIGN_IN_COPY.wrong(1)).toBe("That code is not right — 1 try left.");
    expect(SIGN_IN_COPY.checkIntro("info@bakedbylinda.co.uk")).toBe(
      "I have sent a six-digit code to info@bakedbylinda.co.uk. It works for ten minutes.",
    );
  });

  it("names a device the way Signed-in devices shows it", () => {
    expect(
      deviceName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone");
    expect(
      deviceName(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toBe("Chrome on macOS");
  });
});
