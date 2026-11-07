import { describe, expect, it } from "vitest";
import {
  cancelledEmail,
  changeSavedEmail,
  complaintEmail,
  enquiryReceivedEmail,
  missedYouEmail,
  orderLinkEmail,
  payLinkEmail,
  SAMPLE_CANCELLED,
  SAMPLE_CHANGE,
  SAMPLE_COMPLAINT,
  SAMPLE_ENQUIRY,
  SAMPLE_LINK,
  SAMPLE_MISSED,
  SAMPLE_PAY,
  SAMPLE_THANKS,
  SAMPLE_YEAR,
  thankYouEmail,
  yearLaterEmail,
} from "./after-emails";
import { renderEmail, type Email } from "./layout";

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
const text = (e: Email) => renderEmail(e, ctx).text;

describe("e-mail 5 · A year later (§8.1, §8.4 Unsubscribe)", () => {
  it("carries the one-click unsubscribe headers, the generated sentence, the note and the review link", () => {
    const e = yearLaterEmail(SAMPLE_YEAR(origin), origin);
    expect(e.subject).toBe("Is it nearly that time again?");
    expect(e.preheader).toBe(
      "A year since Mairi’s cake — no rush, just so I am on your list",
    );
    expect(e.headers).toEqual({
      "List-Unsubscribe": `<${origin}/unsubscribe/sample>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(e.hero?.alt).toBe("Last year’s cake for Mairi");
    const t = text(e);
    expect(t).toContain(
      "This time last year I made The Lothian for Mairi. If there is another one coming up",
    );
    expect(t).toContain(
      "Five days for a ready-made design, three to four weeks for something bespoke.",
    );
    expect(t).toContain("Did you enjoy it? Leave a Google review →");
    expect(t).toContain(`Stop these emails: ${origin}/unsubscribe/sample`);
    expect(t).toContain("A year ago today");
  });

  it("late: “A year ago”; no who-for: “your celebration”; no tiles and no Place ID: both left out", () => {
    const e = yearLaterEmail(
      {
        ...SAMPLE_YEAR(origin),
        late: true,
        forWho: null,
        tiles: [],
        reviewHref: null,
      },
      origin,
    );
    const t = text(e);
    expect(t).toContain("A year ago\n");
    expect(t).toContain("for your celebration.");
    expect(t).not.toContain("A few that are new this year");
    expect(t).not.toContain("Google");
  });
});

describe("e-mail 6 · Enquiry received", () => {
  it("never repeats free text, greets without a name; call-me and gaps versions", () => {
    const t = text(enquiryReceivedEmail(SAMPLE_ENQUIRY, origin));
    expect(t).toContain("Hello, here is what you asked for");
    expect(t).toContain("I will reply within 24 hours.");
    expect(t).toContain("Pictures: 2 attached");
    expect(t).not.toContain("Mairi");
    const c = text(
      enquiryReceivedEmail(
        { ...SAMPLE_ENQUIRY, callMe: true, withGaps: true },
        origin,
      ),
    );
    expect(c).toContain("I will ring you within 24 hours to talk it through.");
    expect(c).toContain(
      "A few answers were left open — I will ask when we talk.",
    );
  });
});

describe("e-mail 8 · Cancelled (variants)", () => {
  it("full refund to the card: subject with the amount, the bank line and the refund steps", () => {
    const e = cancelledEmail(SAMPLE_CANCELLED, origin);
    expect(e.subject).toBe("Your order is cancelled — £185 on its way back");
    expect(e.preheader).toBe("BBL-2026-0147 · refunded in full");
    const t = text(e);
    expect(t).toContain("Most banks show it within 5–10 working days.");
    expect(t).toContain("Refund: £185, in full");
    expect(t).toContain("[ ] Back with your bank — Within 5–10 working days");
    expect(t).toContain("See the designs");
  });
  it("half, counted from the earliest date", () => {
    const e = cancelledEmail(
      {
        ...SAMPLE_CANCELLED,
        tier: "half",
        cardPence: 9250,
        earliestDiffers: true,
      },
      origin,
    );
    expect(e.preheader).toBe("BBL-2026-0147 · half refunded");
    expect(text(e)).toContain(
      "£92.50 on its way back — half, as it was inside seven days of the earliest date your order has had.",
    );
  });
  it("none: no amount, no Refund / To rows, no timeline", () => {
    const e = cancelledEmail(
      { ...SAMPLE_CANCELLED, tier: "none", cardPence: 0 },
      origin,
    );
    expect(e.subject).toBe("Your order is cancelled");
    const t = text(e);
    expect(t).not.toContain("Refund:");
    expect(t).not.toContain("Back with your bank");
  });
  it("card and by hand: two lines, total in the subject; cash only: no timeline, no bank line", () => {
    const both = cancelledEmail(
      { ...SAMPLE_CANCELLED, tier: "own", cardPence: 10000, handPence: 5000 },
      origin,
    );
    expect(both.subject).toBe("Your order is cancelled — £150 on its way back");
    expect(both.preheader).toBe("BBL-2026-0147 · £150 refunded");
    expect(text(both)).toContain(
      "£100 back to your card · £50 I will give back by hand.",
    );
    const cash = text(
      cancelledEmail(
        {
          ...SAMPLE_CANCELLED,
          tier: "own",
          cardPence: 0,
          handPence: 5000,
          manual: true,
        },
        origin,
      ),
    );
    expect(cash).toContain("I will return £50 the way you paid.");
    expect(cash).not.toContain("Most banks");
    expect(cash).not.toContain("See the designs");
  });
  it("by Linda: her intro, no “book it again” line", () => {
    const t = text(
      cancelledEmail({ ...SAMPLE_CANCELLED, byLinda: true }, origin),
    );
    expect(t).toContain("I have had to cancel your order");
    expect(t).not.toContain("book it again");
  });
});

describe("e-mail 12 · Your change is saved", () => {
  it("up: paid today, the new total after the change, the money row last", () => {
    const e = changeSavedEmail(SAMPLE_CHANGE, origin);
    expect(e.subject).toBe("Your change is saved — £55 paid today");
    expect(e.preheader).toBe("BBL-2026-0163 · size updated to serves 32");
    const t = text(e);
    expect(t).toContain("What changed: Size — serves 24 → serves 32");
    expect(t).toContain("New total: £240");
    expect(t).toContain("Charged to your card today: £55");
  });
  it("down, none; “Staying the same” left out past three changes; the new deadline after a date change", () => {
    expect(
      changeSavedEmail(
        { ...SAMPLE_CHANGE, money: { kind: "down", pence: 5500 } },
        origin,
      ).subject,
    ).toBe("Your change is saved — £55 on its way back");
    const many = text(
      changeSavedEmail(
        {
          ...SAMPLE_CHANGE,
          money: { kind: "none", pence: 0 },
          changes: [
            ["Size", "a", "b"],
            ["Message", "c", "d"],
            ["Date", "e", "f"],
            ["Window", "g", "h"],
          ],
          newDeadline: "2026-09-18",
        },
        origin,
      ),
    );
    expect(many).not.toContain("Staying the same");
    expect(many).toContain(
      "You can change or cancel online until 23:59 on Friday 18 September.",
    );
  });
});

describe("e-mail 13 · I missed you", () => {
  it("the time word follows the window; late: tomorrow before 12 noon; no redelivery: one button", () => {
    const e = missedYouEmail({ ...SAMPLE_MISSED, window: "evening" }, origin);
    expect(e.subject).toBe("I missed you this evening — your cake is safe");
    expect(e.preheader).toBe(
      "BBL-2026-0171 · free collection or £15 redelivery",
    );
    const late = text(missedYouEmail({ ...SAMPLE_MISSED, late: true }, origin));
    expect(late).toContain(
      "Collect it free from Winchburgh tomorrow before 12 noon, or I can bring it back tomorrow for £15",
    );
    expect(late).toContain(
      "Collect it tomorrow — free: https://bakedbylinda.co.uk/delivery/sample?choice=collect",
    );
    const one = text(
      missedYouEmail({ ...SAMPLE_MISSED, redeliveryOffered: false }, origin),
    );
    expect(one).not.toContain("Redeliver");
  });
});

describe("e-mail 15 · Pay for your cake", () => {
  it("each kind has its subject; the waiting change has the Until it’s paid box", () => {
    expect(payLinkEmail(SAMPLE_PAY, origin).subject).toBe(
      "One step left — £55 to finish your change",
    );
    expect(text(payLinkEmail(SAMPLE_PAY, origin))).toContain("Until it’s paid");
    const s = (kind: typeof SAMPLE_PAY.kind) =>
      payLinkEmail({ ...SAMPLE_PAY, kind }, origin);
    expect(s("deposit").subject).toBe("Your deposit for Saturday 12 September");
    expect(s("rest").subject).toBe("The rest for your cake");
    expect(s("difference").subject).toBe("£55 for your cake");
    expect(s("redelivery").subject).toBe(
      "Your redelivery on Saturday 12 September — £55",
    );
    expect(s("rest").preheader).toBe("BBL-2026-0147 · a secure link to pay");
    expect(text(s("rest"))).toContain(`Pay £55: ${origin}/pay/sample`);
    expect(
      text(payLinkEmail({ ...SAMPLE_PAY, confirmationFollows: false }, origin)),
    ).not.toContain("you’ll get a confirmation");
  });
});

describe("e-mails 16, 17, 18", () => {
  it("16: one or several links", () => {
    expect(orderLinkEmail(SAMPLE_LINK, origin).subject).toBe(
      "Your link to order BBL-2026-0147",
    );
    const two = orderLinkEmail(
      {
        ...SAMPLE_LINK,
        orders: [
          ...SAMPLE_LINK.orders,
          { ...SAMPLE_LINK.orders[0], number: "BBL-2026-0150" },
        ],
      },
      origin,
    );
    expect(two.subject).toBe("Your order links");
    expect(text(two)).toContain(
      "If it wasn’t you, ignore it — nothing changes.",
    );
  });
  it("17: the reference, the order, the time; nothing the customer wrote", () => {
    const e = complaintEmail(SAMPLE_COMPLAINT("+44 7884 199103"));
    expect(e.subject).toBe("Complaint received — BBL-2026-C-0004");
    expect(text(e)).toContain("Sent: Monday 14 September, 6:42pm");
    expect(
      text(complaintEmail({ ...SAMPLE_COMPLAINT("x"), orderNumber: null })),
    ).not.toContain("Order:");
  });
  it("18: the same to everyone — no “were you happy?”, no reward, an opt-out at the foot", () => {
    const e = thankYouEmail(SAMPLE_THANKS(origin), origin);
    expect(e.subject).toBe("Thank you, Mairi — I hope it went down well");
    const t = text(e);
    expect(t).toContain("I hope The Lothian went down well on Saturday.");
    expect(t).not.toMatch(/discount|reward|happy\?/i);
    expect(t).toContain(
      `Turn them off with one click.: ${origin}/unsubscribe/sample?list=thanks`,
    );
    expect(t.indexOf("— Linda")).toBeLessThan(t.indexOf("No more thank-you"));
  });
});
