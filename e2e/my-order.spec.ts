import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 4.2c (Bohoka 2026-11-01): the floating “My order” button and its panel.
const myOrder = (page: Page) =>
  page.getByRole("button", { name: /^My order\s*, \d+ cakes?$/ });

async function addLothian(page: Page, text = "Happy 30th") {
  await page.goto("/cakes/the-lothian");
  await page.getByRole("textbox", { name: /Inscription/ }).fill(text);
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
}

test("no cake: no button; after Add it shows at once, also on Home; never on the checkout steps", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(myOrder(page)).toHaveCount(0);
  await addLothian(page);
  await expect(myOrder(page)).toHaveAccessibleName(/^My order\s*, 1 cake$/);
  await page.goto("/");
  await expect(myOrder(page)).toBeVisible();
  await page.goto("/order/when");
  await expect(
    page.getByRole("heading", { name: "Name a day." }),
  ).toBeVisible();
  await expect(myOrder(page)).toHaveCount(0);
});

test("the panel lists every cake with its price and the total; Continue goes to step 2", async ({
  page,
}) => {
  await addLothian(page, "First");
  await addLothian(page, "Second");
  await page.goto("/gallery");
  await myOrder(page).click();
  const panel = page.getByRole("dialog", { name: "Your order" });
  await expect(panel.getByText("“First”")).toBeVisible();
  await expect(panel.getByText("“Second”")).toBeVisible();
  await expect(panel).toContainText("£370");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await panel
    .getByRole("link", { name: "Continue to date and delivery →" })
    .click();
  await expect(page).toHaveURL(/order\/when$/);
});

test("Remove takes a cake out at once; the last one hides the button", async ({
  page,
}) => {
  await addLothian(page, "One");
  await addLothian(page, "Two");
  await page.goto("/cakes");
  await myOrder(page).click();
  const panel = page.getByRole("dialog", { name: "Your order" });
  await panel
    .getByRole("button", { name: "Remove The Lothian" })
    .first()
    .click();
  await expect(panel.getByText(/“(One|Two)”/)).toHaveCount(1);
  await expect(myOrder(page)).toHaveAccessibleName(/^My order\s*, 1 cake$/);
  await panel.getByRole("button", { name: "Remove The Lothian" }).click();
  await expect(panel).toBeHidden();
  await expect(myOrder(page)).toHaveCount(0);
});

test("Edit opens the cake in edit mode; Save goes back to step 2", async ({
  page,
}) => {
  await addLothian(page, "Before");
  await page.goto("/faq");
  await myOrder(page).click();
  await page
    .getByRole("dialog", { name: "Your order" })
    .getByRole("link", { name: "Edit The Lothian" })
    .click();
  await expect(page).toHaveURL(/the-lothian\?line=\d+&from=when/);
  await expect(page.getByRole("textbox", { name: /Inscription/ })).toHaveValue(
    "Before",
  );
});

test("at the very bottom the button steps aside, so the footer's last row stays free; it comes back on the way up", async ({
  page,
}) => {
  await addLothian(page);
  await page.goto("/contact");
  await expect(myOrder(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(myOrder(page)).toBeHidden();
  await page.getByRole("button", { name: "Cookie preferences" }).click();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(myOrder(page)).toBeVisible();
});

test("the phone and tablet menu: the button steps aside while it is open", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "the desktop has no menu");
  await addLothian(page);
  await page.goto("/faq");
  await expect(myOrder(page)).toBeVisible();
  await page.locator("[data-menu-button]").click();
  await expect(page.locator("#site-menu")).toHaveAttribute(
    "data-state",
    "open",
  );
  await expect(myOrder(page)).toBeHidden();
  await page.locator("[data-menu-button]").click();
  await expect(page.locator("[data-menu-button]")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(myOrder(page)).toBeVisible();
});
