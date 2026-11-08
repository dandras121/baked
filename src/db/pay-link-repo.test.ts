import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { cancelOrder } from "./cancel-repo";
import { connect } from "./client";
import {
  applyPayLink,
  createPayLink,
  finishPayLink,
  payLinkByToken,
  payLinkState,
  payLinkValidUntil,
  preparePayLink,
  withdrawPayLink,
} from "./pay-link-repo";
import { netPaid } from "./refund-repo";
import { mailSends, orders, paymentLinks, refunds } from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = new Date("2026-09-01T10:00:00Z");

describe("payment link rules (§6.9, §10.5)", () => {
  it("valid until the later of date + 30 and sent + 30; paid first, then withdrawn, cancelled, expired", () => {
    expect(payLinkValidUntil("2026-09-12", "2026-09-01")).toBe("2026-10-12");
    expect(payLinkValidUntil("2026-09-12", "2026-09-20")).toBe("2026-10-20");
    const o = { status: "confirmed", date: "2026-09-12" };
    const open = { status: "open", sentOn: "2026-09-01" };
    expect(payLinkState(open, o, "2026-10-12")).toBe("open");
    expect(payLinkState(open, o, "2026-10-13")).toBe("gone");
    expect(
      payLinkState({ ...open, status: "withdrawn" }, o, "2026-09-02"),
    ).toBe("gone");
    expect(
      payLinkState(open, { ...o, status: "cancelled" }, "2026-09-02"),
    ).toBe("gone");
    expect(
      payLinkState(
        { ...open, status: "paid" },
        { ...o, status: "cancelled" },
        "2027-01-01",
      ),
    ).toBe("paid");
  });
});

