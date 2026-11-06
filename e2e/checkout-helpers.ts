import { expect, type Page } from "@playwright/test";

/** One cake, a held day `monthsAhead` months on, delivery, the details, step 4. */
export async function stepFour(
  page: Page,
  // A later month at random, so tests running side by side (and their holds) rarely meet.
  monthsAhead = 2 + Math.floor(Math.random() * 9),
) {
  await page.goto("/cakes/the-lothian");
  await page.getByRole("textbox", { name: /Inscription/ }).fill("Happy 30th");
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
  await page.goto("/order/when");
  for (let i = 0; i < monthsAhead; i++)
    await page.getByRole("button", { name: "Next month" }).click();
  await page
    .locator("[data-shown] label[data-state=available]")
    .nth(Math.floor(Math.random() * 8))
    .click();
  await page.getByText("Delivered to you").click();
  await page
    .getByRole("textbox", { name: "Address", exact: true })
    .fill("48 Preston Road");
  await page
    .getByRole("textbox", { name: "Town", exact: true })
    .fill("Linlithgow");
  await page
    .getByRole("textbox", { name: "Postcode", exact: true })
    .fill("eh49 6hh");
  await page.getByText(/^Morning/).click();
  await page
    .getByRole("button", { name: /^(Continue to your details|Your details)$/ })
    .click();
  const chip = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button")
    .first();
  await expect(page.getByText(/is held for/).or(chip)).toBeVisible();
  if (await chip.isVisible()) await chip.click();
  await expect(page).toHaveURL(/order\/details$/);
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Mairi Sinclair");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("mairi@example.co.uk");
  await page
    .getByRole("textbox", { name: "Phone", exact: true })
    .fill("07700 900 000");
  await page
    .getByRole("checkbox", { name: /I have read and agree/ })
    .check({ force: true });
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/order\/pay$/);
}
