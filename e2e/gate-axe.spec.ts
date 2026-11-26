import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { settled, signIn } from "./admin-helpers";

// The phase review gate (CLAUDE.md §4.3): axe on every page built so far, at the three sizes of the projects.
// Pages behind a token (order status, pay, delivery, enquiry) run axe in their own specs with their own data.
const PUBLIC = [
  "/",
  "/about",
  "/accessibility",
  "/allergens",
  "/bespoke",
  "/cakes",
  "/cakes/the-lothian",
  "/cancellations",
  "/complaints",
  "/contact",
  "/cookies",
  "/delivery-and-collection",
  "/faq",
  "/find-my-order",
  "/gallery",
  "/privacy",
  "/terms",
  "/no-such-page",
];

const violations = async (page: Page) =>
  (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );

test("the public pages", async ({ page }) => {
  test.setTimeout(180_000);
  const found: Record<string, string[]> = {};
  for (const path of PUBLIC) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // The cookie banner is part of the first visit; it is checked once, then chosen away.
    await settled(page);
    const v = await violations(page);
    if (v.length) found[path] = v;
    const essential = page.getByRole("button", { name: /^Essential only$/ });
    if (await essential.isVisible().catch(() => false)) await essential.click();
  }
  expect(found).toEqual({});
});

test("the admin screens", async ({ page }) => {
  test.setTimeout(180_000);
  const found: Record<string, string[]> = {};
  const check = async (name: string) => {
    await page.waitForLoadState("networkidle");
    await settled(page);
    const v = await violations(page);
    if (v.length) found[name] = v;
  };
  await page.goto("/admin/sign-in");
  await check("sign-in");
  await signIn(page, "Linda");
  for (const path of [
    "/admin/today",
    "/admin/orders",
    "/admin/orders/new",
    "/admin/money",
    "/admin/enquiries",
  ]) {
    await page.goto(path);
    await check(path);
  }
  await page.goto("/admin/orders?filter=upcoming");
  const first = page.locator('main a[href^="/admin/orders/BBL-"]').first();
  if (await first.count()) {
    await first.click();
    await page.getByRole("region", { name: "Where and when" }).waitFor();
    await check("order detail");
    const change = page.getByRole("link", {
      name: /^(Change|Edit) the order$/,
    });
    if (await change.count()) {
      await change.click();
      await page
        .getByRole("heading", { level: 1, name: /^(Change|Edit) the order$/ })
        .waitFor();
      await check("change / edit the order");
    }
  }
  expect(found).toEqual({});
});
