import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkChange, formFromOrder } from "@/lib/admin/change-order";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import {
  cancelWaitingChange,
  changeOrder,
  changeOrderFields,
  dropStaleWaitingChanges,
  waitingChange,
} from "./admin-change-repo";
import { connect } from "./client";
import {
  mailSends,
  orderHistory,
  orderLines,
  orders,
  paymentLinks,
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
      await db().insert(orderLines).values({
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

    it("a switch to delivery on a fully paid order with a charge waits for its payment link", async () => {
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
      ).toEqual({ kind: "waiting", pence: 500 });
    });
  },
);

describe.skipIf(!url)(
  "database: Change the order — the cakes, the money, the waiting change (§9.7)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function lothian(over: Partial<typeof orders.$inferInsert> = {}) {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-K${String(seq).padStart(3, "0")}`,
          token: `cak${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: "2026-09-12",
          earliestDate: "2026-09-12",
          handover: "delivery",
          deliveryWindow: "morning",
          address: "48 Preston Road",
          postcode: "EH49 6HH",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 18500,
          amountReceivedPence: 18500,
          paymentIntentId: `pi_cak_${seq}_${Math.random().toString(36).slice(2, 8)}`,
          snapshot: {},
          confirmedAt: new Date("2026-08-20T10:00:00Z"),
          ...over,
        })
        .returning();
      const [l] = await db()
        .insert(orderLines)
        .values({
          orderId: o.id,
          position: 1,
          slug: "the-lothian",
          name: "The Lothian",
          sizeLine: "Two tiers · serves 24",
          message: "Happy 30th",
          pricePence: 18500,
          sizePricePence: 18500,
          allergenText: "Contains eggs.",
          allergenKeys: [],
        })
        .returning();
      return { o, l };
    }
    const sizeId = async (serves: number) => {
      const { cakes, cakeSizes } = await import("./schema");
      const [c] = await db()
        .select()
        .from(cakes)
        .where(eq(cakes.slug, "the-lothian"));
      const all = await db()
        .select()
        .from(cakeSizes)
        .where(eq(cakeSizes.cakeId, c.id));
      return all.find((s) => s.serves === serves)!.id;
    };
    const save = async (
      o: typeof orders.$inferSelect,
      cakes: object,
      owner = true,
      edit: object = {},
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
      const t = countingGateway();
      const r = await changeOrder(
        db(),
        { ...t.gw, cancel: async () => {} },
        {
          orderId: o.id,
          seenVersion: o.version,
          by: owner ? "Linda" : "Ewan",
          owner,
          value,
          cakes,
        },
        now,
      );
      return { r, t };
    };
    const read = async (id: number) =>
      (await db().select().from(orders).where(eq(orders.id, id)))[0];

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
      const { ensureSampleCatalogue } = await import("./cake-repo");
      await ensureSampleCatalogue(db());
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

    it("a bigger size on a fully paid order waits for the difference; paying the link applies it and sends e-mail 12", async () => {
      const { o, l } = await lothian();
      const { r } = await save(o, { sizes: { [l.id]: await sizeId(32) } });
      expect(r).toEqual({ kind: "waiting", pence: 5500 });
      expect((await read(o.id)).totalPence).toBe(18500);
      const w = await waitingChange(db(), o.id);
      expect(w?.change.moneyPence).toBe(5500);
      expect(w?.link).toMatchObject({
        purpose: "difference",
        amountPence: 5500,
        status: "open",
      });
      const mails = await db().select().from(mailSends);
      expect(mails.map((m) => m.template)).toContain("pay-link");
      // A second change waits for the first.
      expect((await save(o, { messages: { [l.id]: "Hi" } })).r).toEqual({
        kind: "busy",
      });
      // The customer pays the link.
      const { applyPayLink } = await import("./pay-link-repo");
      await db()
        .update(paymentLinks)
        .set({ paymentIntentId: `pi_link_${w!.link!.id}` })
        .where(eq(paymentLinks.id, w!.link!.id));
      const t = countingGateway();
      expect(
        await applyPayLink(
          db(),
          { ...t.gw, cancel: async () => {} },
          {
            id: `pi_link_${w!.link!.id}`,
            kind: "payment_link",
            status: "succeeded",
            amountReceivedPence: 5500,
            amountPence: 5500,
            clientSecret: "x",
            draftId: null,
          } as never,
          now,
        ),
      ).toBe("paid");
      const n = await read(o.id);
      expect(n.totalPence).toBe(24000);
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, o.id));
      expect(line.sizeLine).toMatch(/serves 32$/);
      expect(await waitingChange(db(), o.id)).toBeNull();
      expect(
        (await db().select().from(mailSends)).some((m) =>
          m.key.startsWith(`order:${o.id}:12:`),
        ),
      ).toBe(true);
      expect(t.refunds).toEqual([]);
    });

    it("a smaller size saves at once and refunds the difference", async () => {
      const { o, l } = await lothian({
        totalPence: 24000,
        amountReceivedPence: 24000,
      });
      await db()
        .update(orderLines)
        .set({
          sizeLine: "Two tiers · serves 32",
          pricePence: 24000,
          sizePricePence: 24000,
          sizeId: await sizeId(32),
        })
        .where(eq(orderLines.id, l.id));
      const { r, t } = await save(o, { sizes: { [l.id]: await sizeId(24) } });
      expect(r).toMatchObject({ kind: "saved", refundOk: true });
      expect((await read(o.id)).totalPence).toBe(18500);
      expect(t.refunds.map((x) => x.amountPence)).toEqual([5500]);
    });

    it("a rise on an order not fully paid saves at once; still to pay rises", async () => {
      const { o, l } = await lothian({ amountReceivedPence: 8000 });
      const { r } = await save(o, { sizes: { [l.id]: await sizeId(32) } });
      expect(r).toMatchObject({ kind: "saved" });
      expect((await read(o.id)).totalPence).toBe(24000);
      const [m] = (await db().select().from(mailSends)).filter((x) =>
        x.key.startsWith(`order:${o.id}:12:`),
      );
      expect((m.data as { view: { money: unknown } }).view.money).toEqual({
        kind: "owed",
        pence: 16000,
      });
    });

    it("a Helper changes the message only; a size is ignored", async () => {
      const { o, l } = await lothian();
      const { r } = await save(
        o,
        {
          sizes: { [l.id]: await sizeId(32) },
          messages: { [l.id]: "Happy 31st" },
        },
        false,
      );
      expect(r).toMatchObject({ kind: "saved" });
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, o.id));
      expect([
        line.message,
        line.sizeLine,
        (await read(o.id)).totalPence,
      ]).toEqual(["Happy 31st", "Two tiers · serves 24", 18500]);
    });

    it("Cancel this change withdraws the link; the 03:00 job drops a waiting change after the order's date", async () => {
      const { o, l } = await lothian();
      await save(o, { sizes: { [l.id]: await sizeId(32) } });
      expect(
        await cancelWaitingChange(
          db(),
          { ...countingGateway().gw, cancel: async () => {} },
          o.id,
          "Linda",
          now,
        ),
      ).toBe(true);
      const [link] = await db()
        .select()
        .from(paymentLinks)
        .where(eq(paymentLinks.orderId, o.id));
      expect(link.status).toBe("withdrawn");
      expect(await waitingChange(db(), o.id)).toBeNull();

      const b = await lothian({
        date: "2026-09-02",
        earliestDate: "2026-09-02",
      });
      await save(b.o, { sizes: { [b.l.id]: await sizeId(32) } });
      expect(
        await dropStaleWaitingChanges(
          db(),
          { ...countingGateway().gw, cancel: async () => {} },
          londonInstant("2026-09-03", 3),
        ),
      ).toBe(1);
      expect(await waitingChange(db(), b.o.id)).toBeNull();
    });
  },
);
