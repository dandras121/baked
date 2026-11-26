import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";
import sharp from "sharp";
import { saveCake } from "../src/db/admin-cake-form-repo";
import { connect } from "../src/db/client";
import { cakes } from "../src/db/schema";
import { checkCakeForm, EMPTY_CAKE } from "../src/lib/admin/cake-form";
import { settled, signIn } from "./admin-helpers";

// Slice 9.2a: a cake's photos (§9.13) — Add photos, the main photo's focal point, Describe this photo, Make the main
// photo, × Remove, and the card on the site.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const name = `Zz Photo ${tag}`;
let id = 0;

const file = async (colour: string) => ({
  name: `${colour}.jpg`,
  mimeType: "image/jpeg",
  buffer: await sharp({
    create: { width: 1800, height: 2250, channels: 3, background: colour },
  })
    .jpeg()
    .toBuffer(),
});

test.beforeAll(async () => {
  const { db, close } = connect();
  try {
    const r = await saveCake(
      db,
      null,
      checkCakeForm({
        ...EMPTY_CAKE,
        name,
        whatItIs: "For the photo test.",
        flavour: "Strawberry",
        sizes: [{ id: null, serves: "12", tiers: "1", price: "95" }],
      }).value!,
    );
    id = (r as { id: number }).id;
  } finally {
    await close();
  }
});
test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(cakes).where(like(cakes.name, `Zz Photo ${tag}%`));
  } finally {
    await close();
  }
});

test("photos: add, describe, focal point, make main, remove; the card shows the main photo", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "one cake: one viewport");
  await signIn(page, "Linda");
  await page.goto(`/admin/cakes/${id}`);
  await expect(
    page.getByText("Pinch or drag to reposition.", { exact: false }),
  ).toBeVisible();
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([await file("#e8b4c8"), await file("#b4c8e8")]);
  const main = page.getByRole("group", { name: /^The main photo/ });
  await expect(main.locator("img")).toHaveAttribute(
    "src",
    new RegExp(`^/media/cakes/${id}/`),
  );
  await expect(
    page.getByRole("button", { name: /^Select this photo/ }),
  ).toHaveCount(1);
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  // Describe the main photo; move its focal point with the keyboard.
  await page
    .getByLabel("Describe this photo (alt text)")
    .fill("Pink sponge, three tiers");
  await main.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await expect(main.locator("img")).toHaveAttribute(
    "style",
    /object-position: ?55% 45%/,
  );
  await page.waitForTimeout(400);
  await page.reload();
  await expect(main.locator("img")).toHaveAttribute(
    "alt",
    "Pink sponge, three tiers",
  );
  await expect(main.locator("img")).toHaveAttribute(
    "style",
    /object-position: ?55% 45%/,
  );

  // Make the second one the main photo, then remove the first.
  const firstSrc = await main.locator("img").getAttribute("src");
  await page.getByRole("button", { name: "Make the main photo" }).click();
  await expect(main.locator("img")).not.toHaveAttribute("src", firstSrc!);
  await page
    .getByRole("button", { name: "Remove Pink sponge, three tiers" })
    .click();
  const confirm = page.getByRole("dialog", { name: "Remove this photo?" });
  await expect(confirm).toContainText("Orders already placed keep their copy.");
  await confirm.getByRole("button", { name: "Remove it" }).click();
  await expect(page.getByRole("button", { name: /^Select / })).toHaveCount(0);

  // Show it on the site: the card has the photo.
  await page.locator("label").filter({ hasText: "Showing" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/cakes\?saved=1$/);
  await page.goto("/cakes");
  // Found with the catalogue's own search (it may be past the first page).
  await page.getByRole("searchbox").first().fill(tag);
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(card.locator("img").first()).toHaveAttribute(
    "src",
    new RegExp(`^/media/cakes/${id}/`),
  );
  const shown = await card.locator("img").first().getAttribute("src");
  const r = await page.request.get(shown!);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("image/jpeg");
  expect(r.headers()["cache-control"]).toContain("immutable");

  // The last photo of a showing cake stays.
  await page.goto(`/admin/cakes/${id}`);
  await expect(
    page.getByRole("button", { name: "Replace the main photo" }),
  ).toBeVisible();
});
