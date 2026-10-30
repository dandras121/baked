import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { closedDays, settings } from "./schema";
import { seed } from "./seed";
import { ensureSettings, readSettings, writeSettings } from "./settings-repo";

// Integration: needs a Postgres test database (TEST_DATABASE_URL; CI starts one, locally see README).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: Settings (§11.1, §11.2) and the seed", () => {
  const conn = url ? connect(url) : null;

  beforeAll(async () => {
    await migrate(conn!.db, { migrationsFolder: "drizzle" });
    await seed(url);
  });
  afterAll(async () => conn?.close());

  it("CLAUDE.md §7 the seed stores the real business facts (Decided 2026-10-21)", async () => {
    const s = await readSettings(conn!.db);
    expect(s).toEqual(INITIAL_SETTINGS);
    expect(s.tradingName).toBe("Baked by Linda");
    expect(s.addressLine).toBe("20 Church View, Winchburgh");
    expect(s.postcode).toBe("EH52 6SZ");
    expect(s.phone).toBe("+44 7884 199103");
    expect(s.email).toBe("info@bakedbylinda.co.uk");
  });

  it("re-seeding is one command and leaves one Settings row", async () => {
    await seed(url);
    await seed(url);
    expect(await conn!.db.select().from(settings)).toHaveLength(1);
    expect(await conn!.db.select().from(closedDays)).toHaveLength(2);
  });

  it("deploy: the starting Settings are added only when missing, never over saved ones", async () => {
    await writeSettings(conn!.db, {
      ...INITIAL_SETTINGS,
      hygieneRating: "Improvement Required",
    });
    expect(await ensureSettings(conn!.db, INITIAL_SETTINGS)).toBe(false);
    expect((await readSettings(conn!.db)).hygieneRating).toBe(
      "Improvement Required",
    );
    await conn!.db.delete(settings);
    expect(await ensureSettings(conn!.db, INITIAL_SETTINGS)).toBe(true);
    expect(await readSettings(conn!.db)).toEqual(INITIAL_SETTINGS);
  });

  it("§10.7 money is stored as integer pence", async () => {
    const [row] = await conn!.db.select().from(settings);
    expect(row.secondAttemptFeePence).toBe(1500);
    expect(row.bespokeMinimumPence).toBe(16000);
  });

  it("§10.1 the database refuses a lead time outside 3–60 days", async () => {
    await expect(
      writeSettings(conn!.db, { ...INITIAL_SETTINGS, leadTimeDays: 2 }),
    ).rejects.toThrow();
    await expect(
      writeSettings(conn!.db, { ...INITIAL_SETTINGS, leadTimeDays: 61 }),
    ).rejects.toThrow();
  });

  it("§11.1 the second-attempt fee is £0 or at least £0.30 (Stripe's minimum)", async () => {
    await expect(
      writeSettings(conn!.db, {
        ...INITIAL_SETTINGS,
        secondAttemptFeePence: 29,
      }),
    ).rejects.toThrow();
    await writeSettings(conn!.db, {
      ...INITIAL_SETTINGS,
      secondAttemptFeePence: 0,
    });
    expect((await readSettings(conn!.db)).secondAttemptFeePence).toBe(0);
    await seed(url);
  });

  it("there is only ever one Settings row", async () => {
    await expect(
      conn!.db.insert(settings).values({ id: 2, ...INITIAL_SETTINGS }),
    ).rejects.toThrow();
  });
});
