import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { ensureSampleCatalogue } from "./cake-repo";
import {
  applyChangePayment,
  dropChangePayment,
  prepareChangePayment,
  saveChanges,
  sizeChoices,
} from "./change-repo";
import { netPaid } from "./refund-repo";
import { countingGateway } from "./test-gateway";
import { connect } from "./client";
import {
  cakeSizes,
  cakes,
  mailSends,
  orderChanges,
  orderLines,
  orders,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-09-01", 10); // the order's date is 12 September: the window is open until 23:59 on 10 September

describe.skipIf(!url)(
  "database: change your order — the message (§6.4)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order(kind = "catalogue") {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-7${String(seq).padStart(3, "0")}`,
          token: `chg${seq}-${Math.random().toString(36).slice(2)}-padding`,
          kind,
          date: "2026-09-12",
          earliestDate: "2026-09-12",
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
          confirmedAt: new Date("2026-08-31T10:00:00Z"),
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
          allergenText: "Contains eggs.",
          allergenKeys: [],
        })
        .returning();
      return { o, l };
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

    it("saves a new message: the line, the version, the change, e-mail 12 and Linda's alert — once", async () => {
      const { o, l } = await order();
      const r = await saveChanges(
        db(),
        countingGateway().gw,
        {
          orderId: o.id,
          version: 1,
          messages: { [l.id]: " Happy 30th, Mairi " },
        },
        now,
      );
      expect(r.kind).toBe("saved");
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(line.message).toBe("Happy 30th, Mairi");
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after.version).toBe(2);
      const [c] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.orderId, o.id));
      expect(c.changes).toEqual([
        ["Message", "“Happy 30th”", "“Happy 30th, Mairi”"],
      ]);
      const mails = await db().select().from(mailSends);
      expect(mails.map((m) => m.template).sort()).toEqual([
        "alert",
        "change-saved",
      ]);
      expect(mails.find((m) => m.template === "alert")?.replyTo).toBe(
        "mairi@example.co.uk",
      );
    });

    it("an out-of-date page saves nothing (version)", async () => {
      const { o, l } = await order();
      await saveChanges(
        db(),
        countingGateway().gw,
        { orderId: o.id, version: 1, messages: { [l.id]: "First" } },
        now,
      );
      expect(
        (
          await saveChanges(
            db(),
            countingGateway().gw,
            { orderId: o.id, version: 1, messages: { [l.id]: "Second" } },
            now,
          )
        ).kind,
      ).toBe("stale");
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(line.message).toBe("First");
    });

    it("closed from 00:00 on D-1 (A2); manual orders never; nothing to save; emoji refused", async () => {
      const { o, l } = await order();
      expect(
        (
          await saveChanges(
            db(),
            countingGateway().gw,
            { orderId: o.id, version: 1, messages: { [l.id]: "x" } },
            londonInstant("2026-09-10", 23, 59),
          )
        ).kind,
      ).toBe("saved");
      expect(
        (
          await saveChanges(
            db(),
            countingGateway().gw,
            { orderId: o.id, version: 2, messages: { [l.id]: "y" } },
            londonInstant("2026-09-11", 0, 0),
          )
        ).kind,
      ).toBe("closed");
      const m = await order("manual");
      expect(
        (
          await saveChanges(
            db(),
            countingGateway().gw,
            { orderId: m.o.id, version: 1, messages: { [m.l.id]: "x" } },
            now,
          )
        ).kind,
      ).toBe("closed");
      const n = await order();
      expect(
        (
          await saveChanges(
            db(),
            countingGateway().gw,
            {
              orderId: n.o.id,
              version: 1,
              messages: { [n.l.id]: "Happy 30th" },
            },
            now,
          )
        ).kind,
      ).toBe("nothing");
      const e = await saveChanges(
        db(),
        countingGateway().gw,
        { orderId: n.o.id, version: 1, messages: { [n.l.id]: "Happy 🎂" } },
        now,
      );
      expect(e.kind).toBe("invalid");
    });

    it("an empty message leaves the cake plain", async () => {
      const { o, l } = await order();
      await saveChanges(
        db(),
        countingGateway().gw,
        { orderId: o.id, version: 1, messages: { [l.id]: "  " } },
        now,
      );
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(line.message).toBe("");
      const [c] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.orderId, o.id));
      expect(c.changes).toEqual([["Message", "“Happy 30th”", "No message"]]);
    });
  },
);

