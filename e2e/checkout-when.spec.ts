import AxeBuilder from "@axe-core/playwright";
import { eq } from "drizzle-orm";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { drafts } from "../src/db/schema";

// Slice 4.2a: the calendar, capacity and the date hold (§5.2, §10.3, §10.4). Each test is its own connection
// (two live holds per connection, §10.3), so they never block each other.
const octet = () => Math.floor(Math.random() * 254) + 1;
const ip = () => `10.${octet()}.${octet()}.${octet()}`;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip() });
});

const shown = (page: Page) => page.locator("[data-shown]");
const available = (page: Page) =>
  shown(page).locator("label[data-state=available]");
const cont = (page: Page) =>
  page.getByRole("button", { name: /Continue to your details|Your details/ });

/** Step 2 also asks delivery or collection (4.2b); collection asks nothing more. */
const collect = (page: Page) => page.getByText("Collect from me").click();

async function addCakes(page: Page, n = 1) {
  for (let i = 0; i < n; i++) {
    await page.goto("/cakes/the-lothian");
    await page
      .getByRole("textbox", { name: /Inscription/ })
      .fill(`Cake ${i + 1}`);
    await page.getByRole("button", { name: "Add to your order" }).click();
    await expect(
      page.getByRole("heading", { name: "Added to your order" }),
    ).toBeVisible();
  }
}

/** Moves the calendar on to a later month, so tests running side by side (and their 20-minute holds) rarely meet. */
async function laterMonth(page: Page) {
  const steps = 2 + Math.floor(Math.random() * 9);
  for (let i = 0; i < steps; i++)
    await page.getByRole("button", { name: "Next month" }).click();
}

/** The value of the n-th free day shown, and a locator that keeps pointing at that day. */
async function freeDay(page: Page, n: number) {
  const value = (await available(page)
    .nth(n)
    .locator("input")
    .getAttribute("value"))!;
  return { value, label: page.locator(`label:has(input[value="${value}"])`) };
}

/** Picks a free day and continues; when another test took it meanwhile, the first chip holds a near one. */
async function holdSomeDay(page: Page, n = 1) {
  const { label } = await freeDay(page, n);
  await label.click();
  await collect(page);
  await cont(page).click();
  const chip = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button")
    .first();
  await expect(page.getByText(/is held for/).or(chip)).toBeVisible();
  if (await chip.isVisible()) await chip.click();
  await expect(page).toHaveURL(/order\/details$/);
}

