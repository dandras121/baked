import { describe, expect, it } from "vitest";
import {
  attemptLine,
  cakeLine,
  changeNote,
  detailSubtitle,
  marketingLine,
  moneyLines,
  refundToday,
  shortReference,
  stripeHref,
  windowLabel,
} from "./order-detail";

describe("Order detail (§9.5)", () => {
  it("words the subtitle for an Owner; a Helper sees the name only", () => {
    const v = {
      name: "Mairi Sinclair",
      status: "confirmed",
      owner: true,
      totalPence: 28000,
      netPaidPence: 28000,
      last: { how: "Stripe", on: "2026-08-31" },
    };
    expect(detailSubtitle(v)).toBe(
      "Mairi Sinclair · paid in full · £280.00 · Stripe, 31 August",
    );
    expect(detailSubtitle({ ...v, netPaidPence: 8000 })).toBe(
      "Mairi Sinclair · £80.00 paid · £280.00 · Stripe, 31 August",
    );
    expect(detailSubtitle({ ...v, owner: false })).toBe("Mairi Sinclair");
  });
  it("writes a cake line with the message, “no message”, or nothing when the cake offers none", () => {
    const l = {
      sizeLine: "Two tiers · serves 24",
      flavour: "vanilla sponge",
      options: "",
      message: "Happy 30th, Mairi",
    };
    expect(cakeLine(l)).toBe(
      "Two tiers · serves 24 · vanilla sponge · “Happy 30th, Mairi”",
    );
    expect(cakeLine({ ...l, message: "" })).toBe(
      "Two tiers · serves 24 · vanilla sponge · no message",
    );
    expect(cakeLine({ ...l, message: null })).toBe(
      "Two tiers · serves 24 · vanilla sponge",
    );
  });
  it("lists the money: Paid in full, deposits, refunds, open links and Still to pay", () => {
    expect(
      moneyLines({
        totalPence: 28000,
        payments: [
          {
            kind: "checkout",
            pence: 28000,
            on: "2026-08-31",
            how: "Stripe",
            pi: "pi_123",
          },
        ],
        refunds: [],
        openLinks: [],
        stillToPayPence: 0,
      }).map((l) => `${l.label}: ${l.value}`),
    ).toEqual([
      "Paid in full: £280.00 · Stripe · 31 Aug",
      "Still to pay: £0.00",
    ]);
    expect(
      moneyLines({
        totalPence: 32000,
        payments: [
          { kind: "checkout", pence: 8000, on: "2026-09-01", how: "Stripe" },
        ],
        refunds: [
          { pence: 2000, on: "2026-09-03", status: "pending", kind: "change" },
        ],
        openLinks: [{ purpose: "rest", pence: 24000, sentOn: "2026-09-01" }],
        stillToPayPence: 26000,
      }).map((l) => `${l.label}: ${l.value}`),
    ).toEqual([
      "Deposit: £80.00 · Stripe · 1 Sep",
      "Refund: −£20.00 · Stripe · 3 Sep · pending",
      "Link: The rest · £240.00 · sent 1 Sep",
      "Still to pay: £260.00",
    ]);
  });
  it("shortens the reference and links Stripe", () => {
    expect(shortReference("pi_3Qx12345678KdA")).toBe("pi_3Qx…8KdA");
    expect(
      stripeHref({
        number: "BBL-2026-0147",
        cardPayments: ["pi_1"],
        live: false,
      }),
    ).toBe("https://dashboard.stripe.com/test/payments/pi_1");
    expect(
      stripeHref({
        number: "BBL-2026-0147",
        cardPayments: ["pi_1", "pi_2"],
        live: true,
      }),
    ).toBe("https://dashboard.stripe.com/search?query=BBL-2026-0147");
  });
  it("the refund if cancelled today follows the §10.1 tiers", () => {
    const base = {
      earliest: "2026-09-12",
      date: "2026-09-12",
      basisPence: 28000,
    };
    expect(refundToday({ ...base, today: "2026-09-01" }).line).toBe(
      "£280.00 refund if cancelled today",
    );
    expect(refundToday({ ...base, today: "2026-09-08" }).line).toBe(
      "£140.00 refund if cancelled today",
    );
    expect(refundToday({ ...base, today: "2026-09-12" }).line).toBe(
      "No refund if cancelled today",
    );
  });
  it("delivery attempts, window, marketing and the change note", () => {
    const a = {
      day: "2026-09-12",
      outcome: "nobody-in",
      choice: "redeliver",
      collectDay: null,
      feePaidPence: 1500,
    };
    expect(
      attemptLine(a, { day: "2026-09-13", deliveryWindow: "morning" }, true),
    ).toBe(
      "Nobody was in 12 Sep · chose redelivery 13 Sep, morning · £15.00 paid",
    );
    expect(
      attemptLine(a, { day: "2026-09-13", deliveryWindow: "morning" }, false),
    ).toBe("Nobody was in 12 Sep · chose redelivery 13 Sep, morning · paid");
    expect(attemptLine({ ...a, choice: "none" }, null, true)).toBe(
      "Nobody was in 12 Sep · no choice yet",
    );
    expect(attemptLine({ ...a, outcome: "none" }, null, true)).toBeNull();
    expect(windowLabel("morning")).toBe("Morning · 9am – 12pm");
    expect(marketingLine({ marketing: null })).toBe("No");
    expect(
      marketingLine({
        marketing: { wording: "x" },
        terms: { at: "2026-08-31T10:00:00Z" },
      }),
    ).toBe("Agreed 31 August 2026 · wording stored");
    expect(
      changeNote({
        kind: "catalogue",
        name: "Mairi Sinclair",
        date: "2026-09-12",
        today: "2026-09-01",
      }),
    ).toBe(
      "Mairi can change the date, size or message online until 23:59 on Thursday 10 September (two days before). After that, a message to you comes first. You can change anything at any time.",
    );
    expect(
      changeNote({
        kind: "manual",
        name: "Mairi Sinclair",
        date: "2026-09-12",
        today: "2026-09-01",
      }),
    ).toBe(
      "Mairi cannot change or cancel online — a message to you comes first.",
    );
  });
});
