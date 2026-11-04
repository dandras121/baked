import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Gateway, Intent } from "@/lib/payments";
import { readCakePage } from "./cake-page-repo";
import { ensureSampleCatalogue } from "./cake-repo";
import { connect } from "./client";
import { addLine } from "./draft-repo";
import { takeHold } from "./hold-repo";
import {
  draftAmount,
  ensurePaymentIntent,
  preparePayment,
  unlockDraft,
} from "./payment-repo";
import { drafts, settings } from "./schema";

const url = process.env.TEST_DATABASE_URL;
process.env.BBL_HOLD_MINUTES = "20";

/** A counting fake: what Stripe would be asked. */
function countingGateway() {
  const intents = new Map<string, Intent>();
  const calls = { create: 0, update: 0 };
  const gw: Gateway = {
    async create(draftId, amountPence) {
      calls.create++;
      const id = `pi_${draftId.slice(0, 8)}`;
      if (!intents.has(id))
        intents.set(id, {
          id,
          clientSecret: `${id}_s`,
          amountPence,
          status: "requires_payment_method",
        });
      return intents.get(id)!;
    },
    async retrieve(id) {
      return intents.get(id)!;
    },
    async updateAmount(id, amountPence) {
      calls.update++;
      const i = { ...intents.get(id)!, amountPence };
      intents.set(id, i);
      return i;
    },
  };
  return { gw, calls, intents };
}

describe.skipIf(!url)("database: paying for a draft (§5.5)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let line: Parameters<typeof addLine>[2];
  const now = new Date("2026-11-02T12:00:00Z");
  const day = "2026-11-20";
  const row = async (id: string) =>
    (await db().select().from(drafts).where(eq(drafts.id, id)))[0];

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
    await db().delete(drafts);
    await db()
      .update(settings)
      .set({
        dailyCap: 5,
        weeklyCap: 20,
        leadTimeDays: 5,
        deliveryChargePence: 0,
      });
  });
  afterAll(async () => conn?.close());

  it("one PaymentIntent per draft, also when step 4 loads twice at the same moment", async () => {
    const { draftId } = await addLine(db(), undefined, line, now);
    const { gw, intents } = countingGateway();
    const [a, b] = await Promise.all([
      ensurePaymentIntent(db(), draftId, gw),
      ensurePaymentIntent(db(), draftId, gw),
    ]);
    expect(a.id).toBe(b.id);
    expect(intents.size).toBe(1);
    expect((await row(draftId)).paymentIntentId).toBe(a.id);
    expect(a.amountPence).toBe(await draftAmount(db(), draftId));
  });

  it("a later amount change updates the same PaymentIntent", async () => {
    const { draftId } = await addLine(db(), undefined, line, now);
    const { gw, calls } = countingGateway();
    const first = await ensurePaymentIntent(db(), draftId, gw);
    await addLine(db(), draftId, line, now);
    const again = await ensurePaymentIntent(db(), draftId, gw);
    expect(again.id).toBe(first.id);
    expect(again.amountPence).toBe(first.amountPence * 2);
    expect(calls.update).toBe(1);
  });

  it("prepare: a changed amount stops with nothing charged; the right amount locks the draft with its snapshot and keeps the hold 15 minutes", async () => {
    const { draftId } = await addLine(db(), undefined, line, now);
    await takeHold(db(), draftId, day, "c", now);
    const { gw } = countingGateway();
    const intent = await ensurePaymentIntent(db(), draftId, gw);
    expect(
      await preparePayment(db(), draftId, intent.amountPence + 100, gw, now),
    ).toEqual({
      kind: "changed",
      amountPence: intent.amountPence,
    });
    expect((await row(draftId)).status).toBe("draft");
    // The hold has 2 minutes left: Pay keeps it for at least 15 more.
    const late = new Date(now.getTime() + 18 * 60 * 1000);
    expect(
      (await preparePayment(db(), draftId, intent.amountPence, gw, late)).kind,
    ).toBe("ok");
    const d = await row(draftId);
    expect(d.status).toBe("pending");
    expect(d.snapshotAmountPence).toBe(intent.amountPence);
    expect(d.holdExpiresAt!.getTime()).toBeGreaterThanOrEqual(
      late.getTime() + 15 * 60 * 1000,
    );
    // A second Pay while locked does nothing; after a failed payment the draft is open again.
    expect(
      (await preparePayment(db(), draftId, intent.amountPence, gw, late)).kind,
    ).toBe("locked");
    await unlockDraft(db(), draftId);
    expect((await row(draftId)).status).toBe("draft");
  });

  it("prepare with the hold run out: nothing charged", async () => {
    const { draftId } = await addLine(db(), undefined, line, now);
    await takeHold(db(), draftId, day, "c", now);
    const { gw } = countingGateway();
    const intent = await ensurePaymentIntent(db(), draftId, gw);
    const afterHold = new Date(now.getTime() + 25 * 60 * 1000);
    expect(
      (await preparePayment(db(), draftId, intent.amountPence, gw, afterHold))
        .kind,
    ).toBe("held-out");
  });
});