describe.skipIf(!url)(
  "database: change your order — the size (§6.4, §10.6)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order(
      o: { serves?: number; sizePaid?: number | null; pi?: string | null } = {},
    ) {
      seq++;
      const serves = o.serves ?? 32;
      const price =
        o.sizePaid ?? (serves === 32 ? 24000 : serves === 24 ? 18500 : 30500);
      const [row] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-6${String(seq).padStart(3, "0")}`,
          token: `siz${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: "2026-09-12",
          earliestDate: "2026-09-12",
          handover: "collection",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: price,
          amountReceivedPence: price,
          paymentIntentId:
            o.pi === undefined
              ? `pi_size_${seq}_${Math.random().toString(36).slice(2, 8)}`
              : o.pi,
          snapshot: {},
          confirmedAt: new Date("2026-08-31T10:00:00Z"),
        })
        .returning();
      const [l] = await db()
        .insert(orderLines)
        .values({
          orderId: row.id,
          position: 1,
          slug: "the-lothian",
          name: "The Lothian",
          sizeLine: `Two tiers · serves ${serves}`,
          message: null,
          pricePence: price,
          sizePricePence: o.sizePaid === null ? null : price,
          allergenText: "Contains eggs.",
          allergenKeys: [],
        })
        .returning();
      return { o: row, l };
    }
    const size = async (serves: number) => {
      const [c] = await db()
        .select()
        .from(cakes)
        .where(eq(cakes.slug, "the-lothian"));
      const [s] = await db()
        .select()
        .from(cakeSizes)
        .where(and(eq(cakeSizes.cakeId, c.id), eq(cakeSizes.serves, serves)));
      return s.id;
    };
    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
      await ensureSampleCatalogue(db());
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(refunds);
      await db().delete(orders);
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(refunds);
      await db().delete(orders);
      await conn?.close();
    });

    it("the sizes with their difference against what was paid; the current one marked", async () => {
      const { l } = await order();
      const lines = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      const list = (await sizeChoices(db(), lines))[l.id];
      expect(list.map((c) => [c.label, c.diffPence, c.current])).toEqual([
        ["Serves 24 · two tiers", -5500, false],
        ["Serves 32 · two tiers", 0, true],
        ["Serves 40 · three tiers", 6500, false],
      ]);
    });

    it("smaller: saved at once, £55 refunded on the payment, the line and total updated, e-mail 12 says so", async () => {
      const t = countingGateway();
      const { o, l } = await order();
      const r = await saveChanges(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(24) } },
        now,
      );
      expect(r).toMatchObject({
        kind: "saved",
        money: { kind: "down", pence: 5500 },
        refundOk: true,
      });
      expect(t.refunds).toEqual([
        expect.objectContaining({
          paymentIntentId: o.paymentIntentId,
          amountPence: 5500,
        }),
      ]);
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(line).toMatchObject({
        sizeLine: "Two tiers · serves 24",
        pricePence: 18500,
        sizePricePence: 18500,
      });
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after.totalPence).toBe(18500);
      const [rf] = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf).toMatchObject({
        kind: "change",
        amountPence: 5500,
        status: "succeeded",
      });
      const twelve = (await db().select().from(mailSends)).find(
        (m) => m.template === "change-saved",
      )!;
      expect(
        (twelve.data as { view: { money: unknown; changes: unknown } }).view,
      ).toMatchObject({
        money: { kind: "down", pence: 5500 },
        changes: [["Size", "serves 32", "serves 24"]],
      });
    });

    it("bigger: Save says it needs a payment first — nothing saved", async () => {
      const { o, l } = await order();
      const r = await saveChanges(
        db(),
        countingGateway().gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(40) } },
        now,
      );
      expect(r).toEqual({ kind: "needs-payment", pence: 6500 });
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after.version).toBe(1);
    });

    it("a difference under £0.30 is waived: size changes, nothing refunded, the price paid stays", async () => {
      const t = countingGateway();
      const { o, l } = await order({ serves: 32, sizePaid: 18520 });
      const r = await saveChanges(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(24) } },
        now,
      );
      expect(r).toMatchObject({
        kind: "saved",
        money: { kind: "waived", pence: -20 },
      });
      expect(t.refunds).toEqual([]);
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(line).toMatchObject({
        sizeLine: "Two tiers · serves 24",
        pricePence: 18520,
        sizePricePence: 18520,
      });
    });

    it("a refund that fails: the change stays, the refund is recorded as failed and Linda is told", async () => {
      const t = countingGateway();
      t.refundControl.fail = true;
      const { o, l } = await order();
      const r = await saveChanges(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(24) } },
        now,
      );
      expect(r).toMatchObject({ kind: "saved", refundOk: false });
      const [rf] = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf).toMatchObject({ status: "failed", error: "card_closed" });
      const alerts = (await db().select().from(mailSends))
        .filter((m) => m.template === "alert")
        .map((m) => (m.data as { kind: string }).kind);
      expect(alerts.sort()).toEqual(["customer-changed", "refund-failed"]);
    });

    it("a line made before 6.2b is found by its serves; a removed size shows as no longer offered", async () => {
      const { l } = await order({ serves: 32, sizePaid: null });
      const lines = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(
        (await sizeChoices(db(), lines))[l.id].find((c) => c.current)?.label,
      ).toBe("Serves 32 · two tiers");
      const odd = await order({ serves: 50, sizePaid: 40000 });
      const oddLines = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, odd.l.id));
      expect(
        (await sizeChoices(db(), oddLines))[odd.l.id].at(-1),
      ).toMatchObject({ removed: true, current: true });
    });
  },
);