/** Sets this visitor's hold to end `ms` from now (the hold is kept on the server). */
async function holdEndsIn(page: Page, ms: number) {
  const id = (await page.context().cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  process.loadEnvFile?.(".env.local");
  const { db, close } = connect();
  try {
    await db
      .update(drafts)
      .set({ holdExpiresAt: new Date(Date.now() + ms) })
      .where(eq(drafts.id, id));
  } finally {
    await close();
  }
}

test("too-soon days are greyed and cannot be picked; an available day is chosen and named in the hold line", async ({
  page,
}) => {
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  await expect(
    page.getByText(/Greyed-out days are too soon \(I need five days’ notice\)/),
  ).toBeVisible();
  const tooSoon = shown(page)
    .locator("label[data-state=too-soon] input")
    .first();
  if (await tooSoon.count())
    await expect(tooSoon).toHaveAttribute("aria-disabled", "true");
  const { label: day } = await freeDay(page, 2);
  await day.click();
  await expect(day).toHaveAttribute("data-state", "selected");
  await expect(
    page.getByText(
      /^Continue and I will hold \w+ \d+ \w+( \d{4})? for you for 20 minutes\.$/,
    ),
  ).toBeVisible();
});

test("Continue without a day: “Pick a day in the calendar.”", async ({
  page,
}) => {
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  await cont(page).click();
  await expect(page.getByText("Pick a day in the calendar.")).toBeVisible();
  await expect(page).toHaveURL(/order\/when/);
});

test("Continue holds the day: step 3 counts down from 20 minutes; the summary and step 2 show the day", async ({
  page,
}, testInfo) => {
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  const day = available(page).nth(3);
  const label = (await day.locator("input").getAttribute("aria-label"))!.split(
    ",",
  )[0];
  await day.click();
  await collect(page);
  await cont(page).click();
  await expect(page).toHaveURL(/order\/details$/);
  await expect(
    page.getByText(new RegExp(`^${label} is held for (20:00|19:5\\d)$`)),
  ).toBeVisible();
  if (testInfo.project.name !== "phone")
    await expect(
      page.getByRole("complementary", { name: "Your order" }),
    ).toContainText(label);
  await page.goto("/order/when");
  await expect(
    page.locator(`label[data-state=selected] input[aria-label^="${label}"]`),
  ).toBeAttached();
});

test("months: back is disabled in the current month; the last month says how to ask beyond it", async ({
  page,
}) => {
  await addCakes(page);
  await page.goto("/order/when");
  const prev = page.getByRole("button", { name: "Previous month" });
  const next = page.getByRole("button", { name: "Next month" });
  if ((await page.locator("[data-shown]").getAttribute("class"))?.length)
    for (let i = 0; i < 12 && (await next.isEnabled()); i++) await next.click();
  await expect(next).toBeDisabled();
  await expect(page.getByText(/For a date beyond/)).toBeVisible();
  for (let i = 0; i < 12 && (await prev.isEnabled()); i++) await prev.click();
  await expect(prev).toBeDisabled();
});

test("keyboard: Enter picks the focused day; arrows move by day and week", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  const { value, label } = await freeDay(page, 0);
  await label.locator("input").focus();
  await page.keyboard.press("Enter");
  await expect(label).toHaveAttribute("data-state", "selected");
  const after = (days: number) => {
    const d = new Date(`${value}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const focused = () =>
    page.evaluate(() => (document.activeElement as HTMLInputElement).value);
  await page.keyboard.press("ArrowRight");
  await expect.poll(focused).toBe(after(1));
  await page.keyboard.press("ArrowDown");
  await expect.poll(focused).toBe(after(8));
});

test("two minutes left: Keep holding gives 20 more minutes", async ({
  page,
}) => {
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  await holdSomeDay(page, 1);
  await holdEndsIn(page, 90_000);
  await page.reload();
  await page
    .getByRole("button", { name: "Keep holding for 20 more minutes" })
    .click();
  await expect(page.getByText(/is held for (20:00|19:5\d)$/)).toBeVisible();
});

test("the hold runs out: “Your twenty minutes are up”, the same day first among the chips, a chip holds it again", async ({
  page,
}) => {
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  await holdSomeDay(page, 5);
  const held = (await page.getByText(/is held for/).textContent())!.match(
    /^\w+ (\d+)/,
  )![1];
  await holdEndsIn(page, -1000);
  await page.reload();
  await expect(page.getByText("Your twenty minutes are up")).toBeVisible();
  await expect(
    page.getByText(
      /has gone back into the calendar and nothing has been charged/,
    ),
  ).toBeVisible();
  const chips = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button");
  await expect(chips).toHaveCount(3);
  await expect(chips.first()).toContainText(` ${held} `);
  await chips.first().click();
  await expect(page.getByText(/is held for (20:00|19:5\d)$/)).toBeVisible();
});

test("the day went while this visitor was choosing: B with three nearest dates; a chip holds one", async ({
  page,
  browser,
}) => {
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  const day = available(page).nth(6);
  const value = (await day.locator("input").getAttribute("value"))!;
  await day.click();
  // Someone else holds the same day with two cakes (the daily cap is 2).
  await otherVisitorHolds(browser, value);
  await collect(page);
  await cont(page).click();
  await expect(page.getByText(/has just gone$/)).toBeVisible();
  const chips = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button");
  await expect(chips).toHaveCount(3);
  // A chip holds its day and goes on (when tests running alongside took that one too, the next chips show).
  await chips.first().click();
  await expect(page).toHaveURL(/order\/details$/);
});

async function otherVisitorHolds(browser: Browser, date: string) {
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": ip() },
  });
  const other = await ctx.newPage();
  await addCakes(other, 2);
  await other.goto("/order/when");
  const target = other.locator(`label:has(input[value="${date}"])`);
  // Move the shown month to the one with the day.
  for (let i = 0; i < 13 && !(await target.isVisible()); i++)
    await other.getByRole("button", { name: "Next month" }).click();
  await target.click();
  await collect(other);
  await other
    .getByRole("button", { name: /Continue to your details|Your details/ })
    .click();
  await expect(other).toHaveURL(/order\/details$/);
  await ctx.close();
}

test("axe: step 2 with a day chosen, step 3 with the hold line; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await addCakes(page);
  await page.goto("/order/when");
  await laterMonth(page);
  await (await freeDay(page, 2)).label.click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_when.png`),
    fullPage: true,
  });
  await page.goto("/order/when");
  await laterMonth(page);
  await holdSomeDay(page, 2);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
