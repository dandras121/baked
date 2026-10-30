import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { homeCakes } from "@/lib/home-content";
import { connect } from "./client";
import { readCakeRows } from "./home-repo";
import { cakeSizes, cakes } from "./schema";
import { seed, slugify } from "./seed";

// Integration: needs TEST_DATABASE_URL (CI starts one).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: the Home cakes (§4.1, §9.13)", () => {
  const conn = url ? connect(url) : null;
  beforeAll(async () => {
    await migrate(conn!.db, { migrationsFolder: "drizzle" });
    await seed(url);
  });
  afterAll(async () => conn?.close());

  it("the seed holds the five Home names in order, each with the drawn sample", async () => {
    const row = homeCakes(await readCakeRows(conn!.db));
    expect(row.map((c) => c.name)).toEqual([
      "The Lothian",
      "Bramble & Cream",
      "Wee Beastie",
      "Sugar Peony",
      "Confetti Drum",
    ]);
    expect(row[0]).toMatchObject({
      tiers: "Two tiers",
      serves: "Serves 24",
      from: "From £185",
    });
    expect(row[1].slug).toBe("bramble-and-cream");
  });

  it("a hidden cake leaves the row", async () => {
    await conn!.db
      .update(cakes)
      .set({ visible: false })
      .where(eq(cakes.slug, "wee-beastie"));
    const row = homeCakes(await readCakeRows(conn!.db));
    expect(row.map((c) => c.slug)).not.toContain("wee-beastie");
    await conn!.db
      .update(cakes)
      .set({ visible: true })
      .where(eq(cakes.slug, "wee-beastie"));
  });

  it("names are unique among live cakes (case-insensitive); a deleted cake frees its name", async () => {
    const insert = (slug: string) =>
      conn!.db
        .insert(cakes)
        .values({ slug, name: "the lothian", flavour: "x", position: 99 });
    await expect(insert("dup-1")).rejects.toThrow();
    await conn!.db
      .update(cakes)
      .set({ deletedAt: new Date() })
      .where(eq(cakes.slug, "the-lothian"));
    await expect(insert("dup-2")).resolves.toBeDefined();
    await seed(url);
  });

  it("size limits: serves 1–500, price £1–£5,000, no two sizes with the same serves", async () => {
    const [c] = await conn!.db.select().from(cakes).limit(1);
    const add = (serves: number, pricePence: number) =>
      conn!.db
        .insert(cakeSizes)
        .values({ cakeId: c.id, serves, tiers: 1, pricePence });
    await expect(add(0, 1000)).rejects.toThrow();
    await expect(add(501, 1000)).rejects.toThrow();
    await expect(add(10, 99)).rejects.toThrow();
    await expect(add(10, 500001)).rejects.toThrow();
    await expect(add(24, 1000)).rejects.toThrow();
    await seed(url);
  });

  it("slugs: & becomes and, accents and symbols drop", () => {
    expect(slugify("Bramble & Cream")).toBe("bramble-and-cream");
    expect(slugify("Crème Brûlée!")).toBe("creme-brulee");
  });
});
