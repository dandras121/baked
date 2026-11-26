import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  checkCakeForm,
  EMPTY_CAKE,
  type CakeForm,
} from "@/lib/admin/cake-form";
import { emptyChoice, emptyOption } from "@/lib/admin/cake-options";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { cakeForEdit, removeCake, saveCake } from "./admin-cake-form-repo";
import { connect } from "./client";
import {
  cakeMedia,
  cakeOptionChoices,
  cakeOptions,
  cakeSizes,
  cakes,
} from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: Add or edit a cake (§9.13)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  const form = (over: Partial<CakeForm> = {}): CakeForm => ({
    ...EMPTY_CAKE,
    name: "Zz Test Cake",
    whatItIs: "A test cake.",
    flavour: "Lemon",
    sizes: [
      { id: null, serves: "12", tiers: "1", price: "95" },
      { id: null, serves: "24", tiers: "2", price: "185" },
    ],
    ...over,
  });
  const value = (f: CakeForm) => checkCakeForm(f).value!;
  const sizes = async (id: number) =>
    (await db().select().from(cakeSizes).where(eq(cakeSizes.cakeId, id))).sort(
      (a, b) => a.serves - b.serves,
    );

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(cakes).where(like(cakes.name, "Zz Test%"));
  });
  afterAll(async () => {
    await db().delete(cakes).where(like(cakes.name, "Zz Test%"));
    await conn?.close();
  });

  it("adds a hidden cake at the end with a slug of its own; the name is unique among live cakes", async () => {
    const r = await saveCake(db(), null, value(form()));
    expect(r).toMatchObject({ kind: "saved", slug: "zz-test-cake" });
    expect(
      await saveCake(db(), null, value(form({ name: "zz test CAKE" }))),
    ).toEqual({ kind: "name-taken" });
    // A deleted cake's name can be used again, its slug never.
    await removeCake(db(), (r as { id: number }).id, "delete");
    expect(await saveCake(db(), null, value(form()))).toMatchObject({
      kind: "saved",
      slug: "zz-test-cake-2",
    });
  });

  it("Showing needs a photo", async () => {
    expect(await saveCake(db(), null, value(form({ visible: true })))).toEqual({
      kind: "needs-photo",
    });
    const r = (await saveCake(db(), null, value(form()))) as { id: number };
    await db()
      .insert(cakeMedia)
      .values({ cakeId: r.id, kind: "photo", position: 1, path: "" });
    expect(
      await saveCake(db(), r.id, value(form({ visible: true }))),
    ).toMatchObject({ kind: "saved" });
  });

  it("each size keeps its id when edited — also when two serves swap; a removed size goes, a new one is added", async () => {
    const r = (await saveCake(db(), null, value(form()))) as { id: number };
    const [a, b] = await sizes(r.id);
    const f = (await cakeForEdit(db(), r.id))!.form;
    // Swap the serves of the two sizes, change a price.
    const swapped = form({
      sizes: [
        { id: a.id, serves: "24", tiers: "1", price: "99" },
        { id: b.id, serves: "12", tiers: "2", price: "185" },
      ],
    });
    expect(f.sizes.map((s) => s.id)).toEqual([a.id, b.id]);
    expect(await saveCake(db(), r.id, value(swapped))).toMatchObject({
      kind: "saved",
    });
    const after = await sizes(r.id);
    expect(after.map((s) => [s.id, s.serves, s.pricePence])).toEqual([
      [b.id, 12, 18500],
      [a.id, 24, 9900],
    ]);
    // Remove one, add one.
    await saveCake(
      db(),
      r.id,
      value(
        form({
          sizes: [
            { id: a.id, serves: "24", tiers: "1", price: "99" },
            { id: null, serves: "40", tiers: "3", price: "305" },
          ],
        }),
      ),
    );
    const last = await sizes(r.id);
    expect(last.map((s) => s.serves)).toEqual([24, 40]);
    expect(last[0].id).toBe(a.id);
    expect(last.some((s) => s.id === b.id)).toBe(false);
  });

  it("Hide it instead keeps the cake; Delete it takes it out of sight", async () => {
    const r = (await saveCake(db(), null, value(form()))) as { id: number };
    await db().update(cakes).set({ visible: true }).where(eq(cakes.id, r.id));
    expect(await removeCake(db(), r.id, "hide")).toBe(true);
    expect((await cakeForEdit(db(), r.id))!.form.visible).toBe(false);
    expect(await removeCake(db(), r.id, "delete")).toBe(true);
    expect(await cakeForEdit(db(), r.id)).toBeNull();
    expect(await removeCake(db(), r.id, "delete")).toBe(false);
  });

  it("options and choices: saved in order, ids kept on edit, removed ones gone; the inscription switch", async () => {
    const options = [
      {
        ...emptyOption("choice"),
        label: "Sponge",
        required: true,
        choices: [
          { ...emptyChoice(), label: "Vanilla" },
          {
            ...emptyChoice(),
            label: "Chocolate",
            allergens: ["soya" as const],
          },
        ],
      },
      {
        ...emptyOption("yesno"),
        label: "Gift box",
        choices: [{ ...emptyChoice(), price: "8" }],
      },
    ];
    const r = (await saveCake(
      db(),
      null,
      value(form({ options, offerInscription: false })),
    )) as { id: number };
    let f = (await cakeForEdit(db(), r.id))!.form;
    expect(f.offerInscription).toBe(false);
    expect(
      f.options.map((o) => [o.type, o.label, o.choices.map((c) => c.label)]),
    ).toEqual([
      ["choice", "Sponge", ["Vanilla", "Chocolate"]],
      ["yesno", "Gift box", ["Gift box"]],
    ]);
    const spongeId = f.options[0].id;
    const vanillaId = f.options[0].choices[0].id;
    // Swap the options, rename Vanilla, remove Chocolate.
    const edited = form({
      offerInscription: true,
      options: [
        f.options[1],
        {
          ...f.options[0],
          choices: [
            { ...f.options[0].choices[0], label: "Madagascan vanilla" },
          ],
        },
      ],
    });
    expect(await saveCake(db(), r.id, value(edited))).toMatchObject({
      kind: "saved",
    });
    f = (await cakeForEdit(db(), r.id))!.form;
    expect(f.offerInscription).toBe(true);
    expect(f.options.map((o) => o.label)).toEqual(["Gift box", "Sponge"]);
    expect(f.options[1].id).toBe(spongeId);
    expect(f.options[1].choices.map((c) => [c.id, c.label])).toEqual([
      [vanillaId, "Madagascan vanilla"],
    ]);
    const opts = await db()
      .select()
      .from(cakeOptions)
      .where(eq(cakeOptions.cakeId, r.id));
    const ch = await db()
      .select()
      .from(cakeOptionChoices)
      .where(eq(cakeOptionChoices.optionId, spongeId!));
    expect(opts).toHaveLength(2);
    expect(ch).toHaveLength(1);
  });
});
