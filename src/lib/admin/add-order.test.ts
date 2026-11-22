import { describe, expect, it } from "vitest";
import {
  checkAddOrder,
  dayLine,
  dayWarnings,
  EMPTY_FORM,
  emailHint,
  sizeLine,
} from "./add-order";

const ok = {
  ...EMPTY_FORM,
  name: "Mairi Sinclair",
  email: "mairi@example.co.uk",
  phone: "07700 900 000",
  date: "2027-06-20",
  address: "Hopetoun House",
  town: "South Queensferry",
  postcode: "eh30 9sl",
  window: "afternoon",
  what: "Three tiers, ivory buttercream, sugar peonies in dusty pink",
  serves: "100",
  tiers: "3",
  allergens: ["milk", "eggs", "cereals containing gluten"],
  total: "380",
  paid: "100",
  method: "cash",
};

describe("Add an order (§9.6)", () => {
  it("a full form gives the order to save", () => {
    const r = checkAddOrder(ok, "2026-11-22");
    expect(r.errors).toEqual({});
    expect(r.value).toMatchObject({
      phoneE164: "+447700900000",
      postcode: "EH30 9SL",
      serves: 100,
      tiers: 3,
      allergens: ["cereals containing gluten", "eggs", "milk"],
      totalPence: 38000,
      paidPence: 10000,
      method: "cash",
      customerEmails: true,
      collectionTime: null,
    });
  });
  it("says what is missing, field by field", () => {
    const r = checkAddOrder(
      { ...EMPTY_FORM, date: "2026-11-01" },
      "2026-11-22",
    );
    expect(Object.keys(r.errors).sort()).toEqual(
      [
        "address",
        "date",
        "email",
        "name",
        "postcode",
        "serves",
        "total",
        "what",
        "window",
      ].sort(),
    );
    expect(r.errors.date).toBe("Pick a day from today on.");
  });
  it("a collection, or customer e-mails off, needs a phone number", () => {
    const base = { ...ok, phone: "" };
    expect(
      checkAddOrder({ ...base, handover: "collection" }, "2026-11-22").errors
        .phone,
    ).toMatch(/A collection needs a phone/);
    expect(
      checkAddOrder({ ...base, emails: "off" }, "2026-11-22").errors.phone,
    ).toMatch(/so you can ring them/);
    expect(checkAddOrder(base, "2026-11-22").errors.phone).toBeUndefined();
  });
  it("money: £0 to £5,000; paid so far up to the total, with how it was paid", () => {
    expect(
      checkAddOrder({ ...ok, total: "5000.01" }, "2026-11-22").errors.total,
    ).toBeDefined();
    expect(
      checkAddOrder({ ...ok, paid: "400" }, "2026-11-22").errors.paid,
    ).toBe("That is more than the £380.00 total.");
    expect(
      checkAddOrder({ ...ok, method: "" }, "2026-11-22").errors.method,
    ).toBeDefined();
    expect(
      checkAddOrder({ ...ok, paid: "0", method: "" }, "2026-11-22").value
        ?.method,
    ).toBeNull();
  });
  it("the day's line and its calm warnings; one manual order counts one cake", () => {
    const d = { day: 2, dailyCap: 2, week: 9, weeklyCap: 9, closed: "holiday" };
    expect(dayLine({ ...d, day: 0, week: 3 })).toBe(
      "That day: 0 of 2 booked · that week: 3 of 9 booked",
    );
    expect(dayWarnings(d)).toEqual([
      "That day is closed — holiday — saving books it anyway.",
      "That day is full (2 of 2) — saving puts it at 3 of 2.",
      "That week is full (9 of 9) — saving puts it at 10 of 9.",
    ]);
    expect(dayWarnings({ ...d, day: 0, week: 0, closed: null })).toEqual([]);
  });
  it("size line and the e-mail hint", () => {
    expect(sizeLine(3, 100)).toBe("Three tiers · serves 100");
    expect(emailHint("")).toBe(
      "Ask the customer for an e-mail address — payment links and cancellations are sent by e-mail.",
    );
    expect(emailHint("Mairi Sinclair")).toMatch(/^Ask Mairi for/);
  });
});
