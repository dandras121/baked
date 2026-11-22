import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkAddOrder, EMPTY_FORM } from "@/lib/admin/add-order";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { addOrder, dayInfo } from "./add-order-repo";
import { connect } from "./client";
import { netPaid } from "./refund-repo";
import {
  handPayments,
  mailSends,
  orderHistory,
  orderLines,
  orders,
} from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-11-22", 10);
const day = "2027-06-20";

describe.skipIf(!url)("database: Add an order (§9.6)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  const value = (over = {}) =>
    checkAddOrder(
      {
        ...EMPTY_FORM,
        name: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        date: day,
        address: "Hopetoun House",
        postcode: "EH30 9SL",
        window: "afternoon",
        what: "Three tiers, ivory buttercream",
        serves: "100",
        tiers: "3",
        allergens: ["milk", "eggs"],
        total: "380",
        paid: "100",
        method: "bank",
        ...over,
      },
      "2026-11-22",
    ).value!;

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(orders).where(eq(orders.date, day));
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await db().delete(orders).where(eq(orders.date, day));
    await conn?.close();
  });

  it("saves a confirmed manual order with one cake, the paid-so-far line, HISTORY and e-mail 1", async () => {
    const before = await dayInfo(db(), day, now);
    const number = await addOrder(db(), value(), "Linda", now);
    expect(number).toMatch(/^BBL-2026-\d{4}$/);
    const [o] = await db()
      .select()
      .from(orders)
      .where(eq(orders.number, number));
    expect(o).toMatchObject({
      kind: "manual",
      status: "confirmed",
      totalPence: 38000,
      customerEmails: true,
      handover: "delivery",
    });
    const [l] = await db()
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id));
    expect(l).toMatchObject({
      name: "Three tiers, ivory buttercream",
      sizeLine: "Three tiers · serves 100",
      slug: "bespoke",
    });
    expect(l.allergenText).toMatch(/^Contains eggs and milk\./);
    const [h] = await db()
      .select()
      .from(handPayments)
      .where(eq(handPayments.orderId, o.id));
    expect(h).toMatchObject({
      method: "bank",
      amountPence: 10000,
      paidOn: "2026-11-22",
    });
    expect(await netPaid(db(), o)).toBe(10000);
    const hist = await db()
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id));
    expect(hist.map((x) => `${x.byName}: ${x.what}`)).toEqual([
      "Linda: Added the order by hand",
    ]);
    const mails = await db()
      .select()
      .from(mailSends)
      .where(eq(mailSends.key, `order:${o.id}:1:${o.id}`));
    expect(mails).toHaveLength(1);
    // It counts one cake against the day and the week.
    const after = await dayInfo(db(), day, now);
    expect([after.day - before.day, after.week - before.week]).toEqual([1, 1]);
  });

  it("counts a day far ahead too (more than a year away)", async () => {
    const far = "2028-12-01";
    const before = await dayInfo(db(), far, now);
    const number = await addOrder(db(), value({ date: far }), "Linda", now);
    expect((await dayInfo(db(), far, now)).day).toBe(before.day + 1);
    await db().delete(orders).where(eq(orders.number, number));
  });

  it("customer e-mails off still sends e-mail 1; a collection keeps its time; nothing paid adds no line", async () => {
    const number = await addOrder(
      db(),
      value({
        emails: "off",
        handover: "collection",
        collectionTime: "12 noon",
        paid: "0",
        method: "",
      }),
      "Linda",
      now,
    );
    const [o] = await db()
      .select()
      .from(orders)
      .where(eq(orders.number, number));
    expect(o).toMatchObject({
      customerEmails: false,
      handover: "collection",
      collectionTime: "12 noon",
      address: null,
    });
    expect(
      await db()
        .select()
        .from(handPayments)
        .where(eq(handPayments.orderId, o.id)),
    ).toEqual([]);
    expect(
      await db()
        .select()
        .from(mailSends)
        .where(eq(mailSends.key, `order:${o.id}:1:${o.id}`)),
    ).toHaveLength(1);
  });
});

describe.skipIf(!url)("database: Add an order's sketches (§9.6)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  afterAll(async () => {
    await db().delete(orders).where(eq(orders.date, day));
    await conn?.close();
  });
  it("attaches this form's own uploads to the order, up to three, and nothing else", async () => {
    const { uploads } = await import("./schema");
    const { orderPictures } = await import("./upload-repo");
    const formKey = crypto.randomUUID();
    const other = crypto.randomUUID();
    const row = (key: string, n: number) => ({
      purpose: "order",
      formKey: key,
      name: `s${n}.jpg`,
      fileKey: `f${n}-${key}`,
      thumbKey: `t${n}-${key}`,
      bytes: 1,
      width: 1,
      height: 1,
    });
    const mine = await db()
      .insert(uploads)
      .values([1, 2, 3, 4].map((n) => row(formKey, n)))
      .returning({ id: uploads.id });
    const [theirs] = await db()
      .insert(uploads)
      .values(row(other, 9))
      .returning({ id: uploads.id });
    const v = checkAddOrder(
      {
        ...EMPTY_FORM,
        name: "Shona Baird",
        email: "shona@example.co.uk",
        phone: "07700 900 127",
        date: day,
        handover: "collection",
        what: "A cake",
        serves: "10",
        total: "50",
      },
      "2026-11-22",
    ).value!;
    const number = await addOrder(db(), v, "Linda", now, {
      formKey,
      ids: [...mine.map((m) => m.id), theirs.id],
    });
    const [o] = await db()
      .select()
      .from(orders)
      .where(eq(orders.number, number));
    const pics = await orderPictures(db(), o.id);
    expect(pics).toHaveLength(3);
    expect(pics.every((p) => p.formKey === formKey)).toBe(true);
    await db().delete(uploads).where(eq(uploads.formKey, other));
    await db().delete(uploads).where(eq(uploads.formKey, formKey));
  });
});
