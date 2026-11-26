import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { cakes } from "../src/db/schema";
import { settled, signIn } from "./admin-helpers";

// Slice 9.1b: Add or edit a cake (§9.13) — fields, sizes, allergens, categories, visibility, Save, Delete / Hide.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const name = `Zz E2E ${tag}`;
/** The Lothian's flavour before the edit test, put back in afterAll even if a step fails. */
let lothian: string | null = null;

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(cakes).where(like(cakes.name, `Zz E2E ${tag}%`));
    if (lothian !== null)
      await db
        .update(cakes)
        .set({ flavour: lothian })
        .where(eq(cakes.slug, "the-lothian"));
  } finally {
    await close();
  }
});

test("Add a cake: the checks, the allergen picker, Showing needs a photo, then saved Hidden and in the list", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop" && info.project.name !== "phone",
    "desktop and phone",
  );
  const mine = `${name} ${info.project.name}`;
  await signIn(page, "Linda");
  await page.goto("/admin/cakes");
  await page.getByRole("link", { name: /^Add( a cake)?$/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Add a cake" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "It goes on the site as soon as you save, unless you hide it.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Nothing was saved" }),
  ).toBeVisible();
  await expect(
    page.getByText("Type a name — 2 to 60 characters."),
  ).toBeVisible();
  await expect(page.getByText("Serves 1 to 500. £1 to £5,000.")).toBeVisible();

  await page.getByLabel("Name", { exact: true }).fill(mine);
  await page
    .getByLabel("What it is", { exact: true })
    .fill("Lemon sponge with elderflower.");
  await page.getByLabel("Flavour", { exact: true }).fill("Lemon, elderflower");
  await page.getByLabel("Size 1: serves").fill("16");
  await page.getByLabel("Size 1: price").fill("140");
  // The note beside the first size is desktop only (950:8886 leaves it out).
  if (info.project.name === "desktop")
    await expect(
      page.getByText("Smallest size — the site shows “From £140”"),
    ).toBeVisible();
  await page.getByRole("button", { name: "+ Add a size" }).click();
  await page.getByLabel("Size 2: serves").fill("16");
  await page.getByLabel("Size 2: price").fill("190");
  await page.getByLabel("Size 2: tiers").selectOption({ label: "Two tiers" });

  // The picker: Gluten asks which cereals.
  await page
    .getByRole("button", { name: /Allergens it always contains/ })
    .click();
  const picker = page.getByRole("dialog", { name: "Allergens in this cake" });
  await picker.getByLabel("Milk").check();
  await picker.getByLabel("Gluten").check();
  await expect(picker.getByText("2 ticked")).toBeVisible();
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await picker.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("button", { name: /Gluten, milk/ }),
  ).toBeVisible();

  await page
    .locator("label")
    .filter({ hasText: /^Birthdays$/ })
    .click();
  await page.locator("label").filter({ hasText: "Showing" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(
    page.getByText("Two sizes serve 16 — change one."),
  ).toBeVisible();
  await expect(
    page.getByText("Name which cereals, for example wheat."),
  ).toBeVisible();

  await page.getByLabel("Size 2: serves").fill("24");
  await page
    .getByRole("button", { name: /Allergens it always contains/ })
    .click();
  await picker.getByLabel("Which cereals?").fill("wheat");
  await picker.getByRole("button", { name: "Done" }).click();
  // With the rest right, the server's own check: Showing needs a photo.
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(
    page.getByText("Add a photo before showing it on the site"),
  ).toBeVisible();
  await page
    .locator("label")
    .filter({ hasText: /^Hidden$/ })
    .click();
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/cakes\?saved=1$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Saved." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `Edit ${mine}` })).toBeVisible();

  const { db, close } = connect();
  try {
    const [c] = await db.select().from(cakes).where(eq(cakes.name, mine));
    expect(c).toMatchObject({
      visible: false,
      allergens: ["cereals containing gluten", "milk"],
      glutenKinds: "wheat",
      categories: ["birthdays"],
    });
  } finally {
    await close();
  }
});

test("Edit a showing cake: the new flavour is on the site; then Delete this design (Delete it · Hide it instead · Keep it)", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "changes shared cakes: one viewport",
  );
  await signIn(page, "Linda");
  await page.goto("/admin/cakes");
  await page.getByRole("link", { name: "Edit The Lothian" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "The Lothian" }),
  ).toBeVisible();
  const flavour = page.getByLabel("Flavour", { exact: true });
  const before = await flavour.inputValue();
  lothian = before;
  await flavour.fill(`Test ${tag}`);
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/cakes\?saved=1$/);
  // The flavour line is on the cake card (§9.13).
  await page.goto("/cakes");
  await expect(
    page.getByText(`Test ${tag}`, { exact: true }).first(),
  ).toBeVisible();
  // Put it back.
  await page.goto("/admin/cakes");
  await page.getByRole("link", { name: "Edit The Lothian" }).click();
  await page.getByLabel("Flavour", { exact: true }).fill(before);
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/cakes\?saved=1$/);

  // A cake of our own to delete.
  const doomed = `${name} doomed`;
  await page.goto("/admin/cakes/new");
  await page.getByLabel("Name", { exact: true }).fill(doomed);
  await page.getByLabel("What it is", { exact: true }).fill("To be deleted.");
  await page.getByLabel("Flavour", { exact: true }).fill("None");
  await page.getByLabel("Size 1: serves").fill("10");
  await page.getByLabel("Size 1: price").fill("50");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/cakes\?saved=1$/);
  await page.getByRole("link", { name: `Edit ${doomed}` }).click();
  await page.getByRole("button", { name: "Delete this design" }).click();
  const dialog = page.getByRole("dialog", {
    name: `Delete ${doomed} for good?`,
  });
  await expect(dialog).toContainText(
    "It leaves the site now; past orders keep their copy. To take it off for a while, hide it instead.",
  );
  await dialog.getByRole("button", { name: "Keep it" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Delete this design" }).click();
  await dialog.getByRole("button", { name: "Delete it" }).click();
  await expect(page).toHaveURL(/\/admin\/cakes\?deleted=1$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Deleted. Past orders keep their copy." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `Edit ${doomed}` })).toHaveCount(
    0,
  );
});
