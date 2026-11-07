import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { saveMessages } from "./change-repo";
import { connect } from "./client";
import { mailSends, orderChanges, orderLines, orders } from "./schema";
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
      const r = await saveMessages(
        db(),
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
      await saveMessages(
        db(),
        { orderId: o.id, version: 1, messages: { [l.id]: "First" } },
        now,
      );
      expect(
        (
          await saveMessages(
            db(),
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
          await saveMessages(
            db(),
            { orderId: o.id, version: 1, messages: { [l.id]: "x" } },
            londonInstant("2026-09-10", 23, 59),
          )
        ).kind,
      ).toBe("saved");
      expect(
        (
          await saveMessages(
            db(),
            { orderId: o.id, version: 2, messages: { [l.id]: "y" } },
            londonInstant("2026-09-11", 0, 0),
          )
        ).kind,
      ).toBe("closed");
      const m = await order("manual");
      expect(
        (
          await saveMessages(
            db(),
            { orderId: m.o.id, version: 1, messages: { [m.l.id]: "x" } },
            now,
          )
        ).kind,
      ).toBe("closed");
      const n = await order();
      expect(
        (
          await saveMessages(
            db(),
            {
              orderId: n.o.id,
              version: 1,
              messages: { [n.l.id]: "Happy 30th" },
            },
            now,
          )
        ).kind,
      ).toBe("nothing");
      const e = await saveMessages(
        db(),
        { orderId: n.o.id, version: 1, messages: { [n.l.id]: "Happy 🎂" } },
        now,
      );
      expect(e.kind).toBe("invalid");
    });

    it("an empty message leaves the cake plain", async () => {
      const { o, l } = await order();
      await saveMessages(
        db(),
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
