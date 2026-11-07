import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { recentMessage, sendOrderMessage } from "./message-repo";
import { mailSends, orderMessages, orders } from "./schema";
import { ensureSettings, readSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const now = new Date("2026-09-05T10:00:00Z");

describe.skipIf(!url)("database: Message Linda (§6.5)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order() {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-9${String(seq).padStart(3, "0")}`,
        token: `msg${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: "2026-09-12",
        earliestDate: "2026-09-12",
        handover: "delivery",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: now,
      })
      .returning();
    return o;
  }
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(orders);
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await db().delete(orders);
    await conn?.close();
  });

  it("keeps the message on the order and e-mails Linda with the number, Reply-To the customer", async () => {
    const o = await order();
    const r = await sendOrderMessage(
      db(),
      {
        orderId: o.id,
        body: "  Could we move to the afternoon?  ",
        formKey: null,
      },
      now,
    );
    expect(r.kind).toBe("sent");
    const [m] = await db()
      .select()
      .from(orderMessages)
      .where(eq(orderMessages.orderId, o.id));
    expect(m.body).toBe("Could we move to the afternoon?");
    const [mail] = await db().select().from(mailSends);
    expect(mail).toMatchObject({
      template: "alert",
      to: (await readSettings(db())).email,
      replyTo: "mairi@example.co.uk",
      data: {
        kind: "message-linda",
        view: { number: o.number, name: "Mairi Sinclair" },
      },
    });
  });

  it("empty or only spaces: nothing is sent; over 400 characters: nothing is sent", async () => {
    const o = await order();
    expect(
      (
        await sendOrderMessage(
          db(),
          { orderId: o.id, body: "   ", formKey: null },
          now,
        )
      ).kind,
    ).toBe("empty");
    expect(
      (
        await sendOrderMessage(
          db(),
          { orderId: o.id, body: "x".repeat(401), formKey: null },
          now,
        )
      ).kind,
    ).toBe("too-long");
    expect(await db().select().from(mailSends)).toHaveLength(0);
  });

  it("five an hour per order; the sixth waits until the hour has passed", async () => {
    const o = await order();
    for (let i = 0; i < 5; i++)
      expect(
        (
          await sendOrderMessage(
            db(),
            { orderId: o.id, body: `Message ${i}`, formKey: null },
            new Date(now.getTime() + i * 60_000),
          )
        ).kind,
      ).toBe("sent");
    expect(
      (
        await sendOrderMessage(
          db(),
          { orderId: o.id, body: "Sixth", formKey: null },
          new Date(now.getTime() + 10 * 60_000),
        )
      ).kind,
    ).toBe("limit");
    // Another order is counted on its own.
    const other = await order();
    expect(
      (
        await sendOrderMessage(
          db(),
          { orderId: other.id, body: "Hi", formKey: null },
          now,
        )
      ).kind,
    ).toBe("sent");
    expect(
      (
        await sendOrderMessage(
          db(),
          { orderId: o.id, body: "Later", formKey: null },
          new Date(now.getTime() + 61 * 60_000),
        )
      ).kind,
    ).toBe("sent");
  });

  it("the same form key twice is one message and one e-mail", async () => {
    const o = await order();
    const key = crypto.randomUUID();
    const a = await sendOrderMessage(
      db(),
      { orderId: o.id, body: "Hello", formKey: key },
      now,
    );
    const b = await sendOrderMessage(
      db(),
      { orderId: o.id, body: "Hello", formKey: key },
      now,
    );
    expect(a).toEqual(b);
    expect(
      await db()
        .select()
        .from(orderMessages)
        .where(eq(orderMessages.orderId, o.id)),
    ).toHaveLength(1);
    expect(await db().select().from(mailSends)).toHaveLength(1);
  });

  it("the banner shows for two minutes after sending, only for that order", async () => {
    const o = await order();
    const other = await order();
    const r = await sendOrderMessage(
      db(),
      { orderId: o.id, body: "Hello", formKey: null },
      now,
    );
    if (r.kind !== "sent") throw new Error(r.kind);
    expect(
      await recentMessage(
        db(),
        o.id,
        r.messageId,
        new Date(now.getTime() + 60_000),
      ),
    ).toBeTruthy();
    expect(await recentMessage(db(), other.id, r.messageId, now)).toBeFalsy();
    expect(
      await recentMessage(
        db(),
        o.id,
        r.messageId,
        new Date(now.getTime() + 3 * 60_000),
      ),
    ).toBeFalsy();
  });
});
