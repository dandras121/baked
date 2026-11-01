import { expect, test, type Page } from "@playwright/test";

// Bohoka 2026-11-01: “scrolling sometimes freezes and some presses do nothing”. Leaving a page while a dialog or
// sheet was open left the page locked (no scrolling) and the panel still “open” in its state. Every way out of an
// open overlay must give the scrolling back, and a panel must open again on the next press.
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

const locked = (page: Page) =>
  page.evaluate(() => ({
    lock: document.documentElement.hasAttribute("data-overlay-open"),
    open: document.querySelectorAll("dialog[open]").length,
  }));

async function addLothian(page: Page) {
  await page.goto("/cakes/the-lothian");
  await page.getByRole("textbox", { name: /Inscription/ }).fill("Hi");
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
}

async function scrolls(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
}

test("My order → Continue: step 2 scrolls and nothing stays open", async ({
  page,
}) => {
  await addLothian(page);
  await page.goto("/faq");
  await page.getByRole("button", { name: /^My order/ }).click();
  await page
    .getByRole("link", { name: "Continue to date and delivery →" })
    .click();
  await expect(page).toHaveURL(/order\/when$/);
  await expect.poll(() => locked(page)).toEqual({ lock: false, open: 0 });
  await scrolls(page);
});

test("My order → Edit → Back: the page scrolls and the button opens the panel again", async ({
  page,
}) => {
  await addLothian(page);
  await page.goto("/gallery");
  const button = page.getByRole("button", { name: /^My order/ });
  await button.click();
  await page
    .getByRole("dialog", { name: "Your order" })
    .getByRole("link", { name: "Edit The Lothian" })
    .click();
  await expect(page).toHaveURL(/the-lothian\?line=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect.poll(() => locked(page)).toEqual({ lock: false, open: 0 });
  await scrolls(page);
  await button.click();
  await expect(page.getByRole("dialog", { name: "Your order" })).toBeVisible();
});

test("phone order sheet → Edit → Back to step 2: it scrolls and the bar opens the sheet again", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the bar is phone only");
  await addLothian(page);
  await page.goto("/order/when");
  const bar = page.getByRole("button", { name: /show your order/ }).last();
  await bar.click();
  await page
    .getByRole("dialog", { name: "Your order" })
    .getByRole("link", { name: "Edit The Lothian" })
    .click();
  await expect(page).toHaveURL(/the-lothian\?line=/);
  await page.goBack();
  await expect(page).toHaveURL(/order\/when$/);
  await expect.poll(() => locked(page)).toEqual({ lock: false, open: 0 });
  await scrolls(page);
  await page
    .getByRole("button", { name: /show your order/ })
    .last()
    .click();
  await expect(page.getByRole("dialog", { name: "Your order" })).toBeVisible();
});
