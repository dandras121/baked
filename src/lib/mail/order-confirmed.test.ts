import { describe, expect, it } from "vitest";
import { renderEmail } from "./layout";
import { orderConfirmedEmail, SAMPLE_ORDER } from "./order-confirmed";

const origin = "https://bakedbylinda.co.uk";
const ctx = {
  business: {
    tradingName: "X",
    legalName: "Y",
    addressLine: "Z",
    town: "T",
    postcode: "P",
    phone: "0",
  },
  origin,
  signOff: "Linda",
};

describe("e-mail 1 · Order confirmed (§8.1, 1800:13257)", () => {
  it("subject and preview; one block per cake with flavour, size, message, options and what it contains", () => {
    const e = orderConfirmedEmail(SAMPLE_ORDER, origin);
    expect(e.subject).toBe("Your cake is booked — Saturday 12 September");
    expect(e.preheader).toBe(
      "Order BBL-2026-0147 · everything you need is in here",
    );
    const m = renderEmail(e, ctx);
    expect(m.text).toContain(
      "The Lothian\nFlavour: Vanilla sponge, raspberry conserve\nSize: Serves 24 · two tiers\nMessage: “Happy 30th, Mairi”\nOptions: Fresh flowers on top\nContains: Gluten (wheat), eggs and milk",
    );
    expect(m.text).toContain(
      "Thank you, Mairi. I have put Saturday 12 September in the diary",
    );
    expect(m.text).toContain("Delivery: Saturday 12 September, 9am – 12pm");
    expect(m.text).toContain("To: 48 Preston Road, Linlithgow EH49 6HH");
    expect(m.text).toContain("Paid: £185 · card · 31 August");
    expect(m.text).toContain("[x] Booked — 31 August");
    expect(m.text).toContain("[ ] In the kitchen — 11 September");
    expect(m.text).toContain("Cancel by Friday 4 September for a full refund");
    expect(m.text).toContain(`See your order: ${origin}/my-order/sample`);
    expect(m.text).toContain("no 14-day cancellation right");
    expect(m.text).toContain(
      "Attached: terms-2026-10-23.pdf · cancellations-2026-10-23.pdf — the versions you accepted.",
    );
  });

  it("the footer and key terms come from the facts kept with the order, not today's Settings", () => {
    const m = renderEmail(orderConfirmedEmail(SAMPLE_ORDER, origin), ctx);
    expect(m.text).toContain(
      "Baked by Linda is the trading name of Linda Dávid-Vágvölgyi, a sole trader in Scotland.",
    );
    expect(m.text).toContain(
      "Sold by Baked by Linda, the trading name of Linda Dávid-Vágvölgyi",
    );
    expect(m.text).not.toContain("X is the trading name of Y");
  });

  it("several cakes: “Your cakes are booked”; collection: where and when; no message, no options rows when none", () => {
    const e = orderConfirmedEmail(
      {
        ...SAMPLE_ORDER,
        handover: "collection",
        window: null,
        lines: [
          { ...SAMPLE_ORDER.lines[0], options: "", message: null },
          {
            ...SAMPLE_ORDER.lines[0],
            name: "Bramble & Cream",
            message: "",
            options: "",
          },
        ],
      },
      origin,
    );
    expect(e.subject).toBe("Your cakes are booked — Saturday 12 September");
    const m = renderEmail(e, ctx);
    expect(m.text).toContain(
      "Collection: Saturday 12 September, at a time we agree",
    );
    expect(m.text).toContain("Where: 20 Church View, Winchburgh");
    expect(m.text).toContain("[ ] Ready to collect — 12 September");
    expect(m.text).toContain(
      "Bramble & Cream\nFlavour: Vanilla sponge, raspberry conserve\nSize: Serves 24 · two tiers\nMessage: No message",
    );
    expect(m.text.split("Options:").length).toBe(1);
  });
});
