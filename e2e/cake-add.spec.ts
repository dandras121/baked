import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 3.6b: the inscription, Add to your order, “Leave the cake plain?”, “Added to your order” and the 5-cake cap
// (§5.1, §5.8, §10.2). Every test starts without a draft (a new browser context has no bbl_session).
const add = (page: Page) =>
  page.getByRole("button", { name: "Add to your order" });
const field = (page: Page) =>
  page.getByRole("textbox", { name: /Inscription/ });
const sheet = (page: Page) =>
  page.getByRole("dialog", { name: "Leave the cake plain?" });
const added = (page: Page) =>
  page.getByRole("heading", { name: "Added to your order" });

async function addLothian(page: Page, text = "Happy 30th, Mairi") {
  await page.goto("/cakes/the-lothian");
  await field(page).fill(text);
  await add(page).click();
  await expect(added(page)).toBeFocused();
}

test("the inscription: live counter and preview; the price line says with inscription", async ({
  page,
}) => {
  await page.goto("/cakes/the-lothian");
  await expect(
    page.getByText("No message — the cake goes out plain"),
  ).toBeVisible();
  await expect(page.getByText("Serves 24 · plain")).toBeVisible();
  await field(page).fill("Happy 30th, Mairi");
  await expect(page.getByText("17 / 24")).toBeVisible();
  await expect(
    page.getByText("Happy 30th, Mairi", { exact: true }).last(),
  ).toBeVisible();
  await expect(page.getByText("Serves 24 · with inscription")).toBeVisible();
});

test("too long or not pipeable: the message under the field, and nothing is added", async ({
  page,
}) => {
  await page.goto("/cakes/the-lothian");
  await field(page).fill("Happy thirtieth birthday Mairi");
  await add(page).click();
  await expect(
    page.getByText(
      "That is a little too long — 24 characters fit on the cake.",
    ),
  ).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(added(page)).toHaveCount(0);
  await field(page).fill("Happy 🎂");
  await expect(
    page.getByText(
      "Emoji and symbols cannot be piped — please use letters and numbers.",
    ),
  ).toBeVisible();
  // Corrected, the message goes.
  await field(page).fill("Mum’s day");
  await expect(page.getByText(/cannot be piped/)).toHaveCount(0);
});

test("a required option missing: “Choose a sponge.”, focus on it, nothing added", async ({
  page,
}) => {
  await page.goto("/cakes/bramble-and-cream");
  await field(page).fill("Isla");
  await add(page).click();
  await expect(page.getByText("Choose a sponge.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Vanilla/ })).toBeFocused();
  await expect(added(page)).toHaveCount(0);
});

test("empty inscription: “Leave the cake plain?”; Add a message and Esc go back to the field", async ({
  page,
}) => {
  await page.goto("/cakes/the-lothian");
  await add(page).click();
  await expect(sheet(page)).toBeVisible();
  await page.getByRole("button", { name: "Add a message" }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(field(page)).toBeFocused();
  await add(page).click();
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(field(page)).toBeFocused();
  await expect(added(page)).toHaveCount(0);
});

test("Yes, keep it plain: added with “no message”; the cookie is httpOnly", async ({
  page,
  context,
}) => {
  await page.goto("/cakes/bramble-and-cream");
  await page.getByText("Chocolate", { exact: true }).click();
  await add(page).click();
  await page.getByRole("button", { name: "Yes, keep it plain" }).click();
  await expect(added(page)).toBeFocused();
  const panel = page.getByRole("region", { name: "Added to your order" });
  await expect(panel).toContainText("Bramble & Cream · serves 24 · no message");
  await expect(panel).toContainText("Sponge: Chocolate");
  await expect(panel).toContainText("£190");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "bbl_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(6.9 * 86_400);
  await expect(
    panel.getByRole("link", { name: "Add another cake" }),
  ).toHaveAttribute("href", "/cakes");
  await expect(
    panel.getByRole("link", { name: "Continue to date and delivery →" }),
  ).toHaveAttribute("href", "/order/when");
});

test("a second cake joins the same order", async ({ page }) => {
  await addLothian(page);
  await page.goto("/cakes/sugar-peony");
  await field(page).fill("Isla");
  await add(page).click();
  const panel = page.getByRole("region", { name: "Added to your order" });
  await expect(panel.getByRole("listitem")).toHaveCount(2);
  await expect(panel).toContainText(
    "The Lothian · serves 24 · “Happy 30th, Mairi”",
  );
  await expect(panel).toContainText("Sugar Peony · serves 24 · “Isla”");
});

test("with a draft, Continue to date and delivery opens step 2", async ({ page }) => {
  await addLothian(page);
  await page.getByRole("link", { name: "Continue to date and delivery →" }).click();
  await expect(page).toHaveURL(/\/order\/when$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("When & where");
});

test("a cake without an inscription: no field, no question, no “plain”", async ({
  page,
}) => {
  await page.goto("/cakes/confetti-drum");
  await expect(field(page)).toHaveCount(0);
  await expect(page.getByText("How it will look")).toHaveCount(0);
  await expect(page.locator("[class*=detail]")).toHaveText("Serves 24");
  await add(page).click();
  await expect(added(page)).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Added to your order" }),
  ).toContainText("Confetti Drum · serves 24");
});

test("the 5-cake cap: the sixth shows the notice, nothing is added, no question first", async ({
  page,
}) => {
  test.slow();
  for (let i = 0; i < 5; i++) await addLothian(page, `Cake ${i + 1}`);
  await page.goto("/cakes/the-lothian");
  await add(page).click(); // empty inscription: the cap comes before the plain question
  await expect(sheet(page)).toHaveCount(0);
  const cap = page.getByRole("region", { name: "Your order" });
  await expect(cap).toContainText("Cakes in this order");
  await expect(cap).toContainText("Five");
  await expect(cap).toContainText("Adding a sixth");
  await expect(cap).toContainText("Five is the most one order can hold.");
  await expect(page.getByText("Nothing extra has been added")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Send an enquiry" }),
  ).toHaveAttribute("href", "/bespoke");
});

test("axe: the form with errors, the sheet and the added panel; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/bramble-and-cream");
  await add(page).click();
  await expect(page.getByText("Choose a sponge.")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByText("Vanilla", { exact: true }).click();
  await add(page).click();
  await expect(sheet(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_plain.png`),
  });
  await page.getByRole("button", { name: "Yes, keep it plain" }).click();
  await expect(added(page)).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_added.png`),
    fullPage: true,
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the form posts; the plain question comes back; then the cake is added", async ({
    page,
  }) => {
    await page.goto("/cakes/the-lothian");
    await add(page).click();
    await expect(page.getByText("Leave the cake plain?")).toBeVisible();
    await page.getByRole("button", { name: "Yes, keep it plain" }).click();
    await expect(
      page.getByRole("heading", { name: "Added to your order" }),
    ).toBeVisible();
    await expect(
      page.getByText("The Lothian · serves 24 · no message"),
    ).toBeVisible();
  });
});