describe.skipIf(!url)("database: payment links (§6.9)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-5${String(seq).padStart(3, "0")}`,
        token: `pay${seq}-${Math.random().toString(36).slice(2)}-padding`,
        kind: "manual",
        date: "2026-09-12",
        earliestDate: "2026-09-12",
        handover: "collection",
        customerName: "Isla Morrison",
        email: "isla@example.co.uk",
        phone: "07700 900 111",
        consents: {},
        totalPence: 38000,
        amountReceivedPence: 0,
        snapshot: {},
        confirmedAt: now,
        ...over,
      })
      .returning();
    return o;
  }
  async function paid(
    t: ReturnType<typeof countingGateway>,
    token: string,
    received?: number,
  ) {
    const p = await preparePayLink(db(), t.gw, token, now);
    if (p.kind !== "pay") throw new Error(p.kind);
    const id = `pi_link_${p.linkId}`;
    t.succeed(id, received);
    return applyPayLink(db(), t.gw, t.intents.get(id)!, now);
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

  it("sends e-mail 15; paying records it once, counts in net paid and tells Linda", async () => {
    const o = await order();
    const r = await createPayLink(
      db(),
      { orderId: o.id, purpose: "deposit", amountPence: 12000 },
      now,
    );
    if (r.kind !== "sent") throw new Error(r.kind);
    const [mail] = await db().select().from(mailSends);
    expect(mail).toMatchObject({
      template: "pay-link",
      to: "isla@example.co.uk",
    });
    expect(mail.data).toMatchObject({
      view: { kind: "deposit", toPayPence: 12000, linkToken: r.token },
    });
    const t = countingGateway();
    // One PaymentIntent per link, reused.
    await preparePayLink(db(), t.gw, r.token, now);
    await preparePayLink(db(), t.gw, r.token, now);
    expect(t.intents.size).toBe(1);
    expect(await paid(t, r.token)).toBe("paid");
    expect(await netPaid(db(), o)).toBe(12000);
    expect((await payLinkByToken(db(), r.token))!.link.status).toBe("paid");
    expect(await finishPayLink(db(), t.gw, r.token, now)).toBe("paid");
    expect(
      await applyPayLink(db(), t.gw, [...t.intents.values()][0], now),
    ).toBe("already");
    const alerts = (await db().select().from(mailSends)).filter(
      (m) => m.template === "alert",
    );
    expect(alerts.map((a) => a.data)).toEqual([
      { kind: "paid", view: { number: o.number, pence: 12000 } },
    ]);
  });

  it("a payment above the total goes back; other links worth more than still to pay are withdrawn", async () => {
    const o = await order();
    const a = await createPayLink(
      db(),
      { orderId: o.id, purpose: "deposit", amountPence: 30000 },
      now,
    );
    const b = await createPayLink(
      db(),
      { orderId: o.id, purpose: "rest", amountPence: 38000 },
      now,
    );
    const c = await createPayLink(
      db(),
      { orderId: o.id, purpose: "rest", amountPence: 8000 },
      now,
    );
    if (a.kind !== "sent" || b.kind !== "sent" || c.kind !== "sent")
      throw new Error();
    const t = countingGateway();
    expect(await paid(t, a.token)).toBe("paid");
    // Still to pay £80: the £380 link goes, the £80 one stays.
    expect((await payLinkByToken(db(), b.token))!.link.status).toBe(
      "withdrawn",
    );
    expect((await payLinkByToken(db(), c.token))!.link.status).toBe("open");
    // Paying £100 through the £80 link (Stripe took more): £20 goes back.
    expect(await paid(t, c.token, 10000)).toBe("paid");
    expect(t.refunds).toEqual([expect.objectContaining({ amountPence: 2000 })]);
    expect(await netPaid(db(), o)).toBe(38000);
  });

  it("a withdrawn link or a cancelled order: no longer needed, and a payment that lands anyway goes back", async () => {
    const o = await order();
    const r = await createPayLink(
      db(),
      { orderId: o.id, purpose: "rest", amountPence: 38000 },
      now,
    );
    if (r.kind !== "sent") throw new Error();
    const t = countingGateway();
    const p = await preparePayLink(db(), t.gw, r.token, now);
    if (p.kind !== "pay") throw new Error(p.kind);
    const [l] = await db()
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.token, r.token));
    expect(await withdrawPayLink(db(), t.gw, l.id)).toBe(true);
    expect(t.intents.get(`pi_link_${l.id}`)!.status).toBe("canceled");
    expect(await preparePayLink(db(), t.gw, r.token, now)).toEqual({
      kind: "gone",
    });
    // Stripe took it anyway (the cancel came too late): all of it goes back and Linda is asked to look.
    t.succeed(`pi_link_${l.id}`);
    expect(
      await applyPayLink(db(), t.gw, t.intents.get(`pi_link_${l.id}`)!, now),
    ).toBe("refunded");
    const [ref] = await db()
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, o.id));
    expect(ref).toMatchObject({ kind: "excess", amountPence: 38000 });
    // Taken and given back: nothing counts.
    expect(await netPaid(db(), o)).toBe(0);
  });

  it("cancelling an order withdraws its open links", async () => {
    const o = await order({
      kind: "catalogue",
      handover: "delivery",
      postcode: "EH49 6HH",
      totalPence: 18500,
      amountReceivedPence: 18500,
      paymentIntentId: `pi_c_${Date.now()}`,
    });
    const r = await createPayLink(
      db(),
      { orderId: o.id, purpose: "difference", amountPence: 500 },
      now,
    );
    if (r.kind !== "sent") throw new Error();
    await cancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, shownPence: 18500 },
      now,
    );
    expect((await payLinkByToken(db(), r.token))!.link.status).toBe(
      "withdrawn",
    );
  });

  it("refuses an amount under 30p or a cancelled order", async () => {
    const o = await order();
    expect(
      await createPayLink(
        db(),
        { orderId: o.id, purpose: "rest", amountPence: 29 },
        now,
      ),
    ).toEqual({ kind: "invalid" });
    const c = await order({ status: "cancelled" });
    expect(
      await createPayLink(
        db(),
        { orderId: c.id, purpose: "rest", amountPence: 500 },
        now,
      ),
    ).toEqual({ kind: "invalid" });
  });
});
