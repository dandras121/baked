import { asc, isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { adminCakes, reorderCakes } from "./admin-cakes-repo";
import { ensureSampleCatalogue } from "./cake-repo";
import { connect } from "./client";
import { cakes } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: Cakes list (§9.13)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let original: number[] = [];

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
    await ensureSampleCatalogue(db());
    original = (
      await db()
        .select({ id: cakes.id })
        .from(cakes)
        .where(isNull(cakes.deletedAt))
        .orderBy(asc(cakes.position))
    ).map((c) => c.id);
  });
  afterAll(async () => {
    await reorderCakes(db(), original);
    await conn?.close();
  });

  it("lists the live cakes in Linda's order with the smallest size", async () => {
    const list = await adminCakes(db());
    expect(list.map((c) => c.id)).toEqual(original);
    const lothian = list.find((c) => c.name === "The Lothian")!;
    expect(lothian.serves).toBeGreaterThan(0);
    expect(lothian.fromPence).toBeGreaterThan(0);
  });

  it("saves a new order; refuses a list that leaves a cake out or names one twice", async () => {
    const next = [original[1], original[0], ...original.slice(2)];
    expect(await reorderCakes(db(), next)).toBe(true);
    expect((await adminCakes(db())).map((c) => c.id)).toEqual(next);
    expect(await reorderCakes(db(), next.slice(1))).toBe(false);
    expect(await reorderCakes(db(), [next[0], ...next.slice(0, -1)])).toBe(
      false,
    );
    expect((await adminCakes(db())).map((c) => c.id)).toEqual(next);
  });
});
