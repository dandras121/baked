import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MissedView } from "@/lib/mail/after-emails";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import {
  applyRedelivery,
  attemptByToken,
  chooseCollect,
  finishRedelivery,
  latestAttempt,
  prepareRedelivery,
  recordNobodyIn,
} from "./delivery-repo";
import { netPaid } from "./refund-repo";
import { countingGateway } from "./test-gateway";
import { refunds, settings } from "./schema";
import { closedDays, deliveryAttempts, mailSends, orders } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const day = "2026-09-12";
const morning = londonInstant(day, 11, 30);

describe.skipIf(!url)("database: Nobody was in (§6.8)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-6${String(seq).padStart(3, "0")}`,
        token: `dlv${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: day,
        earliestDate: day,
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: new Date("2026-09-01T10:00:00Z"),
        ...over,
      })
      .returning();
    return o;
  }
  const missedViews = async () =>
    (await db().select().from(mailSends))
      .filter((m) => m.template === "missed-you")
      .map((m) => (m.data as { view: MissedView }).view);

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(orders);
    await db().delete(closedDays);
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await db().delete(orders);
    await db().delete(closedDays);
    await conn?.close();
  });

  it("records the first attempt with a token and sends e-mail 13 with both choices", async () => {
    const o = await order();
    const r = await recordNobodyIn(db(), o.id, morning);
    expect(r).toMatchObject({ kind: "recorded", attempt: 1 });
    const a = await latestAttempt(db(), o.id);
    expect(a).toMatchObject({
      attempt: 1,
      day,
      deliveryWindow: "morning",
      outcome: "nobody-in",
      recordedOn: day,
      choice: "none",
    });
    const [view] = await missedViews();
    expect(view).toMatchObject({
      number: o.number,
      feePence: 1500,
      redeliveryOffered: true,
      deliveryToken: a!.token,
    });
    // Recording again does nothing more.
    expect((await recordNobodyIn(db(), o.id, morning)).kind).toBe("already");
    expect(await missedViews()).toHaveLength(1);
  });

  it("only on or after the day, only for confirmed deliveries", async () => {
    const early = await order({
      date: "2026-09-13",
      earliestDate: "2026-09-13",
    });
    expect((await recordNobodyIn(db(), early.id, morning)).kind).toBe(
      "not-yet",
    );
    const coll = await order({ handover: "collection", deliveryWindow: null });
    expect((await recordNobodyIn(db(), coll.id, morning)).kind).toBe(
      "not-delivery",
    );
    const done = await order({ status: "completed" });
    expect((await recordNobodyIn(db(), done.id, morning)).kind).toBe(
      "not-delivery",
    );
  });

  it("tomorrow closed: no redelivery; a second attempt: no redelivery either", async () => {
    await db().insert(closedDays).values({ day: "2026-09-13" });
    const o = await order();
    await recordNobodyIn(db(), o.id, morning);
    expect((await missedViews())[0].redeliveryOffered).toBe(false);

    await db().delete(mailSends);
    await db().delete(closedDays);
    const second = await order();
    await db()
      .insert(deliveryAttempts)
      .values([
        {
          orderId: second.id,
          attempt: 1,
          day,
          deliveryWindow: "morning",
          outcome: "nobody-in",
          recordedOn: day,
          token: `first-${second.id}-aaaaaaaaaaaaaaaaaaaa`,
          choice: "redeliver",
        },
        {
          orderId: second.id,
          attempt: 2,
          day: "2026-09-13",
          deliveryWindow: "evening",
        },
      ]);
    const r = await recordNobodyIn(
      db(),
      second.id,
      londonInstant("2026-09-13", 19),
    );
    expect(r).toMatchObject({ kind: "recorded", attempt: 2 });
    const [view] = await missedViews();
    expect(view.redeliveryOffered).toBe(false);
    expect(view.window).toBe("evening");
    // The first token keeps its own choice.
    const first = await attemptByToken(
      db(),
      `first-${second.id}-aaaaaaaaaaaaaaaaaaaa`,
    );
    expect(first?.attempt.choice).toBe("redeliver");
  });

  it("Collect before 18:00 is today, from 18:00 tomorrow; final; Linda is told", async () => {
    const o = await order();
    const { token } = (await recordNobodyIn(db(), o.id, morning)) as {
      token: string;
    };
    expect(await chooseCollect(db(), token, londonInstant(day, 18, 5))).toEqual(
      { kind: "chosen", collectDay: "2026-09-13" },
    );
    expect(
      (await chooseCollect(db(), token, londonInstant(day, 18, 6))).kind,
    ).toBe("already");
    const alerts = (await db().select().from(mailSends)).filter(
      (m) => m.template === "alert",
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].data).toMatchObject({
      kind: "delivery-choice",
      view: { choice: "collect", date: "2026-09-13" },
    });

    const p = await order();
    const t2 = (
      (await recordNobodyIn(db(), p.id, morning)) as { token: string }
    ).token;
    expect(await chooseCollect(db(), t2, londonInstant(day, 15))).toEqual({
      kind: "chosen",
      collectDay: day,
    });
  });

  it("after 23:59 on the recorded day the choices have closed", async () => {
    const o = await order();
    const { token } = (await recordNobodyIn(db(), o.id, morning)) as {
      token: string;
    };
    expect(
      (await chooseCollect(db(), token, londonInstant("2026-09-13", 0, 1)))
        .kind,
    ).toBe("closed");
    const [a] = await db()
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.orderId, o.id));
    expect(a.choice).toBe("none");
  });

  it("an unknown or odd token finds nothing", async () => {
    expect(await attemptByToken(db(), "nope")).toBeNull();
    expect(await chooseCollect(db(), "x".repeat(32))).toEqual({
      kind: "missing",
    });
  });

  async function missed() {
    const o = await order();
    const r = await recordNobodyIn(db(), o.id, morning);
    if (r.kind !== "recorded") throw new Error(r.kind);
    return { o, token: r.token };
  }

  it("Redeliver: the £15 is taken first; once it succeeds the next day is booked in the chosen window", async () => {
    const { o, token } = await missed();
    const t = countingGateway();
    expect(
      await prepareRedelivery(db(), t.gw, { token, window: "" }, morning),
    ).toEqual({ kind: "no-window" });
    const p = await prepareRedelivery(
      db(),
      t.gw,
      { token, window: "evening" },
      morning,
    );
    expect(p).toMatchObject({ kind: "pay", amountPence: 1500 });
    // Not paid yet: nothing booked.
    expect((await latestAttempt(db(), o.id))!.attempt).toBe(1);
    expect(await finishRedelivery(db(), t.gw, token, morning)).toBe("failed");
    const [a] = await db()
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.orderId, o.id));
    t.succeed(a.paymentIntentId!);
    expect(await finishRedelivery(db(), t.gw, token, morning)).toBe("booked");
    const next = await latestAttempt(db(), o.id);
    expect(next).toMatchObject({
      attempt: 2,
      day: "2026-09-13",
      deliveryWindow: "evening",
      outcome: "none",
    });
    const first = (await attemptByToken(db(), token))!.attempt;
    expect(first).toMatchObject({ choice: "redeliver", feePaidPence: 1500 });
    // The webhook arriving too books nothing more; the fee never counts in net paid.
    expect(
      await applyRedelivery(
        db(),
        t.gw,
        t.intents.get(a.paymentIntentId!)!,
        morning,
      ),
    ).toBe("already");
    expect(await netPaid(db(), o)).toBe(18500);
    const alerts = (await db().select().from(mailSends)).filter(
      (m) => m.template === "alert",
    );
    expect(alerts.map((m) => m.data)).toEqual([
      expect.objectContaining({
        kind: "delivery-choice",
        view: expect.objectContaining({
          choice: "redeliver",
          date: "2026-09-13",
        }),
      }),
    ]);
    // Nobody in again on the redelivery day: a new token and the one-button e-mail.
    await db().delete(mailSends);
    const again = await recordNobodyIn(
      db(),
      o.id,
      londonInstant("2026-09-13", 20),
    );
    expect(again).toMatchObject({ kind: "recorded", attempt: 2 });
    expect((await missedViews())[0].redeliveryOffered).toBe(false);
  });

  it("a payment that succeeds after 23:59 still books the day after Nobody was in", async () => {
    const { o, token } = await missed();
    const t = countingGateway();
    await prepareRedelivery(
      db(),
      t.gw,
      { token, window: "morning" },
      londonInstant(day, 23, 58),
    );
    const [a] = await db()
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.orderId, o.id));
    t.succeed(a.paymentIntentId!);
    expect(
      await applyRedelivery(
        db(),
        t.gw,
        t.intents.get(a.paymentIntentId!)!,
        londonInstant("2026-09-13", 0, 2),
      ),
    ).toBe("booked");
    expect((await latestAttempt(db(), o.id))!.day).toBe("2026-09-13");
  });

  it("Collect while the fee is being paid: the payment is stopped, and one that succeeds anyway goes back as a fee refund", async () => {
    const { o, token } = await missed();
    const t = countingGateway();
    await prepareRedelivery(db(), t.gw, { token, window: "morning" }, morning);
    const [a] = await db()
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.orderId, o.id));
    t.succeed(a.paymentIntentId!);
    await chooseCollect(db(), token, morning, t.gw);
    expect(
      await applyRedelivery(
        db(),
        t.gw,
        t.intents.get(a.paymentIntentId!)!,
        morning,
      ),
    ).toBe("refunded");
    expect(t.refunds).toEqual([
      expect.objectContaining({
        paymentIntentId: a.paymentIntentId,
        amountPence: 1500,
      }),
    ]);
    const [r] = await db()
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, o.id));
    expect(r.kind).toBe("fee");
    expect(await netPaid(db(), o)).toBe(18500);
    expect((await latestAttempt(db(), o.id))!.attempt).toBe(1);
  });

  it("a payment still in progress is cancelled when Collect is chosen", async () => {
    const { o, token } = await missed();
    const t = countingGateway();
    await prepareRedelivery(db(), t.gw, { token, window: "morning" }, morning);
    const [a] = await db()
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.orderId, o.id));
    await chooseCollect(db(), token, morning, t.gw);
    expect(t.intents.get(a.paymentIntentId!)!.status).toBe("canceled");
  });

  it("with the fee set to £0 the redelivery is booked at once; not offered when tomorrow is closed", async () => {
    await db().update(settings).set({ secondAttemptFeePence: 0 });
    try {
      const { o, token } = await missed();
      expect(
        await prepareRedelivery(
          db(),
          null,
          { token, window: "afternoon" },
          morning,
        ),
      ).toEqual({ kind: "booked" });
      expect((await latestAttempt(db(), o.id))!.deliveryWindow).toBe(
        "afternoon",
      );
    } finally {
      await db().update(settings).set({ secondAttemptFeePence: 1500 });
    }
    await db().insert(closedDays).values({ day: "2026-09-13" });
    const { token } = await missed();
    expect(
      await prepareRedelivery(
        db(),
        countingGateway().gw,
        { token, window: "morning" },
        morning,
      ),
    ).toEqual({ kind: "not-offered" });
  });
});
