import { describe, expect, it } from "vitest";
import { ALERT_TITLES, ALERTS, SAMPLE_ALERTS, type AlertKind } from "./alerts";
import { renderEmail } from "./layout";

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
const build = <K extends AlertKind>(k: K) =>
  (ALERTS[k] as (v: unknown, o: string) => ReturnType<(typeof ALERTS)[K]>)(
    SAMPLE_ALERTS[k],
    origin,
  );

describe("§8.3 e-mails to Linda and system e-mails", () => {
  it("the drawn subjects (board 1800:13441)", () => {
    expect(build("new-enquiry").subject).toBe(
      "New enquiry BBL-2026-E-0312 — Birthday, Saturday 3 October",
    );
    expect(build("new-order").subject).toBe(
      "New order BBL-2026-0147 — Saturday 12 September, 1 cake, £185",
    );
    expect(build("customer-changed").subject).toBe(
      "Customer changed BBL-2026-0147 — size: serves 30",
    );
    expect(build("customer-cancelled").subject).toBe(
      "Customer cancelled BBL-2026-0147 — £185 back",
    );
    expect(build("paid").subject).toBe("Paid £55 — BBL-2026-0147");
    expect(build("delivery-choice").subject).toBe(
      "BBL-2026-0151: they will take redelivery on Sunday 13 September",
    );
    expect(build("check-payment").subject).toBe("Check this payment — £185");
    expect(build("refund-failed").subject).toBe(
      "Refund failed — BBL-2026-0147",
    );
    expect(build("email-bounced").subject).toBe(
      "E-mail bounced — Mairi Sinclair",
    );
    expect(build("dispute-opened").subject).toBe(
      "Payment disputed — BBL-2026-0147 — respond in Stripe by 2 October",
    );
    expect(build("dispute-closed").subject).toBe(
      "Dispute closed — BBL-2026-0147 — won",
    );
    expect(build("sign-in-code").subject).toBe(
      "Your Baked by Linda sign-in code: 419 270",
    );
    expect(build("team-invite").subject).toBe(
      "Linda has added you to Baked by Linda",
    );
  });

  it("plain: no logo, no picture, no footer, no sign-off; the link to act on", () => {
    for (const k of Object.keys(ALERT_TITLES) as AlertKind[]) {
      const r = renderEmail(build(k), ctx);
      expect(r.html).not.toContain("<img");
      expect(r.html).not.toContain("trading name");
      expect(r.text).not.toContain("— Linda");
    }
    expect(renderEmail(build("new-order"), ctx).text).toContain(
      `Open the order →: ${origin}/admin/orders/BBL-2026-0147`,
    );
    expect(renderEmail(build("check-payment"), ctx).text).toContain(
      `${origin}/admin/money`,
    );
  });

  it("the website message: from “Baked by Linda website”, every field, the page", () => {
    const e = build("website-message");
    expect(e.fromName).toBe("Baked by Linda website");
    const t = renderEmail(e, ctx).text;
    expect(t).toContain("Phone: 07700 900 000");
    expect(t).toContain("Could we move the delivery window to the afternoon?");
    expect(t).toContain("from /contact");
    expect(t).toContain(`${origin}/admin/messages/1`);
  });
});
