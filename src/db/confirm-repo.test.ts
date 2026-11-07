import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readCakePage } from "./cake-page-repo";
import { ensureSampleCatalogue } from "./cake-repo";
import { connect } from "./client";
import { applyIntent, confirmationState, reconcile } from "./confirm-repo";
import { addLine } from "./draft-repo";
import { capacityFor, takeHold } from "./hold-repo";
import { ensurePaymentIntent, preparePayment } from "./payment-repo";
import {
  cakeSizes,
  drafts,
  orderCounters,
  mailSends,
  orderLines,
  orders,
  paymentAlerts,
  settings,
} from "./schema";
import { orderForDraft } from "./order-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
process.env.BBL_HOLD_MINUTES = "20";

describe.skipIf(!url)("database: Stripe confirms (§5.5, §10.6, §12)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let line: Parameters<typeof addLine>[2];
  const now = new Date("2026-11-02T12:00:00Z");
  const day = "2026-11-20";
  const minutes = (n: number) => new Date(now.getTime() + n * 60_000);
  const row = async (id: string) =>
    (await db().select().from(drafts).where(eq(drafts.id, id)))[0];
  const alerts = () => db().select().from(paymentAlerts);

  /** A draft with a held day, Pay pressed (pending, snapshot taken). */
  async function paying(fake = countingGateway()) {
    const { draftId } = await addLine(db(), undefined, line, now);
    await takeHold(db(), draftId, day, "c", now);
    const intent = await ensurePaymentIntent(db(), draftId, fake.gw);
    await preparePayment(db(), draftId, intent.amountPence, fake.gw, now);
    return { draftId, intent, ...fake };
  }

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSampleCatalogue(db());
    const c = (await readCakePage(db(), "the-lothian"))!;
    line = {
      cakeId: c.id,
      sizeId: c.sizes[0].id,
      answers: { picks: {}, texts: {} },
      inscription: "",
    };
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(orders);
    await db().delete(orderCounters);
    await db().delete(paymentAlerts);
    await db().delete(drafts);
    await db().update(settings).set({
      dailyCap: 5,
      weeklyCap: 20,
      leadTimeDays: 5,
      deliveryChargePence: 0,
    });
  });
  afterAll(async () => {
    await db().delete(orders);
    await db().delete(orderCounters);
    await conn?.close();
  });

  it("succeeded → confirmed once; a replay and a late failure change nothing", async () => {
    const { draftId, intent, succeed, intents, gw } = await paying();
    succeed(intent.id);
    const paid = intents.get(intent.id)!;
    expect(await applyIntent(db(), paid, minutes(1))).toBe("confirmed");
    const d = await row(draftId);
    expect(d.status).toBe("confirmed");
    expect(d.amountReceivedPence).toBe(intent.amountPence);
    expect(await applyIntent(db(), paid, minutes(2))).toBe("already-confirmed");
    // A late payment_failed from an earlier attempt: Stripe now says succeeded, so nothing moves back.
    expect(
      await applyIntent(db(), await gw.retrieve(intent.id), minutes(3), true),
    ).toBe("already-confirmed");
    expect((await row(draftId)).confirmedAt).toEqual(minutes(1));
    expect(await alerts()).toEqual([]);
    expect(await confirmationState(db(), draftId, gw, minutes(4))).toBe(
      "confirmed",
    );
  });

  it("a confirmed order keeps its day in the counts", async () => {
    await db().update(settings).set({ dailyCap: 1 });
    const { intent, succeed, intents } = await paying();
    succeed(intent.id);
    await applyIntent(db(), intents.get(intent.id)!, minutes(1));
    const cap = await capacityFor(db(), null, minutes(60 * 24));
    expect(cap.dayCounts.get(day)).toBe(1);
  });

  it("an amount no snapshot has → confirmed with “Check this payment”, flagged once", async () => {
    const { draftId, intent, succeed, intents } = await paying();
    succeed(intent.id, intent.amountPence + 500);
    const paid = intents.get(intent.id)!;
    await applyIntent(db(), paid, minutes(1));
    await applyIntent(db(), paid, minutes(2));
    expect((await row(draftId)).status).toBe("confirmed");
    const a = await alerts();
    expect(a.map((x) => x.kind)).toEqual(["check-payment"]);
  });

  it("paid after the hold ran out on a day now full → “Booked after its hold ran out”; on a free day nothing", async () => {
    await db().update(settings).set({ dailyCap: 1 });
    const late = await paying();
    // Someone else takes the day after the hold (and the 15-minute lock) ran out.
    const other = await addLine(db(), undefined, line, minutes(40));
    expect(
      (await takeHold(db(), other.draftId, day, "d", minutes(40))).kind,
    ).toBe("held");
    late.succeed(late.intent.id);
    await applyIntent(db(), late.intents.get(late.intent.id)!, minutes(41));
    expect((await alerts()).map((x) => x.kind)).toEqual(["booked-after-hold"]);
  });

  it("payment_failed while paying → open again at once; the job leaves a payment under way alone until the lock lapses", async () => {
    const { draftId, intent, gw } = await paying();
    const failed = await gw.retrieve(intent.id);
    // The job, 2 minutes in: the customer may be paying right now.
    expect(await applyIntent(db(), failed, minutes(2))).toBe("nothing");
    expect((await row(draftId)).status).toBe("pending");
    expect(await applyIntent(db(), failed, minutes(16))).toBe("unlocked");
    expect((await row(draftId)).status).toBe("draft");

    const again = await paying();
    expect(
      await applyIntent(
        db(),
        await again.gw.retrieve(again.intent.id),
        minutes(1),
        true,
      ),
    ).toBe("unlocked");
  });

  it("reconciliation picks up a missed success and flags a Stripe payment with no order", async () => {
    const { draftId, intent, succeed, gw, intents } = await paying();
    succeed(intent.id);
    intents.set("pi_stray", {
      id: "pi_stray",
      clientSecret: "x",
      amountPence: 1000,
      amountReceivedPence: 1000,
      status: "succeeded",
      kind: "checkout",
      draftId: "00000000-0000-0000-0000-000000000000",
    });
    const seen = await reconcile(db(), gw, minutes(5));
    expect(seen.confirmed).toBe(1);
    expect(seen["no-order"]).toBe(1);
    expect((await row(draftId)).status).toBe("confirmed");
    expect((await alerts()).map((x) => x.kind)).toEqual(["no-order"]);
    // Every 10 minutes again: nothing new.
    const next = await reconcile(db(), gw, minutes(15));
    expect(next.confirmed).toBe(0);
    expect(await alerts()).toHaveLength(1);
  });

  it("the order: BBL-2026-0001 then 0002, the snapshot's cakes, prices and allergens; the number goes to Stripe", async () => {
    const a = await paying();
    a.succeed(a.intent.id);
    await applyIntent(
      db(),
      a.intents.get(a.intent.id)!,
      minutes(1),
      false,
      a.gw,
    );
    const first = (await orderForDraft(db(), a.draftId))!;
    expect(first.number).toBe("BBL-2026-0001");
    expect(a.orderNumbers.get(a.intent.id)).toBe("BBL-2026-0001");
    expect(first.date).toBe(day);
    expect(first.totalPence).toBe(a.intent.amountPence);
    expect(first.lines).toHaveLength(1);
    expect(first.lines[0].name).toBe("The Lothian");
    expect(first.lines[0].allergenText).toMatch(/^Contains /);
    expect(first.token.length).toBeGreaterThan(20);
    // A replay makes no second order.
    await applyIntent(
      db(),
      a.intents.get(a.intent.id)!,
      minutes(2),
      false,
      a.gw,
    );
    expect(await db().select().from(orders)).toHaveLength(1);
    const b = await paying();
    b.succeed(b.intent.id);
    await applyIntent(db(), b.intents.get(b.intent.id)!, minutes(3));
    expect((await orderForDraft(db(), b.draftId))!.number).toBe(
      "BBL-2026-0002",
    );
  });

  it("the snapshot is kept: Linda changing the price later does not change the order", async () => {
    const a = await paying();
    a.succeed(a.intent.id);
    await applyIntent(db(), a.intents.get(a.intent.id)!, minutes(1));
    const before = (await orderForDraft(db(), a.draftId))!;
    const [size] = await db()
      .select()
      .from(cakeSizes)
      .where(eq(cakeSizes.id, line.sizeId));
    await db()
      .update(cakeSizes)
      .set({ pricePence: size.pricePence + 2500 })
      .where(eq(cakeSizes.id, size.id));
    try {
      const after = (await orderForDraft(db(), a.draftId))!;
      expect(after.lines[0].pricePence).toBe(before.lines[0].pricePence);
      expect(after.totalPence).toBe(before.totalPence);
      const [l] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, after.id));
      expect(l.pricePence).toBe(before.lines[0].pricePence);
    } finally {
      await db()
        .update(cakeSizes)
        .set({ pricePence: size.pricePence })
        .where(eq(cakeSizes.id, size.id));
    }
  });

  it("e-mail 1 is queued once per order at confirmation, to the order's e-mail (§8.1, §8.4 never twice)", async () => {
    const a = await paying();
    await db()
      .update(drafts)
      .set({ email: "mairi@example.co.uk", customerName: "Mairi Sinclair" })
      .where(eq(drafts.id, a.draftId));
    a.succeed(a.intent.id);
    await applyIntent(db(), a.intents.get(a.intent.id)!, minutes(1));
    await applyIntent(db(), a.intents.get(a.intent.id)!, minutes(2));
    const o = (await orderForDraft(db(), a.draftId))!;
    const sends = await db().select().from(mailSends);
    expect(sends.map((m) => [m.key, m.template, m.to])).toEqual([
      [`order:${o.id}:1:${o.id}`, "order-confirmed", "mairi@example.co.uk"],
    ]);
    expect(o.facts).toMatchObject({ trading_name: "Baked by Linda" });
  });
});
