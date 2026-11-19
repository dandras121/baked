import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EMPTY_ENQUIRY } from "@/lib/bespoke";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { enquiryByToken, saveEnquiry } from "./enquiry-repo";
import { enquiries, mailSends, referenceCounters } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const today = "2026-11-08";
const enquiry = {
  ...EMPTY_ENQUIRY,
  occasion: "Wedding",
  date: "2027-06-20",
  servings: "70 – 120",
  budget: "£400 – 600",
  name: "Mairi Sinclair",
  email: "mairi@example.co.uk",
  callMe: true,
  phone: "07700 900 000",
};

describe.skipIf(!url)("database: bespoke enquiries (§7.1)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(enquiries);
    await db().delete(referenceCounters);
  });
  afterAll(async () => {
    await db().delete(enquiries);
    await db().delete(mailSends);
    await conn?.close();
  });

  it("numbers enquiries BBL-YYYY-E-NNNN; the same form key returns the same reference", async () => {
    const key = crypto.randomUUID();
    const a = await saveEnquiry(
      db(),
      { enquiry, inspiredId: null, formKey: key, spam: false },
      today,
    );
    const again = await saveEnquiry(
      db(),
      { enquiry, inspiredId: null, formKey: key, spam: false },
      today,
    );
    const b = await saveEnquiry(
      db(),
      { enquiry, inspiredId: null, formKey: crypto.randomUUID(), spam: false },
      today,
    );
    expect(a.reference).toBe("BBL-2026-E-0001");
    expect(again.reference).toBe(a.reference);
    expect(b.reference).toBe("BBL-2026-E-0002");
    expect(await db().select().from(enquiries)).toHaveLength(2);
  });

  it("keeps the answers and contact apart, marks gaps and a call, and tells Linda", async () => {
    const r = await saveEnquiry(
      db(),
      {
        enquiry,
        inspiredId: 999999,
        formKey: crypto.randomUUID(),
        spam: false,
      },
      today,
    );
    const [row] = await db()
      .select()
      .from(enquiries)
      .where(eq(enquiries.reference, r.reference));
    expect(row).toMatchObject({
      status: "new",
      withGaps: true,
      callMe: true,
      phone: "+447700900000",
      inspiredPhotoId: null,
    });
    expect(row.answers).toMatchObject({
      occasion: "Wedding",
      servings: "70 – 120",
    });
    expect(row.answers).not.toHaveProperty("email");
    const [mail] = await db().select().from(mailSends);
    expect(mail).toMatchObject({
      template: "alert",
      replyTo: "mairi@example.co.uk",
    });
    expect(mail.data).toMatchObject({
      kind: "new-enquiry",
      view: {
        reference: r.reference,
        occasion: "Wedding",
        detail:
          "Serves 70 – 120 · budget £400 – 600 · they would like a phone call. When: Sunday 20 June 2027.",
      },
    });
  });

  it("a filled honeypot is kept as possible spam and nothing is e-mailed", async () => {
    await saveEnquiry(
      db(),
      { enquiry, inspiredId: null, formKey: crypto.randomUUID(), spam: true },
      today,
    );
    const rows = await db()
      .select()
      .from(enquiries)
      .where(like(enquiries.reference, "BBL-2026-E-%"));
    expect(rows[0].status).toBe("spam");
    expect(await db().select().from(mailSends)).toHaveLength(0);
  });

  it("e-mail 6 goes to the customer with the chosen answers only, once per reference (§8.2 row 6)", async () => {
    const r = await saveEnquiry(
      db(),
      {
        enquiry: {
          ...enquiry,
          venue: "Hopetoun House",
          anything: "Sugar peonies",
        },
        inspiredId: null,
        formKey: crypto.randomUUID(),
        spam: false,
      },
      today,
    );
    const mails = await db().select().from(mailSends);
    const six = mails.find((m) => m.template === "enquiry-received")!;
    expect(six).toMatchObject({
      to: "mairi@example.co.uk",
      key: `enquiry:${r.reference}:6`,
    });
    const view = (
      six.data as {
        view: {
          rows: [string, string][];
          token: string;
          callMe: boolean;
          withGaps: boolean;
        };
      }
    ).view;
    expect(view).toMatchObject({
      token: r.token,
      callMe: true,
      withGaps: true,
    });
    expect(view.rows).toEqual([
      ["Occasion", "Wedding"],
      ["Servings", "70 – 120"],
      ["Date", "Sunday 20 June 2027"],
      ["Where", "Not answered"],
      ["Budget", "£400 – 600"],
      ["Finish", "Not answered"],
      ["Flavour", "Not answered"],
      ["Dietary", "Not answered"],
      ["Pictures", "None"],
      ["How to reach you", "A phone call"],
    ]);
    // Free text never travels in the e-mail.
    expect(JSON.stringify(six.data)).not.toMatch(
      /Hopetoun|peonies|07700|Mairi/,
    );
  });

  it("no e-mail address, no e-mail 6", async () => {
    await saveEnquiry(
      db(),
      {
        enquiry: { ...enquiry, email: "" },
        inspiredId: null,
        formKey: crypto.randomUUID(),
        spam: false,
      },
      today,
    );
    const mails = await db().select().from(mailSends);
    expect(mails.map((m) => m.template)).toEqual(["alert"]);
  });

  it("Your enquiry opens for 12 months from sending; spam and unknown tokens never", async () => {
    const sentAt = new Date("2026-11-08T12:00:00Z");
    const r = await saveEnquiry(
      db(),
      { enquiry, inspiredId: null, formKey: crypto.randomUUID(), spam: false },
      today,
      sentAt,
    );
    expect(
      await enquiryByToken(db(), r.token, new Date("2027-11-08T11:59:00Z")),
    ).toMatchObject({
      reference: r.reference,
      pictures: 0,
      inspired: null,
    });
    expect(
      await enquiryByToken(db(), r.token, new Date("2027-11-08T12:00:00Z")),
    ).toBeNull();
    expect(await enquiryByToken(db(), "x".repeat(32), sentAt)).toBeNull();
    const spam = await saveEnquiry(
      db(),
      { enquiry, inspiredId: null, formKey: crypto.randomUUID(), spam: true },
      today,
      sentAt,
    );
    expect(await enquiryByToken(db(), spam.token, sentAt)).toBeNull();
  });
});
