import { describe, expect, it } from "vitest";
import { minutesLeft, PAY_COPY, walletClause } from "./pay-copy";

describe("§5.5 when a payment does not go through", () => {
  it("declined: says what did not happen, the date still held with the minutes, and the wallet on offer", () => {
    expect(
      PAY_COPY.declinedText(
        "Saturday 12 September",
        18 * 60_000,
        walletClause({ applePay: true }),
      ),
    ).toBe(
      "Nothing has been taken and Saturday 12 September is still held for 18 more minutes. Try another card, or use Apple Pay.",
    );
    expect(
      PAY_COPY.declinedText("Saturday 12 September", 30_000, walletClause({})),
    ).toBe(
      "Nothing has been taken and Saturday 12 September is still held for 1 more minute. Try another card.",
    );
  });
  it("the wallet clause names only what the device offers", () => {
    expect(walletClause({ googlePay: true })).toBe(", or use Google Pay");
    expect(walletClause({ applePay: true, googlePay: true })).toBe(
      ", or use Apple Pay or Google Pay",
    );
    expect(walletClause({})).toBe("");
  });
  it("not confirmed: nothing taken, the date still held", () => {
    expect(
      PAY_COPY.notConfirmedText("Saturday 12 September", 14 * 60_000),
    ).toBe(
      "The bank check was not completed, so nothing has been taken. Saturday 12 September is still held for 14 more minutes.",
    );
  });
  it("minutes left: none once the hold ran out", () => {
    expect(minutesLeft(0)).toBeNull();
    expect(minutesLeft(61_000)).toBe("2 more minutes");
  });
});
