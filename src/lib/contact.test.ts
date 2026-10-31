import { describe, expect, it } from "vitest";
import {
  CONTACT,
  CONTACT_COPY,
  contactEmail,
  contactFieldError,
  validateContact,
} from "./contact";

const good = {
  name: "Mairi Sinclair",
  email: "mairi@example.co.uk",
  phone: "",
  message: "A christening cake for March, about thirty people.",
};

describe("§7.4 / §10.8 contact form rules", () => {
  it("a filled form is clean: trimmed, phone in E.164 or null", () => {
    const r = validateContact({
      ...good,
      name: "  Mairi   Sinclair ",
      phone: "07884 199103",
    });
    expect(r).toEqual({
      ok: true,
      value: { ...good, phone: "+447884199103" },
    });
    expect(validateContact(good)).toMatchObject({
      ok: true,
      value: { phone: null },
    });
  });

  it("an empty form names every required field, in order", () => {
    const r = validateContact({ name: "", email: "", phone: "", message: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors)).toEqual(["name", "email", "message"]);
    expect(r.errors.name).toBe(CONTACT_COPY.nameMissing);
    expect(r.errors.email).toBe(CONTACT_COPY.emailMissing);
    expect(r.errors.message).toBe(CONTACT_COPY.messageMissing);
  });

  it("name: 2–80 characters", () => {
    expect(contactFieldError("name", "M")).toBe(CONTACT_COPY.nameShort);
    expect(contactFieldError("name", "Mo")).toBeNull();
    expect(contactFieldError("name", "a".repeat(80))).toBeNull();
    expect(contactFieldError("name", "a".repeat(81))).toBe(
      CONTACT_COPY.nameLong,
    );
    expect(contactFieldError("name", "   ")).toBe(CONTACT_COPY.nameMissing);
  });

  it("e-mail: the standard format (Figma state A copy)", () => {
    for (const bad of [
      "mairi@example",
      "mairi example.co.uk",
      "@example.co.uk",
      "mairi@.co.uk",
    ])
      expect(contactFieldError("email", bad), bad).toBe(
        CONTACT_COPY.emailInvalid,
      );
    expect(CONTACT_COPY.emailInvalid).toBe(
      "That does not look like a full email address.",
    );
    expect(
      contactFieldError("email", "mairi.s+cakes@example.co.uk"),
    ).toBeNull();
  });

  it("phone: optional, but a given one must be a number", () => {
    expect(contactFieldError("phone", "")).toBeNull();
    expect(contactFieldError("phone", "12345")).toBe(CONTACT_COPY.phoneInvalid);
    expect(contactFieldError("phone", "+353 85 123 4567")).toBeNull();
  });

  it("message: at most 400 characters as the customer counts them (an emoji is one)", () => {
    expect(contactFieldError("message", "a".repeat(400))).toBeNull();
    expect(contactFieldError("message", "a".repeat(401))).toBe(
      CONTACT_COPY.messageLong(401),
    );
    expect(contactFieldError("message", "🎂".repeat(400))).toBeNull();
    expect(CONTACT.messageMax).toBe(400);
  });

  it("the send-limit copy names the e-mail from Settings (§7.1)", () => {
    expect(CONTACT_COPY.tooMany("info@bakedbylinda.co.uk")).toBe(
      "Too many messages from this connection in the last hour — nothing was sent. Please try again later, or email info@bakedbylinda.co.uk.",
    );
  });
});

describe("§7.4 the e-mail to Linda", () => {
  it("from the website, Reply-To the customer, every field, the London time and the page", () => {
    const mail = contactEmail(
      { ...good, phone: "+447884199103" },
      "info@bakedbylinda.co.uk",
      new Date("2026-10-31T14:05:00Z"), // 2:05pm GMT
      "/contact",
    );
    expect(mail).toMatchObject({
      stream: "transactional",
      from: "Baked by Linda website",
      to: "info@bakedbylinda.co.uk",
      replyTo: "mairi@example.co.uk",
      subject: "Website message — Mairi Sinclair",
    });
    expect(mail.text).toContain("Phone: +447884199103");
    expect(mail.text).toContain(good.message);
    expect(mail.text).toContain(
      "Sent Saturday 31 October 2026, 2:05pm from /contact",
    );
  });

  it("summer time is London time too", () => {
    const mail = contactEmail(
      { ...good, phone: null },
      "x@y.z",
      new Date("2026-07-01T08:30:00Z"),
      "/contact",
    );
    expect(mail.text).toContain("Wednesday 1 July 2026, 9:30am");
    expect(mail.text).toContain("Phone: not given");
  });
});
