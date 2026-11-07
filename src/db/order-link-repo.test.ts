import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { connect } from "./client";
import {
  checkLocked,
  orderForToken,
  recordCheck,
  sendOrderLinks,
} from "./order-link-repo";
import { formSends, linkChecks, mailSends, orders } from "./schema";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: the status link (§6.1, §6.7, §10.5)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(date: string, email = "mairi@example.co.uk") {
    seq++;
    const [r] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-8${String(seq).padStart(3, "0")}`,
        token: `tok${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date,
        earliestDate: date,
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email,
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: new Date("2026-09-01T10:00:00Z"),
      })
      .returning();
    return r;
  }
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(formSends);
    await db().delete(linkChecks);
    await db().delete(orders);
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await db().delete(formSends);
    await db().delete(orders);
    await conn?.close();
  });

  it("an unknown or odd token finds nothing; an old date is no longer valid", async () => {
    const o = await order("2026-09-12");
    expect(await orderForToken(db(), "nope")).toBeNull();
    expect(await orderForToken(db(), "x".repeat(30))).toBeNull();
    expect(
      (await orderForToken(db(), o.token, londonInstant("2026-10-12", 20)))
        ?.valid,
    ).toBe(true);
    expect(
      (await orderForToken(db(), o.token, londonInstant("2026-10-13", 1)))
        ?.valid,
    ).toBe(false);
  });

  it("5 wrong answers on one link lock it for 15 minutes; a right answer does not count", async () => {
    const o = await order("2026-09-12");
    const t0 = new Date("2026-09-05T10:00:00Z");
    await recordCheck(db(), o.id, "conn-a", true, t0);
    for (let i = 0; i < 4; i++)
      await recordCheck(db(), o.id, `conn-${i}`, false, t0);
    expect(await checkLocked(db(), o.id, "conn-z", t0)).toBeNull();
    await recordCheck(db(), o.id, "conn-z", false, t0);
    expect(
      await checkLocked(
        db(),
        o.id,
        "conn-q",
        new Date(t0.getTime() + 14 * 60_000),
      ),
    ).toBe("link");
    expect(
      await checkLocked(
        db(),
        o.id,
        "conn-q",
        new Date(t0.getTime() + 15 * 60_000 + 1),
      ),
    ).toBeNull();
  });

  it("20 wrong answers from one connection in an hour lock every link for it", async () => {
    const t0 = new Date("2026-09-05T10:00:00Z");
    const links = await Promise.all(
      Array.from({ length: 5 }, () => order("2026-09-12")),
    );
    for (const l of links)
      for (let i = 0; i < 4; i++)
        await recordCheck(db(), l.id, "busy", false, t0);
    const fresh = await order("2026-09-12");
    expect(await checkLocked(db(), fresh.id, "busy", t0)).toBe("connection");
    expect(await checkLocked(db(), fresh.id, "other", t0)).toBeNull();
  });

  it("Send me a new link: e-mail 16 with the address's live orders only; same answer when nothing matches", async () => {
    await order("2026-09-12");
    await order("2026-06-01"); // its link ended on 1 July
    await order("2026-09-20", "someone@else.com");
    const now = new Date("2026-09-05T10:00:00Z");
    expect(
      await sendOrderLinks(
        db(),
        { email: " Mairi@Example.co.uk ", connection: "c1" },
        now,
      ),
    ).toBe("sent");
    const [m] = await db().select().from(mailSends);
    expect(m.template).toBe("order-link");
    expect(
      (m.data as { view: { orders: { date: string }[] } }).view.orders.map(
        (o) => o.date,
      ),
    ).toEqual(["2026-09-12"]);
    expect(
      await sendOrderLinks(
        db(),
        { email: "nobody@example.com", connection: "c1" },
        now,
      ),
    ).toBe("sent");
    expect(await db().select().from(mailSends)).toHaveLength(1);
  });

  it("limits: 3 per address an hour, 5 per connection an hour (shared with Find my order)", async () => {
    const now = new Date("2026-09-05T10:00:00Z");
    for (let i = 0; i < 3; i++)
      expect(
        await sendOrderLinks(
          db(),
          { email: "a@example.com", connection: `c${i}` },
          now,
        ),
      ).toBe("sent");
    expect(
      await sendOrderLinks(
        db(),
        { email: "a@example.com", connection: "c9" },
        now,
      ),
    ).toBe("limit-address");
    for (let i = 0; i < 4; i++)
      await sendOrderLinks(
        db(),
        { email: `x${i}@example.com`, connection: "same" },
        now,
      );
    await sendOrderLinks(
      db(),
      { email: "y@example.com", connection: "same" },
      now,
    );
    expect(
      await sendOrderLinks(
        db(),
        { email: "z@example.com", connection: "same" },
        now,
      ),
    ).toBe("limit-connection");
  });

  it("with a number: only that order (“0147”, “bbl20260147” both match)", async () => {
    const a = await order("2026-09-12");
    await order("2026-09-14");
    const now = new Date("2026-09-05T10:00:00Z");
    await sendOrderLinks(
      db(),
      {
        email: "mairi@example.co.uk",
        number: a.number.slice(-4),
        connection: "n",
      },
      now,
    );
    const [m] = await db().select().from(mailSends);
    expect(
      (m.data as { view: { orders: { number: string }[] } }).view.orders.map(
        (o) => o.number,
      ),
    ).toEqual([a.number]);
  });
});
