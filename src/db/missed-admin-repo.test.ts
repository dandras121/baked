import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { chooseCollect, recordNobodyIn } from "./delivery-repo";
import { deliveredAfterAll, recordTheirChoice } from "./missed-admin-repo";
import {
  deliveryAttempts,
  mailSends,
  orderHistory,
  orders,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const day = "2026-09-12";
const at = (h: number, d = day) => londonInstant(d, h);

describe.skipIf(!url)(
  "database: after Nobody was in, from the admin (§9.5)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    const gw = () => ({ ...countingGateway().gw, cancel: async () => {} });
    async function missedOrder() {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-M${String(seq).padStart(3, "0")}`,
          token: `mis${seq}-${Math.random().toString(36).slice(2)}-padding`,
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
        })
        .returning();
      await recordNobodyIn(db(), o.id, at(11));
      const [a] = await db()
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.orderId, o.id));
      return {
        o: (await db().select().from(orders).where(eq(orders.id, o.id)))[0],
        a,
      };
    }
    /** The customer paid £15 for a redelivery tomorrow. */
    async function paidRedelivery(orderId: number, attemptId: number) {
      await db()
        .update(deliveryAttempts)
        .set({
          choice: "redeliver",
          feePaidPence: 1500,
          paymentIntentId: `pi_fee_${attemptId}`,
        })
        .where(eq(deliveryAttempts.id, attemptId));
      await db()
        .insert(deliveryAttempts)
        .values({
          orderId,
          attempt: 2,
          day: "2026-09-13",
          deliveryWindow: "morning",
        });
    }
    const history = async (id: number) =>
      (
        await db()
          .select()
          .from(orderHistory)
          .where(eq(orderHistory.orderId, id))
          .orderBy(orderHistory.id)
      ).map((h) => h.what);
    const attempts = async (id: number) =>
      db()
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.orderId, id))
        .orderBy(deliveryAttempts.attempt);
    const version = async (id: number) =>
      (await db().select().from(orders).where(eq(orders.id, id)))[0].version;

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

    it("Delivered after all: completed, the choices closed for the customer, HISTORY", async () => {
      const { o, a } = await missedOrder();
      const r = await deliveredAfterAll(
        db(),
        gw(),
        { orderId: o.id, seenVersion: o.version, by: "Ewan", owner: false },
        at(15),
      );
      expect(r).toEqual({ kind: "saved", fee: "none" });
      const [n] = await db().select().from(orders).where(eq(orders.id, o.id));
      expect(n.status).toBe("completed");
      expect((await attempts(o.id))[0].sortedBy).toBe("member:Ewan");
      expect(await history(o.id)).toEqual(["Delivered after all"]);
      expect(await chooseCollect(db(), a.token!, at(16))).toEqual({
        kind: "already",
      });
    });

    it("a paid fee goes back when the Owner does it; a Helper's leaves the flag for Money", async () => {
      const one = await missedOrder();
      await paidRedelivery(one.o.id, one.a.id);
      const t = countingGateway();
      const r = await deliveredAfterAll(
        db(),
        { ...t.gw, cancel: async () => {} },
        {
          orderId: one.o.id,
          seenVersion: one.o.version,
          by: "Linda",
          owner: true,
        },
        at(15),
      );
      expect(r).toEqual({ kind: "saved", fee: "refunded" });
      expect(t.refunds.map((x) => x.amountPence)).toEqual([1500]);
      const [f] = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, one.o.id));
      expect(f).toMatchObject({ kind: "fee", status: "succeeded" });
      expect(await history(one.o.id)).toEqual([
        "Delivered after all · £15 redelivery fee refunded",
      ]);

      const two = await missedOrder();
      await paidRedelivery(two.o.id, two.a.id);
      expect(
        await deliveredAfterAll(
          db(),
          gw(),
          {
            orderId: two.o.id,
            seenVersion: two.o.version,
            by: "Ewan",
            owner: false,
          },
          at(15),
        ),
      ).toEqual({ kind: "saved", fee: "to-refund" });
      expect((await attempts(two.o.id))[0].feeRefundDue).toBe(true);
      expect(
        await db().select().from(refunds).where(eq(refunds.orderId, two.o.id)),
      ).toEqual([]);
    });

    it("Record their choice: redeliver books the next attempt; again moves it; collect replaces it and returns a paid fee", async () => {
      const { o } = await missedOrder();
      const g = gw();
      expect(
        await recordTheirChoice(
          db(),
          g,
          {
            orderId: o.id,
            seenVersion: o.version,
            by: "Linda",
            choice: { kind: "redeliver", day: "2026-09-14", window: "evening" },
          },
          at(15),
        ),
      ).toEqual({ kind: "saved", fee: "none" });
      let a = await attempts(o.id);
      expect(
        a.map((x) => [x.attempt, String(x.day), x.deliveryWindow, x.choice]),
      ).toEqual([
        [1, day, "morning", "redeliver"],
        [2, "2026-09-14", "evening", "none"],
      ]);
      await recordTheirChoice(
        db(),
        g,
        {
          orderId: o.id,
          seenVersion: await version(o.id),
          by: "Linda",
          choice: { kind: "redeliver", day: "2026-09-15", window: "morning" },
        },
        at(15),
      );
      a = await attempts(o.id);
      expect(a.map((x) => String(x.day))).toEqual([day, "2026-09-15"]);
      // The customer had paid for it meanwhile (as recorded); collecting now returns the fee.
      await db()
        .update(deliveryAttempts)
        .set({ feePaidPence: 1500, paymentIntentId: `pi_fee_${a[0].id}` })
        .where(eq(deliveryAttempts.id, a[0].id));
      const t = countingGateway();
      expect(
        await recordTheirChoice(
          db(),
          { ...t.gw, cancel: async () => {} },
          {
            orderId: o.id,
            seenVersion: await version(o.id),
            by: "Linda",
            choice: { kind: "collect", day: "2026-09-13" },
          },
          at(15),
        ),
      ).toEqual({ kind: "saved", fee: "refunded" });
      a = await attempts(o.id);
      expect(
        a.map((x) => [
          x.attempt,
          x.choice,
          x.collectDay && String(x.collectDay),
        ]),
      ).toEqual([[1, "collect", "2026-09-13"]]);
      expect(t.refunds.map((x) => x.amountPence)).toEqual([1500]);
      expect(await history(o.id)).toEqual([
        "Recorded their choice: redeliver 2026-09-14, evening · fee waived",
        "Recorded their choice: redeliver 2026-09-15, morning · fee waived",
        "Recorded their choice: collect 2026-09-13 · £15 redelivery fee refunded",
      ]);
    });

    it("refuses an out-of-date page, a day in the past, and an order no longer waiting", async () => {
      const { o } = await missedOrder();
      await db()
        .update(orders)
        .set({
          version: o.version + 1,
          changedBy: "customer",
          changedAt: at(14),
        })
        .where(eq(orders.id, o.id));
      const stale = await deliveredAfterAll(
        db(),
        gw(),
        { orderId: o.id, seenVersion: o.version, by: "Linda", owner: true },
        at(15),
      );
      expect(stale).toMatchObject({ kind: "conflict" });
      expect((stale as { line: string }).line).toMatch(
        /^The customer changed this at/,
      );
      expect(
        await recordTheirChoice(
          db(),
          gw(),
          {
            orderId: o.id,
            seenVersion: o.version + 1,
            by: "Linda",
            choice: { kind: "collect", day: "2026-09-11" },
          },
          at(15),
        ),
      ).toEqual({ kind: "bad-day" });
      await deliveredAfterAll(
        db(),
        gw(),
        { orderId: o.id, seenVersion: o.version + 1, by: "Linda", owner: true },
        at(15),
      );
      expect(
        await recordTheirChoice(
          db(),
          gw(),
          {
            orderId: o.id,
            seenVersion: o.version + 2,
            by: "Linda",
            choice: { kind: "collect", day },
          },
          at(15),
        ),
      ).toEqual({ kind: "not-now" });
      const [n] = await db()
        .select()
        .from(deliveryAttempts)
        .where(
          and(
            eq(deliveryAttempts.orderId, o.id),
            eq(deliveryAttempts.attempt, 1),
          ),
        );
      expect(n.choice).toBe("none");
    });
  },
);
