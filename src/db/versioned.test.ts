import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { memberChange } from "@/lib/admin/versions";
import { connect } from "./client";
import { orders } from "./schema";
import { saveOrderVersioned } from "./versioned";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: saving with a version (§9.1)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await db().delete(orders).where(like(orders.number, "BBL-2026-7%"));
  });
  afterAll(() => conn?.close());

  it("the second of two saves from the same version changes nothing and says who saved first", async () => {
    const [o] = await db()
      .insert(orders)
      .values({
        number: "BBL-2026-7001",
        token: `ver-${Math.random().toString(36).slice(2)}-padding-xx`,
        date: "2026-12-12",
        earliestDate: "2026-12-12",
        handover: "collection",
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_ver_${Math.random().toString(36).slice(2, 8)}`,
        snapshot: {},
        confirmedAt: new Date("2026-11-01T10:00:00Z"),
      })
      .returning();
    const at = new Date("2026-11-20T10:42:00Z");
    const first = await saveOrderVersioned(
      db(),
      o.id,
      o.version,
      { allergyNote: "No nuts at all" },
      memberChange("Linda"),
      at,
    );
    expect(first.ok).toBe(true);
    const second = await saveOrderVersioned(
      db(),
      o.id,
      o.version,
      { allergyNote: "Nuts are fine" },
      memberChange("Fiona"),
      at,
    );
    expect(second).toMatchObject({
      ok: false,
      line: "Linda changed this at 10:42 — here is the new version",
    });
    const [now] = await db().select().from(orders).where(eq(orders.id, o.id));
    expect(now).toMatchObject({
      allergyNote: "No nuts at all",
      version: o.version + 1,
      changedBy: "member:Linda",
    });
  });
});
