import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 2.4: About Linda (§4.3).
test("About Linda: heading, sections, description from the first sentence", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hello, I am Linda" }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "What do we offer?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Part of the\s*local community/ }),
  ).toBeVisible();
  await expect(page).toHaveTitle("About Linda — Baked by Linda");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    `The baker and owner of ${S.tradingName}.`,
  );
  await expect(
    page.getByText(`The baker and owner of ${S.tradingName}.`, {
      exact: false,
    }),
  ).toBeVisible();
});

test("“What do we offer?”: phone swipe row with the indicator and centre on click; wider: side by side, not pressable", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const cards = page.getByRole("list", { name: "What we offer" }).locator("li");
  await expect(cards).toHaveCount(3);
  if (info.project.name !== "phone") {
    await expect(
      page.getByRole("button", { name: /^Card \d of 3$/ }),
    ).toHaveCount(0);
    await expect(cards.first()).not.toHaveAttribute("data-pressable", "");
    const [a, b] = await Promise.all([
      cards.nth(0).boundingBox(),
      cards.nth(1).boundingBox(),
    ]);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2); // side by side
    return;
  }
  await expect(
    page.getByRole("button", { name: "Card 1 of 3" }),
  ).toHaveAttribute("aria-current", "true");
  await cards.nth(1).click();
  await expect(
    page.getByRole("button", { name: "Card 2 of 3" }),
  ).toHaveAttribute("aria-current", "true");
  const [card, viewport] = [
    await cards.nth(1).boundingBox(),
    page.viewportSize()!,
  ];
  expect(Math.abs(card!.x + card!.width / 2 - viewport.width / 2)).toBeLessThan(
    3,
  );
  await page.getByRole("button", { name: "Card 3 of 3" }).click();
  await expect(
    page.getByRole("button", { name: "Card 3 of 3" }),
  ).toHaveAttribute("aria-current", "true");
});

test("About Linda: no horizontal scroll, no axe violations", async ({
  page,
}) => {
  await page.goto("/about");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});
