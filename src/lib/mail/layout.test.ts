import { describe, expect, it } from "vitest";
import { footerLines, renderEmail } from "./layout";
import { TEMPLATES } from "./templates";

const ctx = {
  business: {
    tradingName: "Baked by Linda",
    legalName: "Linda Dávid-Vágvölgyi",
    addressLine: "20 Church View",
    town: "Winchburgh",
    postcode: "EH52 6SZ",
    phone: "+44 7884 199103",
  },
  origin: "https://bakedbylinda.co.uk",
  signOff: "Linda",
};

describe("the e-mail frame (§8.4)", () => {
  const mail = renderEmail(TEMPLATES.sample({}), ctx);

  it("the plain-text part comes from the same blocks: rows as “label: value”, the button as “label: url”", () => {
    expect(mail.text).toContain("Your cake is next");
    expect(mail.text).toContain("Date: Saturday 12 September");
    expect(mail.text).toContain("[x] Booked — 31 August");
    expect(mail.text).toContain("[ ] Delivered");
    expect(mail.text).toContain(
      "Change something: https://bakedbylinda.co.uk/my-order/sample",
    );
    expect(mail.text).toContain("— Linda");
    expect(
      mail.text
        .trim()
        .endsWith("20 Church View, Winchburgh, EH52 6SZ · +44 7884 199103"),
    ).toBe(true);
    expect(mail.text).not.toMatch(/<[a-z]/i);
  });

  it("the footer from the business facts; the town in the header; the logo PNG with alt text and size", () => {
    expect(footerLines(ctx.business)[0]).toBe(
      "Baked by Linda is the trading name of Linda Dávid-Vágvölgyi, a sole trader in Scotland.",
    );
    expect(mail.html).toContain(">Winchburgh<");
    expect(mail.html).toContain(
      'src="https://bakedbylinda.co.uk/email/baked-by-linda-logo-email@2x.png" width="177" height="27" alt="Baked by Linda"',
    );
    expect(mail.html).toContain('href="tel:+447884199103"');
  });

  it("a hidden preheader first; light colour scheme; no tracking; values escaped", () => {
    expect(mail.html).toContain("Last chance to change anything — Thursday");
    expect(mail.html).toContain('<meta name="color-scheme" content="light">');
    expect(mail.html).not.toMatch(/<img[^>]+width="1"/);
    const odd = renderEmail(
      {
        subject: "x",
        preheader: "y",
        blocks: [{ kind: "para", text: "<b>Tom & Jerry</b>" }],
      },
      ctx,
    );
    expect(odd.html).toContain("&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;");
    expect(odd.text).toContain("<b>Tom & Jerry</b>");
  });
});
