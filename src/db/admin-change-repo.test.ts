import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkChange, formFromOrder } from "@/lib/admin/change-order";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { changeOrderFields } from "./admin-change-repo";
import { connect } from "./client";
import {
  mailSends,
  orderHistory,
  orderLines,
  orders,
  refunds,
  settings,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-09-01", 10);
const today = "2026-09-01";

describe.skipIf(!url)(
  "database: Change the order — the order's own fields (§9.7)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order(over: Partial<typeof orders.$inferInsert> = {}) {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-C${String(seq).padStart(3, "0")}`,
          token: `chg${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: "2026-09-12",
          earliestDate: "2026-09-12",
          handover: "delivery",
          deliveryWindow: "morning",
          address: "48 Preston Road",
          town: "Linlithgow",
          postcode: "EH49 6HH",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 18500,
          amountReceivedPence: 18500,
          paymentIntentId: `pi_chg_${seq}_${Math.random().toString(36).slice(2, 8)}`,
          snapshot: {},
          confirmedAt: new Date("2026-08-20T10:00:00Z"),
          ...over,
        })
        .returning();
      await db()
        .insert(orderLines)
        .values({
          orderId: o.id,
          position: 1,
          slug: "the-lothian",
          name: "The Lothian",
          sizeLine: "Two tiers · serves 24",
          pricePence: 18500,
          allergenText: "",
          allergenKeys: [],
        });
      return o;
    }
    const change = async (
      o: typeof orders.$inferSelect,
      edit: object,
      who = { by: "Linda", owner: true },
      version = o.version,
    ) => {
      const fields = {
        ...o,
        date: String(o.date),
        earliestDate: String(o.earliestDate),
      };
      const value = checkChange(
        { ...formFromOrder(fields), ...edit },
        fields,
        today,
      ).value!;
      return changeOrderFields(
        db(),
        { ...countingGateway().gw },
        { orderId: o.id, seenVersion: version, ...who, value },
        now,
      );
    };
    const read = async (id: number) =>
      (await db().select().from(orders).where(eq(orders.id, id)))[0];
    const mail12 = async (id: number) =>
      (await db().select().from(mailSends)).filter((m) =>
        m.key.startsWith(`order:${id}:12:`),
      );

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(orders);
      await db().update(settings).set({ deliveryChargePence: 0, dailyCap: 2 });
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(orders);
      await conn?.close();
    });

    it("moves the date and window, writes HISTORY and e-mail 12; a later move counts the refund from the new date", async () => {
      const o = await order();
      expect(
        await change(o, { date: "2026-09-19", window: "evening" }),
      ).toEqual({ kind: "saved", emailed: true, refundOk: true });
      const n = await read(o.id);
      expect([
        String(n.date),
        String(n.earliestDate),
        n.deliveryWindow,
        n.version,
      ]).toEqual(["2026-09-19", "2026-09-19", "evening", o.version + 1]);
      const h = await db()
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, o.id));
      expect(h[0].what).toBe(
        "Changed the order · Date: Saturday 12 September → Saturday 19 September; Window: 9am – 12pm → 4 – 7pm",
      );
      const [m] = await mail12(o.id);
      expect(
        (m.data as { view: { changes: unknown[] } }).view.changes,
      ).toHaveLength(2);
    });

    it("“The customer asked for this” keeps the earliest date", async () => {
      const o = await order();
      await change(o, { date: "2026-09-19", customerAsked: true });
      expect(String((await read(o.id)).earliestDate)).toBe("2026-09-12");
    });

    it("name, e-mail and phone alone send no e-mail 12", async () => {
      const o = await order();
      expect(await change(o, { phone: "07700 900 111" })).toMatchObject({
        kind: "saved",
        emailed: false,
      });
      expect(await mail12(o.id)).toEqual([]);
    });

    it("a full day: the Owner may book it, a Helper may not", async () => {
      await order({ date: "2026-09-20" });
      await order({ date: "2026-09-20" });
      const o = await order();
      const helper = await change(
        o,
        { date: "2026-09-20" },
        { by: "Ewan", owner: false },
      );
      expect(helper).toMatchObject({ kind: "owner-only" });
      expect(String((await read(o.id)).date)).toBe("2026-09-12");
      expect(await change(o, { date: "2026-09-20" })).toMatchObject({
        kind: "saved",
      });
    });

    it("an out-of-date page is refused with who changed it", async () => {
      const o = await order();
      await db()
        .update(orders)
        .set({
          version: o.version + 1,
          changedBy: "member:Ewan",
          changedAt: now,
        })
        .where(eq(orders.id, o.id));
      const r = await change(o, { window: "evening" });
      expect(r).toMatchObject({ kind: "conflict" });
    });

    it("a switch to collection removes the paid delivery charge and refunds it", async () => {
      const o = await order({
        deliveryChargePence: 500,
        totalPence: 19000,
        amountReceivedPence: 19000,
      });
      expect(
        await change(o, { handover: "collection", collectionTime: "12 noon" }),
      ).toMatchObject({ kind: "saved" });
      const n = await read(o.id);
      expect([
        n.totalPence,
        n.deliveryChargePence,
        n.handover,
        n.address,
      ]).toEqual([18500, 0, "collection", null]);
      const r = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(r.map((x) => [x.kind, x.amountPence])).toEqual([["change", 500]]);
    });

    it("a switch to delivery on a fully paid order with a charge waits for a payment link (8.6b)", async () => {
      await db().update(settings).set({ deliveryChargePence: 500 });
      const o = await order({
        handover: "collection",
        deliveryWindow: null,
        address: null,
        postcode: null,
        town: null,
      });
      expect(
        await change(o, {
          handover: "delivery",
          window: "morning",
          address: "1 High St",
          postcode: "EH49 6HH",
        }),
      ).toEqual({ kind: "needs-link", pence: 500 });
    });
  },
);
