import { describe, expect, it } from "vitest";
import {
  checkHand,
  handBackNote,
  handHint,
  removeQuestion,
} from "./hand-money";

const today = "2026-11-23";
const ok = { amount: "100", method: "cash" as const, date: today };

describe("Record a payment · Record a refund given back (§9.5)", () => {
  it("£0.01 up to the limit, Cash or Bank transfer, today or earlier", () => {
    expect(checkHand(ok, 26000, "payment", today).value).toEqual({
      pence: 10000,
      method: "cash",
      date: today,
    });
    expect(
      checkHand(
        { ...ok, amount: "0.01", date: "2026-09-12" },
        26000,
        "payment",
        today,
      ).value?.pence,
    ).toBe(1);
    expect(
      checkHand({ ...ok, amount: "£260" }, 26000, "payment", today).value
        ?.pence,
    ).toBe(26000);
  });

  it("says what is wrong, next to each field", () => {
    expect(
      checkHand({ ...ok, amount: "260.01" }, 26000, "payment", today).errors,
    ).toEqual({
      amount: "That is more than the £260.00 still to pay.",
    });
    expect(
      checkHand({ ...ok, amount: "93" }, 9250, "refund", today).errors,
    ).toEqual({
      amount: "That is more than the £92.50 still to give back.",
    });
    expect(
      checkHand(
        { amount: "0", method: "", date: "2026-11-24" },
        26000,
        "payment",
        today,
      ).errors,
    ).toEqual({
      amount: "Type an amount, for example 100 or 92.50.",
      method: "Choose Cash or Bank transfer.",
      date: "Pick today or an earlier day.",
    });
    expect(
      checkHand({ ...ok, date: "" }, 26000, "payment", today).errors,
    ).toEqual({ date: "Pick the day." });
  });

  it("writes the hints, the note and the Remove question", () => {
    expect(handHint("payment", 26000)).toBe(
      "Still to pay £260.00 — you can record up to this.",
    );
    expect(handHint("refund", 9250)).toBe("£92.50 still to give back by hand.");
    expect(handBackNote(true, 9250)).toBe(
      "It completes the cancellation refund. The Money flag “£92.50 to give back by hand” clears once the whole amount is recorded.",
    );
    expect(removeQuestion(10000, "cash", "9 Sep")).toBe(
      "Remove the £100.00 cash payment of 9 Sep?",
    );
    expect(removeQuestion(5000, "bank", "9 Sep")).toBe(
      "Remove the £50.00 bank transfer payment of 9 Sep?",
    );
  });
});
