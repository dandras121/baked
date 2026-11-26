import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { adminCancelQuote } from "./admin-cancel-repo";
import { connect } from "./client";
import { moneyFlags } from "./money-flags-repo";
import { netPaid, refundBasis } from "./refund-repo";
import {
  disputes,
  mailSends,
  orderHistory,
  orders,
  paymentAlerts,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { syncDispute, syncRefunds } from "./stripe-events-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-11-26", 10);

describe.skipIf(!url)(
  "database: Stripe refund and dispute events (§10.6)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order(over: Partial<typeof orders.$inferInsert> = {}) {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-S${String(seq).padStart(3, "0")}`,
          token: `stp${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: "2027-01-20",
          earliestDate: "2027-01-20",
          handover: "collection",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 18500,
          amountReceivedPence: 18500,
          paymentIntentId: `pi_stp_${seq}_${Math.random().toString(36).slice(2)}`,
          snapshot: {},
          confirmedAt: londonInstant("2026-11-01", 9),
          ...over,
        })
        .returning();
      return o;
    }
    const history = async (id: number) =>
      (
        await db()
          .select()
          .from(orderHistory)
          .where(eq(orderHistory.orderId, id))
          .orderBy(orderHistory.id)
      ).map((h) => h.what);

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(orders).where(like(orders.number, "BBL-2026-S%"));
      await db()
        .delete(disputes)
        .where(like(disputes.stripeDisputeId, "dp_test_%"));
      await db()
        .delete(paymentAlerts)
        .where(like(paymentAlerts.paymentIntentId, "pi_stray_%"));
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(orders).where(like(orders.number, "BBL-2026-S%"));
      await db()
        .delete(disputes)
        .where(like(disputes.stripeDisputeId, "dp_test_%"));
      await db()
        .delete(paymentAlerts)
        .where(like(paymentAlerts.paymentIntentId, "pi_stray_%"));
      await conn?.close();
    });

    it("a refund made in the Stripe dashboard is a goodwill line: Paid in full stays, the cancellation basis falls", async () => {
      const o = await order();
      const t = countingGateway();
      t.stripeRefunds.set(o.paymentIntentId!, [
        {
          id: "re_dash_1",
          amountPence: 3000,
          status: "succeeded",
          failureReason: null,
        },
      ]);
      expect(await syncRefunds(db(), t.gw, o.paymentIntentId!, now)).toEqual({
        updated: 0,
        added: 1,
      });
      // A replay changes nothing.
      expect(await syncRefunds(db(), t.gw, o.paymentIntentId!, now)).toEqual({
        updated: 0,
        added: 0,
      });
      const rf = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf.map((r) => [r.kind, r.amountPence, r.status])).toEqual([
        ["goodwill", 3000, "succeeded"],
      ]);
      expect(await netPaid(db(), o)).toBe(18500);
      expect(await refundBasis(db(), o)).toBe(15500);
      expect((await adminCancelQuote(db(), o, "2026-11-26")).paidPence).toBe(
        15500,
      );
      expect((await history(o.id)).at(-1)).toBe(
        "Refunded £30.00 in Stripe — a goodwill refund; the order's money is unchanged",
      );
    });

    it("our own refund follows Stripe: pending → failed raises “Refund failed”; succeeded settles a cancellation", async () => {
      const o = await order({
        status: "cancelled",
        cancellation: {
          cardPence: 9250,
          handPence: 0,
          cancelledOn: "2026-11-25",
        },
      });
      const [mine] = await db()
        .insert(refunds)
        .values({
          orderId: o.id,
          kind: "cancel",
          amountPence: 9250,
          paymentIntentId: o.paymentIntentId!,
          stripeRefundId: "re_ours_1",
          status: "pending",
        })
        .returning();
      const t = countingGateway();
      t.stripeRefunds.set(o.paymentIntentId!, [
        {
          id: "re_ours_1",
          amountPence: 9250,
          status: "failed",
          failureReason: "expired_or_canceled_card",
        },
      ]);
      await syncRefunds(db(), t.gw, o.paymentIntentId!, now);
      expect(
        (await db().select().from(refunds).where(eq(refunds.id, mine.id)))[0],
      ).toMatchObject({ status: "failed", error: "expired_or_canceled_card" });
      expect(
        (await moneyFlags(db(), now)).refundFailed.some(
          (f) => f.id === mine.id,
        ),
      ).toBe(true);
      t.stripeRefunds.set(o.paymentIntentId!, [
        {
          id: "re_ours_1",
          amountPence: 9250,
          status: "succeeded",
          failureReason: null,
        },
      ]);
      await syncRefunds(db(), t.gw, o.paymentIntentId!, now);
      expect(
        (await db().select().from(orders).where(eq(orders.id, o.id)))[0].status,
      ).toBe("refunded");
    });

    it("a refund of ours whose answer was lost is matched, not counted twice", async () => {
      const o = await order();
      await db().insert(refunds).values({
        orderId: o.id,
        kind: "excess",
        amountPence: 500,
        paymentIntentId: o.paymentIntentId!,
        status: "failed",
        error: "timeout",
      });
      const t = countingGateway();
      t.stripeRefunds.set(o.paymentIntentId!, [
        {
          id: "re_lost_1",
          amountPence: 500,
          status: "succeeded",
          failureReason: null,
        },
      ]);
      expect(await syncRefunds(db(), t.gw, o.paymentIntentId!, now)).toEqual({
        updated: 1,
        added: 0,
      });
      const rf = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf.map((r) => [r.kind, r.status, r.stripeRefundId])).toEqual([
        ["excess", "succeeded", "re_lost_1"],
      ]);
    });

    it("a payment with no order: its flag clears itself once refunded in full", async () => {
      const pi = `pi_stray_${Date.now()}`;
      const [a] = await db()
        .insert(paymentAlerts)
        .values({
          kind: "no-order",
          paymentIntentId: pi,
          detail: "x",
          amountPence: 6400,
        })
        .returning();
      const t = countingGateway();
      t.stripeRefunds.set(pi, [
        {
          id: "re_s1",
          amountPence: 4000,
          status: "succeeded",
          failureReason: null,
        },
      ]);
      await syncRefunds(db(), t.gw, pi, now);
      expect(
        (await moneyFlags(db(), now)).noOrder.some((f) => f.id === a.id),
      ).toBe(true);
      t.stripeRefunds.set(pi, [
        {
          id: "re_s1",
          amountPence: 4000,
          status: "succeeded",
          failureReason: null,
        },
        {
          id: "re_s2",
          amountPence: 2400,
          status: "succeeded",
          failureReason: null,
        },
      ]);
      await syncRefunds(db(), t.gw, pi, now);
      expect(
        (await moneyFlags(db(), now)).noOrder.some((f) => f.id === a.id),
      ).toBe(false);
    });

    it("a dispute: the alert and the Money flag until it closes; lost adds a dispute line that never counts", async () => {
      const o = await order();
      const t = countingGateway();
      const id = `dp_test_${seq}`;
      t.stripeDisputes.set(id, {
        id,
        paymentIntentId: o.paymentIntentId!,
        amountPence: 18500,
        status: "needs_response",
        respondBy: "2026-12-07",
      });
      expect(await syncDispute(db(), t.gw, id, now)).toBe("opened");
      expect(await syncDispute(db(), t.gw, id, now)).toBe("unchanged");
      const flag = (await moneyFlags(db(), now)).disputed.find(
        (d) => d.id === id,
      );
      expect(flag).toMatchObject({
        number: o.number,
        pence: 18500,
        respondBy: "2026-12-07",
      });
      const m = await db()
        .select()
        .from(mailSends)
        .where(like(mailSends.key, `alert:dispute-%:${id}`));
      expect(m.map((x) => x.key)).toEqual([`alert:dispute-opened:${id}`]);

      t.stripeDisputes.set(id, {
        id,
        paymentIntentId: o.paymentIntentId!,
        amountPence: 18500,
        status: "lost",
        respondBy: "2026-12-07",
      });
      expect(await syncDispute(db(), t.gw, id, now)).toBe("closed");
      expect(await syncDispute(db(), t.gw, id, now)).toBe("unchanged");
      expect(
        (await moneyFlags(db(), now)).disputed.find((d) => d.id === id),
      ).toBeUndefined();
      const rf = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf.map((r) => [r.kind, r.amountPence])).toEqual([
        ["dispute", 18500],
      ]);
      expect(await netPaid(db(), o)).toBe(18500);
      expect(await refundBasis(db(), o)).toBe(0);
      expect(
        (await db().select().from(orders).where(eq(orders.id, o.id)))[0].status,
      ).toBe("confirmed");
      expect((await history(o.id)).at(-1)).toBe(
        "Dispute lost — the bank returned £185.00 to the customer",
      );
    });
  },
);
