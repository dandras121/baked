import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 4.1: the step pages, their routing (§10.2), the stepper (§5) and the order summary (§5.2).
const isPhone = (name: string) => name === "phone";

async function addCake(page: Page, slug: string, text: string) {
  await page.goto(`/cakes/${slug}`);
  if (slug === "bramble-and-cream")
    await page.getByText("Chocolate", { exact: true }).click();
  await page.getByRole("textbox", { name: /Inscription/ }).fill(text);
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
}

test("§10.2 without a draft every step goes to /cakes", async ({ page }) => {
  for (const path of ["/order/when", "/order/details", "/order/pay"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/cakes$/);
  }
});

test("§10.2 a later step before step 2 is complete goes to step 2", async ({
  page,
}) => {
  await addCake(page, "the-lothian", "Happy 30th, Mairi");
  for (const path of ["/order/details", "/order/pay"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/order\/when$/);
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Name a day.",
  );
  await expect(page).toHaveTitle(/When & where/);
});

test("the stepper: step 1 done and a link to the last cake in edit mode; step 2 current; 3 and 4 not links", async ({
  page,
}, testInfo) => {
  test.skip(isPhone(testInfo.project.name), "the phone shows dots");
  await addCake(page, "the-lothian", "First");
  await addCake(page, "sugar-peony", "Second");
  await page.goto("/order/when");
  const nav = page.getByRole("navigation", { name: "Checkout steps" });
  const cake = nav.getByRole("link", { name: /The cake/ });
  await expect(cake).toHaveAttribute(
    "href",
    /\/cakes\/sugar-peony\?line=\d+&from=when/,
  );
  await expect(nav.locator("[aria-current=step]")).toContainText(
    "When & where",
  );
  await expect(nav.getByRole("link")).toHaveCount(1);
});

test("phone: four dots and “Step 2 of 4 · When & where”; no summary column", async ({
  page,
}, testInfo) => {
  test.skip(!isPhone(testInfo.project.name), "phone only");
  await addCake(page, "the-lothian", "Mairi");
  await page.goto("/order/when");
  await expect(page.getByText("Step 2 of 4 · When & where")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Your order" }),
  ).toBeHidden();
});

test("the order summary: each cake with Edit and Remove, the date not chosen yet, the total", async ({
  page,
}, testInfo) => {
  test.skip(isPhone(testInfo.project.name), "desktop and tablet");
  await addCake(page, "the-lothian", "Happy 30th, Mairi");
  await addCake(page, "bramble-and-cream", "Isla");
  await page.goto("/order/when");
  const summary = page.getByRole("complementary", { name: "Your order" });
  await expect(summary.locator("[data-line]")).toHaveCount(2);
  await expect(summary).toContainText("The Lothian");
  await expect(summary).toContainText("Two tiers · serves 24");
  await expect(summary).toContainText("“Happy 30th, Mairi”");
  await expect(summary).toContainText("Sponge: Chocolate");
  await expect(summary).toContainText("Not chosen yet");
  await expect(summary).toContainText("£375");
  await expect(
    summary.getByRole("link", { name: "Edit The Lothian" }),
  ).toHaveAttribute("href", /\/cakes\/the-lothian\?line=\d+&from=when/);
});

test("Remove takes the cake out; the last one leaves “There is nothing in your order”", async ({
  page,
}, testInfo) => {
  test.skip(
    isPhone(testInfo.project.name),
    "Remove sits in the summary column",
  );
  await addCake(page, "the-lothian", "One");
  await addCake(page, "sugar-peony", "Two");
  await page.goto("/order/when");
  const summary = page.getByRole("complementary", { name: "Your order" });
  await summary.getByRole("button", { name: "Remove The Lothian" }).click();
  await expect(summary.locator("[data-line]")).toHaveCount(1);
  await expect(summary).toContainText("Sugar Peony");
  await summary.getByRole("button", { name: "Remove Sugar Peony" }).click();
  await expect(
    page.getByRole("heading", { name: "There is nothing in your order" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to the designs →" }),
  ).toHaveAttribute("href", "/cakes");
  await expect(
    page.getByRole("link", { name: "Start a bespoke enquiry" }).first(),
  ).toHaveAttribute("href", "/bespoke");
});

test("← Back to the cake opens the last cake added in edit mode", async ({
  page,
}) => {
  await addCake(page, "the-lothian", "Back test");
  await page.goto("/order/when");
  await page.getByRole("link", { name: "← Back to the cake" }).click();
  await expect(page).toHaveURL(/\/cakes\/the-lothian\?line=\d+&from=when/);
  await expect(page.getByRole("textbox", { name: /Inscription/ })).toHaveValue(
    "Back test",
  );
});

test("the cake page shows the stepper at step 1", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes/the-lothian");
  if (isPhone(testInfo.project.name))
    await expect(page.getByText("Step 1 of 4 · The cake")).toBeVisible();
  else
    await expect(
      page
        .getByRole("navigation", { name: "Checkout steps" })
        .locator("[aria-current=step]"),
    ).toContainText("The cake");
});

test("axe: step 2 and the empty order; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await addCake(page, "the-lothian", "Axe");
  await page.goto("/order/when");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_step2.png`),
    fullPage: true,
  });
});
