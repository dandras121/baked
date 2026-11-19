import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EMPTY_COMPLAINT } from "@/lib/complaint";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { saveComplaint } from "./complaint-repo";
import { complaints, mailSends, orders } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const complaint = {
  ...EMPTY_COMPLAINT,
  orderNumber: "bbl 2026 9147",
  name: "Alan Doyle",
  email: "Alan.Doyle@example.co.uk",
  body: "The bottom tier arrived cracked.",
  wanted: "Partial refund",
};

describe.skipIf(!url)("database: complaints (§7.5, §10.7)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(complaints);
    await db().delete(mailSends);
    await db().delete(orders).where(like(orders.number, "BBL-2026-9%"));
    await db()
      .insert(orders)
      .values({
        number: "BBL-2026-9147",
        token: `cmp-${Math.random().toString(36).slice(2)}-padding-xx`,
        date: "2026-09-12",
        earliestDate: "2026-09-12",
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        customerName: "Alan Doyle",
        email: "alan.doyle@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_cmp_${Math.random().toString(36).slice(2, 8)}`,
        snapshot: {},
        confirmedAt: new Date("2026-08-31T10:00:00Z"),
      });
  });
  afterAll(() => conn?.close());

  const send = (over = {}, spam = false) =>
    saveComplaint(
      db(),
      {
        complaint: { ...complaint, ...over },
        formKey: crypto.randomUUID(),
        spam,
      },
      new Date("2026-11-19T15:42:00Z"),
    );

  it("two complaints about one order get their own references; the order matches by number and e-mail", async () => {
    const a = await send();
    const b = await send();
    expect(a.reference).toMatch(/^BBL-2026-C-\d{4}$/);
    expect(b.reference).not.toBe(a.reference);
    expect(a.matchedOrder).toBe("BBL-2026-9147");
    const [row] = await db()
      .select()
      .from(complaints)
      .where(eq(complaints.reference, a.reference));
    expect(row).toMatchObject({
      orderNumber: "BBL-2026-9147",
      wanted: "Partial refund",
      status: "new",
    });
    expect(row.orderId).not.toBeNull();
  });

  it("another e-mail or an unknown number never matches, and is never rejected", async () => {
    expect((await send({ email: "someone@else.com" })).matchedOrder).toBeNull();
    const r = await send({ orderNumber: "the one from June" });
    expect(r.matchedOrder).toBeNull();
    const [row] = await db()
      .select()
      .from(complaints)
      .where(eq(complaints.reference, r.reference));
    expect(row.orderNumber).toBe("the one from June");
  });

  it("Linda's alert (Reply-To the customer) and e-mail 17 without what was written", async () => {
    const r = await send();
    const mails = await db().select().from(mailSends);
    const alert = mails.find((m) => m.template === "alert")!;
    expect(alert).toMatchObject({ replyTo: "Alan.Doyle@example.co.uk" });
    expect(alert.data).toMatchObject({
      kind: "complaint",
      view: {
        reference: r.reference,
        name: "Alan Doyle",
        orderNumber: "BBL-2026-9147",
      },
    });
    const seventeen = mails.find((m) => m.template === "complaint-received")!;
    expect(seventeen).toMatchObject({
      to: "Alan.Doyle@example.co.uk",
      key: `complaint:${r.reference}:17`,
    });
    expect(seventeen.data).toMatchObject({
      view: {
        reference: r.reference,
        orderNumber: "BBL-2026-9147",
        sentOn: "2026-11-19",
        sentAt: { hours: 15, minutes: 42 },
      },
    });
    expect(JSON.stringify(seventeen.data)).not.toMatch(/cracked|Partial/);
  });

  it("a filled honeypot is kept as possible spam with no e-mail", async () => {
    const r = await send({}, true);
    const [row] = await db()
      .select()
      .from(complaints)
      .where(eq(complaints.reference, r.reference));
    expect(row.status).toBe("spam");
    expect(await db().select().from(mailSends)).toHaveLength(0);
  });
});
