import { describe, expect, it } from "vitest";
import {
  collectionDayEmail,
  dailyListEmail,
  onTheDayEmail,
  SAMPLE_LIST,
  SAMPLE_TODAY,
  twoDaysBeforeEmail,
} from "./day-emails";
import { renderEmail } from "./layout";
import { SAMPLE_ORDER } from "./order-confirmed";

const origin = "https://bakedbylinda.co.uk";
const ctx = {
  business: {
    tradingName: "Baked by Linda",
    legalName: "L",
    addressLine: "20 Church View, Winchburgh",
    town: "Winchburgh",
    postcode: "EH52 6SZ",
    phone: "+44 7884 199103",
  },
  origin,
  signOff: "Linda",
};
const text = (e: Parameters<typeof renderEmail>[0]) => renderEmail(e, ctx).text;

describe("e-mails 2, 3, 3b, 4 (§8.1, Appendix A.2)", () => {
  it("2 · two days before: the weekday, “today”, the change link; Booked and In the kitchen filled", () => {
    const e = twoDaysBeforeEmail(SAMPLE_ORDER, SAMPLE_TODAY, origin);
    expect(e.subject).toBe("Your cake is being made for Saturday");
    expect(e.preheader).toBe("Last chance to change anything — today");
    const t = text(e);
    expect(t).toContain("today is the last day to change anything");
    expect(t).toContain("Allergies noted: No nuts");
    expect(t).toContain("[x] In the kitchen — 11 September");
    expect(t).toContain("[ ] With you — 12 September, 9am – 12pm");
    expect(t).toContain("[ ] Delivered");
    expect(t).toContain(
      "After today the size, message, date and window are fixed.",
    );
    expect(t).toContain(`Change something: ${origin}/my-order/sample/change`);
  });

  it("3 · on the day: the window in the subject; setting off from the window; my number from Settings", () => {
    const e = onTheDayEmail(
      { ...SAMPLE_ORDER, window: "evening" },
      SAMPLE_TODAY,
      origin,
    );
    expect(e.subject).toBe("Today — your cake arrives between 4 and 7pm");
    const t = text(e);
    expect(t).toContain("I am setting off this afternoon");
    expect(t).toContain("My number: +44 7884 199103");
    expect(t).toContain("[x] With you");
    expect(t).toContain("Keep your phone to hand — I text you when I set off.");
  });

  it("3b · collection: the agreed time, where from Settings, Ready to collect filled", () => {
    const e = collectionDayEmail(
      { ...SAMPLE_ORDER, handover: "collection", window: null },
      SAMPLE_TODAY,
      origin,
    );
    expect(e.subject).toBe("Today — ready to collect at the time we agreed");
    expect(e.preheader).toBe("20 Church View, Winchburgh");
    const t = text(e);
    expect(t).toContain(
      "[x] Ready to collect — 12 September, at the agreed time",
    );
    expect(t).toContain("[ ] Collected");
    expect(t).toContain("Bring a flat boot space");
  });

  it("4 · daily list: cakes out; each handover with mark and text links; “to ring” when only collections are left", () => {
    const e = dailyListEmail(SAMPLE_LIST, origin);
    expect(e.subject).toBe("Today: 3 cakes out");
    const t = text(e);
    expect(t).toContain("Three going out today.");
    expect(t).toContain("9am – 12pm · Mairi Sinclair · 07700 900 000");
    expect(t).toContain(
      `Mark as handed over →: ${origin}/admin/orders/BBL-2026-0147`,
    );
    expect(t).toContain("Send a text →: sms:+447700900000");
    expect(t).toContain("Forget to tap? Nothing breaks");
    const ring = dailyListEmail(
      {
        date: "2026-09-13",
        handovers: [],
        notCollected: [SAMPLE_LIST.handovers[1]],
      },
      origin,
    );
    expect(ring.subject).toBe("Today: 1 to ring");
    expect(text(ring)).toContain("Not collected yet · Callum Reid");
  });
});