describe.skipIf(!url)(
  "database: change your order — a bigger size, paid first (§6.4)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order() {
      seq++;
      const [row] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-5${String(seq).padStart(3, "0")}`,
          token: `up${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: "2026-09-12",
          earliestDate: "2026-09-12",
          handover: "collection",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 18500,
          amountReceivedPence: 18500,
          paymentIntentId: `pi_up_${seq}_${Math.random().toString(36).slice(2, 8)}`,
          snapshot: {},
          confirmedAt: new Date("2026-08-31T10:00:00Z"),
        })
        .returning();
      const [l] = await db()
        .insert(orderLines)
        .values({
          orderId: row.id,
          position: 1,
          slug: "the-lothian",
          name: "The Lothian",
          sizeLine: "Two tiers · serves 24",
          message: "Hi",
          pricePence: 18500,
          sizePricePence: 18500,
          allergenText: "Contains eggs.",
          allergenKeys: [],
        })
        .returning();
      return { o: row, l };
    }
    const size = async (serves: number) => {
      const [c] = await db()
        .select()
        .from(cakes)
        .where(eq(cakes.slug, "the-lothian"));
      const [s] = await db()
        .select()
        .from(cakeSizes)
        .where(and(eq(cakeSizes.cakeId, c.id), eq(cakeSizes.serves, serves)));
      return s.id;
    };
    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
      await ensureSampleCatalogue(db());
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(refunds);
      await db().delete(orders);
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(refunds);
      await db().delete(orders);
      await conn?.close();
    });

    it("prepare: a pending change, the order locked, a PaymentIntent of kind change for the difference; nothing saved yet", async () => {
      const t = countingGateway();
      const { o, l } = await order();
      const r = await prepareChangePayment(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(32) } },
        now,
      );
      expect(r).toMatchObject({ kind: "pay", amountPence: 5500 });
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after).toMatchObject({ version: 1, totalPence: 18500 });
      expect(after.lockedAt).not.toBeNull();
      const [c] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.orderId, o.id));
      expect(c).toMatchObject({
        status: "pending",
        moneyKind: "up",
        moneyPence: 5500,
        baseVersion: 1,
      });
      expect(t.intents.get(c.paymentIntentId!)).toMatchObject({
        kind: "change",
        amountPence: 5500,
      });
      // Another tab, while the payment goes through: nothing else can change.
      expect(
        (
          await saveChanges(
            db(),
            t.gw,
            { orderId: o.id, version: 1, messages: { [l.id]: "Other" } },
            now,
          )
        ).kind,
      ).toBe("locked");
    });

    it("paid: applied once (page, webhook and job), the line and total raised, unlocked, e-mail 12 “£55 paid today”", async () => {
      const t = countingGateway();
      const { o, l } = await order();
      const r = await prepareChangePayment(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(32) } },
        now,
      );
      const [c] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.orderId, o.id));
      t.succeed(c.paymentIntentId!);
      const intent = t.intents.get(c.paymentIntentId!)!;
      expect(await applyChangePayment(db(), t.gw, intent, now)).toBe("applied");
      expect(await applyChangePayment(db(), t.gw, intent, now)).toBe("already");
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after).toMatchObject({
        version: 2,
        totalPence: 24000,
        lockedAt: null,
      });
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.id, l.id));
      expect(line).toMatchObject({
        sizeLine: "Two tiers · serves 32",
        pricePence: 24000,
        sizePricePence: 24000,
      });
      const [saved] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.orderId, o.id));
      expect(saved).toMatchObject({ status: "saved", paidPence: 5500 });
      const twelve = (await db().select().from(mailSends)).filter(
        (m) => m.template === "change-saved",
      );
      expect(twelve).toHaveLength(1);
      expect(
        (twelve[0].data as { view: { money: unknown } }).view.money,
      ).toEqual({ kind: "up", pence: 5500 });
      expect(r.kind).toBe("pay");
      // A later size-down refunds on the change payment too once the first payment is used up.
      expect(await netPaid(db(), after)).toBe(24000);
    });

    it("the order moved on before the payment arrived: not applied, the payment refunded (excess), Linda told", async () => {
      const t = countingGateway();
      const { o, l } = await order();
      await prepareChangePayment(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(32) } },
        now,
      );
      await db().update(orders).set({ version: 2 }).where(eq(orders.id, o.id));
      const [c] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.orderId, o.id));
      t.succeed(c.paymentIntentId!);
      expect(
        await applyChangePayment(
          db(),
          t.gw,
          t.intents.get(c.paymentIntentId!)!,
          now,
        ),
      ).toBe("refunded");
      expect(t.refunds).toEqual([
        expect.objectContaining({
          paymentIntentId: c.paymentIntentId,
          amountPence: 5500,
        }),
      ]);
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after).toMatchObject({ totalPence: 18500, lockedAt: null });
      const alert = (await db().select().from(mailSends)).find((m) =>
        m.key.startsWith("alert:change-moved"),
      );
      expect(alert).toBeTruthy();
    });

    it("a payment that did not go through: dropped, the order open again", async () => {
      const t = countingGateway();
      const { o, l } = await order();
      const r = await prepareChangePayment(
        db(),
        t.gw,
        { orderId: o.id, version: 1, sizes: { [l.id]: await size(32) } },
        now,
      );
      if (r.kind !== "pay") throw new Error("expected pay");
      await dropChangePayment(db(), o.id, r.changeId);
      const [after] = await db()
        .select()
        .from(orders)
        .where(eq(orders.id, o.id));
      expect(after.lockedAt).toBeNull();
      const [c] = await db()
        .select()
        .from(orderChanges)
        .where(eq(orderChanges.id, r.changeId));
      expect(c.status).toBe("dropped");
    });
  },
);
