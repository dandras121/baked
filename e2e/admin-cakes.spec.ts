import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { asc, isNull } from "drizzle-orm";
import { reorderCakes } from "../src/db/admin-cakes-repo";
import { connect } from "../src/db/client";
import { cakes } from "../src/db/schema";
import { settled, signIn } from "./admin-helpers";

// Slice 9.1a: Cakes (§9.13) — count, filters, search, ⠿ reorder saved at once (keyboard and mouse), Owner only.
let original: number[] = [];
test.beforeAll(async () => {
  const { db, close } = connect();
  try {
    original = (
      await db
        .select({ id: cakes.id })
        .from(cakes)
        .where(isNull(cakes.deletedAt))
        .orderBy(asc(cakes.position))
    ).map((c) => c.id);
  } finally {
    await close();
  }
});
test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await reorderCakes(db, original);
  } finally {
    await close();
  }
});

const names = async (page: import("@playwright/test").Page) => {
  const handles = page.getByRole("button", { name: /^Move / });
  await handles.first().waitFor();
  return (
    await handles.evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label") ?? ""),
    )
  ).map((l) => l.replace(/^Move /, ""));
};

test("the list: count, filters, search; the handles only with All and no search", async ({
  page,
}) => {
  await signIn(page, "Linda");
  await page.goto("/admin/cakes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cakes" }),
  ).toBeVisible();
  await expect(page.getByText(/^\d+ designs · \d+ showing/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit The Lothian" }),
  ).toHaveAttribute("href", /\/admin\/cakes\/\d+$/);
  await expect(page.getByText(/^serves \d+ · from £\d+/).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Move The Lothian" }),
  ).toBeVisible();
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page
    .getByRole("searchbox", { name: "Search by name or flavour" })
    .fill("bramble");
  await expect(page.getByRole("link", { name: /^Edit / })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Search by name or flavour" })
    .fill("zzzz");
  await expect(
    page.getByText("No cake matches — try another word or filter."),
  ).toBeVisible();
});

test("desktop: the filters", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the pills are desktop only");
  await signIn(page, "Linda");
  await page.goto("/admin/cakes");
  await page.getByRole("button", { name: "Hidden" }).click();
  await expect(page.getByRole("button", { name: "Hidden" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const tag of await page.locator("main li").allInnerTexts())
    expect(tag).toContain("Hidden");
  await page.getByRole("button", { name: "Weddings" }).click();
  await expect(
    page.getByRole("link", { name: "Edit The Lothian" }),
  ).toBeVisible();
});

test("reorder: arrow keys and a mouse drag save at once; the site follows", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "changes the shared order: one viewport",
  );
  await signIn(page, "Linda");
  await page.goto("/admin/cakes");
  const first = (await names(page))[0];
  const second = (await names(page))[1];
  await page.getByRole("button", { name: `Move ${first}` }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByText(`${first} moved to 2 of`, { exact: false }),
  ).toBeAttached();
  await expect
    .poll(async () => (await names(page)).slice(0, 2))
    .toEqual([second, first]);
  await expect(
    page.getByRole("button", { name: `Move ${first}` }),
  ).toBeFocused();
  await page.waitForTimeout(500);
  await page.reload();
  await expect
    .poll(async () => (await names(page)).slice(0, 2))
    .toEqual([second, first]);
  // The catalogue follows from the next page load.
  await page.goto("/cakes");
  await expect(page.locator("main h3[data-title]").first()).toHaveText(second);

  // Drag the first cake back to the top with the mouse.
  await page.goto("/admin/cakes");
  const handle = page.getByRole("button", { name: `Move ${first}` });
  const top = page.getByRole("button", { name: `Move ${second}` });
  const a = (await handle.boundingBox())!;
  const b = (await top.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y - 10, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await names(page)).slice(0, 2))
    .toEqual([first, second]);
  await page.waitForTimeout(500);
  await page.reload();
  await expect
    .poll(async () => (await names(page)).slice(0, 2))
    .toEqual([first, second]);
});

test("a Helper cannot open Cakes", async ({ page }) => {
  await signIn(page, "Fiona", "helper");
  await page.goto("/admin/cakes");
  await expect(page).toHaveURL(/\/admin\/today\?for=owner$/);
});
