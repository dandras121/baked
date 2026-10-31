import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_CATALOGUE } from "@/lib/sample-catalogue";
import { connect } from "./client";
import {
  CakeRejected,
  deleteCake,
  ensureSampleCatalogue,
  insertCake,
} from "./cake-repo";
import { readCakeRows } from "./home-repo";
import { cakeOptionChoices, cakeOptions, cakeSizes, cakes } from "./schema";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: the cake model (§9.13, §5.8, §11.3)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await db().delete(cakes);
  });
  afterAll(async () => conn?.close());

  it("the sample catalogue: 14 cakes in order with sizes, options and choices; a second run adds nothing", async () => {
    expect(await ensureSampleCatalogue(db())).toBe(14);
    expect(await ensureSampleCatalogue(db())).toBe(0);
    const rows = await db().select().from(cakes).orderBy(cakes.position);
    expect(rows.map((r) => r.name)).toEqual(
      SAMPLE_CATALOGUE.map((c) => c.name),
    );
    const bramble = rows[1];
    expect(bramble.slug).toBe("bramble-and-cream");
    const options = await db()
      .select()
      .from(cakeOptions)
      .where(eq(cakeOptions.cakeId, bramble.id))
      .orderBy(cakeOptions.position);
    expect(options.map((o) => [o.type, o.label])).toEqual([
      ["choice", "Sponge"],
      ["choices", "Toppings"],
      ["yesno", "Gift box"],
    ]);
    const chocolate = await db()
      .select()
      .from(cakeOptionChoices)
      .where(eq(cakeOptionChoices.label, "Chocolate"));
    expect(chocolate[0]).toMatchObject({
      pricePence: 500,
      allergens: ["soya"],
    });
    const confetti = rows.find((r) => r.name === "Confetti Drum")!;
    expect(confetti.offerInscription).toBe(false);
    const sizes = await db()
      .select()
      .from(cakeSizes)
      .where(eq(cakeSizes.cakeId, rows[0].id));
    expect(sizes.map((s) => [s.serves, s.pricePence])).toEqual([
      [24, 18500],
      [32, 24000],
      [40, 30500],
    ]);
  });

  it("a cake that breaks a rule is not saved at all", async () => {
    const before = (
      await db()
        .select({ n: sql<number>`count(*)` })
        .from(cakes)
    )[0].n;
    await expect(
      insertCake(db(), { ...SAMPLE_CATALOGUE[0], name: "Broken", sizes: [] }),
    ).rejects.toBeInstanceOf(CakeRejected);
    const after = (
      await db()
        .select({ n: sql<number>`count(*)` })
        .from(cakes)
    )[0].n;
    expect(after).toBe(before);
  });

  it("the database refuses unknown allergens and categories, and gluten or nuts without their kind", async () => {
    const base = { slug: "x-1", name: "Xx", flavour: "x", position: 999 };
    await expect(
      db()
        .insert(cakes)
        .values({ ...base, allergens: ["chocolate"] }),
    ).rejects.toThrow();
    await expect(
      db()
        .insert(cakes)
        .values({ ...base, categories: ["christmas"] }),
    ).rejects.toThrow();
    await expect(
      db()
        .insert(cakes)
        .values({ ...base, allergens: ["cereals containing gluten"] }),
    ).rejects.toThrow();
    await expect(
      db()
        .insert(cakes)
        .values({ ...base, allergens: ["nuts"], nutKinds: "" }),
    ).rejects.toThrow();
  });

  it("a deleted cake frees its name but never its address; hidden and deleted cakes have no page (404)", async () => {
    const [forth] = await db()
      .select()
      .from(cakes)
      .where(eq(cakes.name, "The Forth"));
    await deleteCake(db(), forth.id);
    const id = await insertCake(db(), {
      ...SAMPLE_CATALOGUE[6],
      visible: false,
    });
    const [again] = await db().select().from(cakes).where(eq(cakes.id, id));
    expect(again.slug).toBe("the-forth-2");
    const visible = (await readCakeRows(db()))
      .filter((c) => c.visible)
      .map((c) => c.slug);
    expect(visible).not.toContain("the-forth");
    expect(visible).not.toContain("the-forth-2");
    expect(visible).toContain("the-lothian");
  });
});
