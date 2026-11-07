import { describe, expect, it } from "vitest";
import { londonInstant } from "./london-time";
import {
  answerMatches,
  checkKind,
  statusLinkValid,
  statusLinkValidUntil,
  unlockValid,
  unlockValue,
} from "./order-link";

describe("§10.5 the status link works until 23:59 on the 30th day after the date", () => {
  it("12 September → until 23:59 on 12 October (London)", () => {
    expect(statusLinkValidUntil("2026-09-12")).toEqual(
      londonInstant("2026-10-12", 23, 59, 59),
    );
    expect(
      statusLinkValid("2026-09-12", londonInstant("2026-10-12", 23, 59)),
    ).toBe(true);
    expect(
      statusLinkValid("2026-09-12", londonInstant("2026-10-13", 0, 0)),
    ).toBe(false);
  });
});

describe("§6.1 the second check", () => {
  const delivery = {
    handover: "delivery",
    postcode: "EH49 6HH",
    phone: "07700 900000",
  };
  const collection = {
    handover: "collection",
    postcode: null,
    phone: "+44 7700 900 358",
  };
  it("delivery asks the postcode, case and spaces ignored", () => {
    expect(checkKind("delivery")).toBe("postcode");
    expect(answerMatches(delivery, "eh496hh")).toBe(true);
    expect(answerMatches(delivery, " EH49  6HH ")).toBe(true);
    expect(answerMatches(delivery, "EH49 6HX")).toBe(false);
    expect(answerMatches({ ...delivery, postcode: null }, "")).toBe(false);
  });
  it("collection asks the last four digits of the phone, exactly four", () => {
    expect(checkKind("collection")).toBe("phone");
    expect(answerMatches(collection, "0358")).toBe(true);
    expect(answerMatches(collection, "358")).toBe(false);
    expect(answerMatches(collection, "90358")).toBe(false);
    expect(answerMatches(collection, "0359")).toBe(false);
  });
});

describe("§6.1 the unlock cookie: 24 hours, signed for that link only", () => {
  it("valid for its token, not another, not after 24 hours, not when altered", () => {
    const now = Date.now();
    const v = unlockValue("token-aaaaaaaaaaaaaaaaaaaaaaa", now);
    expect(unlockValid("token-aaaaaaaaaaaaaaaaaaaaaaa", v, now + 1000)).toBe(
      true,
    );
    expect(unlockValid("token-bbbbbbbbbbbbbbbbbbbbbbb", v, now)).toBe(false);
    expect(
      unlockValid("token-aaaaaaaaaaaaaaaaaaaaaaa", v, now + 24 * 3600_000 + 1),
    ).toBe(false);
    expect(unlockValid("token-aaaaaaaaaaaaaaaaaaaaaaa", `${v}x`, now)).toBe(
      false,
    );
    expect(unlockValid("token-aaaaaaaaaaaaaaaaaaaaaaa", undefined, now)).toBe(
      false,
    );
  });
});
