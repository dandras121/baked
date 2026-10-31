import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 2.5: FAQ (§4.4, ANIM-09, §11.8).
const row = (page: Page, id: string) => page.locator(`details#${id}`);
const question = (page: Page, id: string) =>
  row(page, id).locator("summary").getByText(/./).first();

test("categories in order, every question, the first one open", async ({
  page,
}) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "We have all the answers.",
  );
  await expect(
    page.locator("main").getByRole("heading", { level: 2 }),
  ).toHaveText([
    "Ordering",
    "Paying",
    "Food and allergens",
    "Delivery and collection",
    "After it arrives",
    "About the kitchen",
    "Ask me directly",
  ]);
  await expect(page.locator("details")).toHaveCount(16);
  await expect(row(page, "how-far-ahead-should-i-order")).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.getByText("Five days for a ready-made design"),
  ).toBeVisible();
});

test("one row open at a time; the open row closes on a second press", async ({
  page,
}) => {
  await page.goto("/faq");
  await question(page, "where-do-you-deliver").click();
  await expect(row(page, "where-do-you-deliver")).toHaveAttribute(
    "data-open",
    "",
  );
  await expect(row(page, "how-far-ahead-should-i-order")).not.toHaveAttribute(
    "data-open",
    "",
  );
  await expect(page.locator("details[data-open]")).toHaveCount(1);
  await question(page, "where-do-you-deliver").click();
  await expect(page.locator("details[data-open]")).toHaveCount(0);
});

test("answers carry the Settings values (§11.8)", async ({ page }) => {
  await page.goto("/faq");
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\{[a-z_]+\}/);
  await question(page, "where-do-you-deliver").click();
  await expect(
    page.getByText(`${S.deliveryArea} — and delivery is free.`),
  ).toBeVisible();
  await question(page, "are-you-registered-and-insured").click();
  await expect(
    page.getByText(
      `with ${S.council}, Food Hygiene Information Scheme rating ${S.hygieneRating}`,
    ),
  ).toBeVisible();
});

test("keyboard: Tab to a question, Enter opens it", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "keyboard on desktop and tablet");
  await page.goto("/faq");
  await row(page, "do-you-take-last-minute-orders").locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(row(page, "do-you-take-last-minute-orders")).toHaveAttribute(
    "data-open",
    "",
  );
  await expect(page.getByText("Sometimes. The calendar shows")).toBeVisible();
});

test("/faq#question opens and scrolls to that row", async ({ page }) => {
  await page.goto("/faq#what-if-i-am-not-in");
  await expect(row(page, "what-if-i-am-not-in")).toHaveAttribute(
    "data-open",
    "",
  );
  await expect(row(page, "what-if-i-am-not-in")).toBeInViewport();
});

test("email me and Get in touch", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("link", { name: "email me" })).toHaveAttribute(
    "href",
    `mailto:${S.email}`,
  );
  await expect(
    page.getByRole("link", { name: "Get in touch" }),
  ).toHaveAttribute("href", "/contact");
});

test("no axe violations, no horizontal scroll", async ({ page }) => {
  await page.goto("/faq");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the rows are native details: the first open, a press opens another and closes the first", async ({
    page,
  }) => {
    await page.goto("/faq");
    await expect(
      page.getByText("Five days for a ready-made design"),
    ).toBeVisible();
    await page
      .locator("details#how-do-i-pay summary")
      .click({ position: { x: 20, y: 20 } });
    await expect(
      page.getByText("Ready-made cakes are paid in full"),
    ).toBeVisible();
    await expect(
      page.locator("details#how-far-ahead-should-i-order"),
    ).not.toHaveAttribute("open", "");
  });
});
