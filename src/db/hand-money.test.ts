import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { queueMail } from "./mail-repo";
import { moneyByOrder, moneyTaken } from "./money-repo";
import { netPaid } from "./refund-repo";
import { handPayments, mailSends, orders } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)(
  "database: money by hand and a manual order's e-mails (§8.2, §10.6)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order(over: Partial<typeof orders.$inferInsert> = {}) {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-H${String(seq).padStart(3, "0")}`,
          token: `hnd${seq}-${Math.random().toString(36).slice(2)}-padding`,
          kind: "manual",
          date: "2026-09-12",
          earliestDate: "2026-09-12",
          handover: "collection",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 38000,
          amountReceivedPence: 0,
          snapshot: {},
          confirmedAt: new Date("2026-09-01T10:00:00Z"),
          ...over,
        })
        .returning();
      return o;
    }
    const hand = (
      orderId: number,
      v: Partial<typeof handPayments.$inferInsert>,
    ) =>
      db()
        .insert(handPayments)
        .values({
          orderId,
          method: "cash",
          amountPence: 10000,
          paidOn: "2026-09-02",
          byName: "Linda",
          ...v,
        });

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

    it("counts cash and bank payments, takes off refunds given back by hand, ignores removed lines", async () => {
      const o = await order();
      await hand(o.id, {});
      await hand(o.id, {
        method: "bank",
        amountPence: 5000,
        paidOn: "2026-09-05",
      });
      await hand(o.id, {
        kind: "refund",
        amountPence: 2000,
        paidOn: "2026-09-06",
      });
      await hand(o.id, { amountPence: 7000, removedAt: new Date() });
      expect(await netPaid(db(), o)).toBe(13000);
      expect((await moneyByOrder(db(), [o.id])).get(o.id)).toMatchObject({
        netPaidPence: 13000,
        stillToPayPence: 25000,
      });
      // Money taken counts each line on the day it was paid or given back.
      expect(await moneyTaken(db(), "2026-09-01", "2026-09-03")).toBe(10000);
      expect(await moneyTaken(db(), "2026-09-01", "2026-09-07")).toBe(13000);
    });

    it("customer e-mails Off: no 2, 3, 12, 13 or 18; 1, 8 and 15 still go; e-mail 5 never goes to a manual order", async () => {
      const off = await order({ customerEmails: false });
      const q = (key: string) =>
        queueMail(db(), {
          key,
          template: "sample",
          data: {},
          to: "mairi@example.co.uk",
        });
      for (const n of [
        "2:2026-09-12",
        "3:2026-09-12",
        "3b:2026-09-12",
        "12:1",
        "13:1",
        "18",
        "5:2027",
      ])
        expect(await q(`order:${off.id}:${n}`)).toBe("skipped");
      for (const n of [`1:${off.id}`, "8", "15:1"])
        expect(await q(`order:${off.id}:${n}`)).toBe("queued");

      const on = await order();
      expect(await q(`order:${on.id}:2:2026-09-12`)).toBe("queued");
      expect(await q(`order:${on.id}:5:2027`)).toBe("skipped");

      const catalogue = await order({
        kind: "catalogue",
        customerEmails: false,
      });
      expect(await q(`order:${catalogue.id}:13:1`)).toBe("queued");
      const sent = await db()
        .select()
        .from(mailSends)
        .where(eq(mailSends.to, "mairi@example.co.uk"));
      expect(sent).toHaveLength(5);
    });
  },
);
