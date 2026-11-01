import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 4.2b: delivery or collection, the address and the postcode area, the windows, the summary's handover row and
// the phone's sticky summary bar (§5.2, §5 Phone, §11.1). Each test is its own connection (two holds each, §10.3).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

const cont = (page: Page) =>
  page.getByRole("button", {
    name: /^(Continue to your details|Your details)$/,
  });
const field = (page: Page, name: string) =>
  page.getByRole("textbox", { name, exact: true });

/** One cake, step 2, a later month (tests side by side rarely meet), and a free day chosen. */
async function stepTwoWithDay(page: Page) {
  await page.goto("/cakes/the-lothian");
  await page.getByRole("textbox", { name: /Inscription/ }).fill("Happy 30th");
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
  await page.goto("/order/when");
  const steps = 2 + Math.floor(Math.random() * 9);
  for (let i = 0; i < steps; i++)
    await page.getByRole("button", { name: "Next month" }).click();
  await page
    .locator("[data-shown] label[data-state=available]")
    .nth(Math.floor(Math.random() * 4))
    .click();
}

async function fillDelivery(page: Page, postcode = "eh49 6hh") {
  await page.getByText("Delivered to you").click();
  await field(page, "Address").fill("48 Preston Road");
  await field(page, "Town").fill("Linlithgow");
  await field(page, "Postcode").fill(postcode);
  await field(page, "Postcode").blur();
}

/** Continue; when tests alongside took the day meanwhile, the first chip holds a near one. */
async function goOn(page: Page) {
  await cont(page).click();
  const chip = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button")
    .first();
  await expect(page.getByText(/is held for/).or(chip)).toBeVisible();
  if (await chip.isVisible()) await chip.click();
  await expect(page).toHaveURL(/order\/details$/);
}

test("Continue with no answer: “Choose delivery or collection.”; delivery without answers: one error under each", async ({
  page,
}) => {
  await stepTwoWithDay(page);
  await cont(page).click();
  await expect(page.getByText("Choose delivery or collection.")).toBeVisible();
  await expect(page).toHaveURL(/order\/when$/);
  await page.getByText("Delivered to you").click();
  await cont(page).click();
  for (const e of [
    "Enter the street address.",
    "Enter the town.",
    "Enter a full postcode, like EH52 6AA.",
    "Choose a time window.",
  ])
    await expect(page.getByText(e)).toBeVisible();
  // The focus goes to the first field with an error.
  await expect(field(page, "Address")).toBeFocused();
});

test("a postcode outside the area: the notice on blur, Continue does not go on, Collect clears it", async ({
  page,
}) => {
  await stepTwoWithDay(page);
  await fillDelivery(page, "g2 3ab");
  await expect(field(page, "Postcode")).toHaveValue("G2 3AB");
  const notice = page.getByText(
    "I do not deliver to G2 — it is outside Edinburgh & the Lothians.",
  );
  await expect(notice).toBeVisible();
  await expect(page.getByText(/Collection is still open/)).toBeVisible();
  await page.getByText(/^Morning/).click();
  await cont(page).click();
  await expect(notice).toBeVisible();
  await expect(page).toHaveURL(/order\/when$/);
  await page.getByText("Collect from me").click();
  await expect(notice).toBeHidden();
  await expect(field(page, "Address")).toBeHidden();
});

test("delivery: the window goes into the summary; back on step 2 every answer is still there", async ({
  page,
}, testInfo) => {
  await stepTwoWithDay(page);
  await fillDelivery(page);
  await page.getByText(/^Evening/).click();
  await goOn(page);
  if (testInfo.project.name !== "phone") {
    const summary = page.getByRole("complementary", { name: "Your order" });
    await expect(summary).toContainText("Delivery · evening");
    await expect(summary).toContainText("Free");
  }
  await page.goto("/order/when");
  await expect(field(page, "Address")).toHaveValue("48 Preston Road");
  await expect(field(page, "Town")).toHaveValue("Linlithgow");
  await expect(field(page, "Postcode")).toHaveValue("EH49 6HH");
  await expect(
    page.getByRole("radio", { name: "Evening · 4 – 7pm" }),
  ).toBeChecked();
});

test("collection asks for no address and no time; the summary says “Collection time — Agreed with Linda”", async ({
  page,
}, testInfo) => {
  await stepTwoWithDay(page);
  await page.getByText("Collect from me").click();
  await expect(
    page.getByText("20 Church View, Winchburgh — free, at a time we agree"),
  ).toBeVisible();
  await expect(page.getByText("What time?")).toBeHidden();
  await goOn(page);
  if (testInfo.project.name !== "phone") {
    const summary = page.getByRole("complementary", { name: "Your order" });
    await expect(summary).toContainText("Collection time");
    await expect(summary).toContainText("Agreed with Linda");
  }
});

test("phone: the sticky bar shows the total and the handover, opens the order as a sheet, and its Continue submits step 2", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the bar is phone only");
  await stepTwoWithDay(page);
  const bar = page.getByRole("region", { name: "Order summary" }).last();
  await expect(bar).toContainText("£185");
  await expect(bar).toContainText("1 cake · delivery free");
  await bar.getByRole("button", { name: /show your order/ }).click();
  const sheet = page.getByRole("dialog", { name: "Your order" });
  await expect(sheet).toContainText("The Lothian");
  await expect(sheet.getByRole("button", { name: /Remove/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await page.getByText("Collect from me").click();
  await bar.getByRole("button", { name: "Continue →" }).click();
  const chip = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button")
    .first();
  await expect(page.getByText(/is held for/).or(chip)).toBeVisible();
  if (await chip.isVisible()) await chip.click();
  await expect(page).toHaveURL(/order\/details$/);
  const held = page.getByRole("region", { name: "Order summary" }).last();
  await expect(held).toContainText("1 cake · collection free");
  await expect(held).toContainText(/Held \d+:\d\d/);
});

test("tablet and desktop: no sticky bar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "the phone has the bar");
  await stepTwoWithDay(page);
  await expect(
    page.getByRole("region", { name: "Order summary" }),
  ).toBeHidden();
});

test("axe: delivery with the outside-area notice and the errors; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stepTwoWithDay(page);
  await fillDelivery(page, "g2 3ab");
  await cont(page).click();
  await expect(page.getByText("Choose a time window.")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_where.png`),
    fullPage: true,
  });
});
