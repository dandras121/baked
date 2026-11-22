import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { mailSends, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.5b: Add an order (§9.6) — the form, the day's count and warnings, Save, e-mail 1, Owner only.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const name = (first: string) => `${first} ${tag}`;
// A far day of its own per run, so the counts are this test's alone.
const day = addDays(
  londonDate(new Date()),
  300 + Math.floor(Math.random() * 300),
);

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.customerName, `% ${tag}`));
  } finally {
    await close();
  }
});

test("Add an order: the count under the date, required fields, Save → the order with “Order saved”, cash line and e-mail 1", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders");
  await page.getByRole("link", { name: "Add an order" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Add an order" }),
  ).toBeVisible();
  await expect(
    page.getByText("Ask the customer for an e-mail address"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save the order" }).first().click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Nothing was saved" }),
  ).toHaveText("Nothing was saved — check the fields marked below.");
  await expect(
    page.getByText("Type their name — 2 to 80 characters."),
  ).toBeVisible();

  await page.getByLabel("Name", { exact: true }).fill(name("Mairi"));
  await expect(page.getByText("Ask Mairi for an e-mail address")).toBeVisible();
  await page.getByLabel("Phone", { exact: true }).fill("07700 900 000");
  await page.getByLabel("Email", { exact: true }).fill("mairi@example.co.uk");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await expect(
    page.getByText(
      /That day: \d+ of \d+ booked · that week: \d+ of \d+ booked/,
    ),
  ).toBeVisible();
  await page.getByLabel("Address", { exact: true }).fill("Hopetoun House");
  await page.getByLabel("Town", { exact: true }).fill("South Queensferry");
  await page.getByLabel("Postcode", { exact: true }).fill("IV1 1AA");
  await expect(
    page.getByText("Outside your delivery area — you can still save."),
  ).toBeVisible();
  await page.getByLabel("Postcode", { exact: true }).fill("EH30 9SL");
  await page.locator("label").filter({ hasText: /^Afternoon/ }).click();
  await page
    .getByLabel("What it is", { exact: true })
    .fill("Three tiers, ivory buttercream, sugar peonies in dusty pink");
  await page.getByLabel("Serves", { exact: true }).fill("100");
  await page
    .getByLabel("Tiers", { exact: true })
    .selectOption({ label: "Three tiers" });
  await page.getByLabel("Milk", { exact: true }).check();
  await page.getByLabel("Eggs", { exact: true }).check();
  await page.getByLabel("Total", { exact: true }).fill("380");
  await page.getByLabel("Paid so far", { exact: true }).fill("100");
  await page.locator("label").filter({ hasText: /^Cash$/ }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: ".shots/8.5b/add-order-1280.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save the order" }).first().click();

  await expect(page).toHaveURL(/\/admin\/orders\/BBL-\d{4}-\d{4}\?saved=1$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Order saved." }),
  ).toBeVisible();
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText("£380.00");
  await expect(money).toContainText(/Cash£100\.00 · \d+ \w{3}/);
  await expect(money).toContainText("Still to pay£280.00");
  await expect(page.getByRole("region", { name: "The cakes" })).toContainText(
    "Three tiers · serves 100",
  );
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Linda · Added the order by hand",
  );
  await page.screenshot({ path: ".shots/8.5b/saved-1280.png", fullPage: true });
  const { db, close } = connect();
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.customerName, name("Mairi")));
    expect(o.kind).toBe("manual");
    expect(
      await db
        .select()
        .from(mailSends)
        .where(eq(mailSends.key, `order:${o.id}:1:${o.id}`)),
    ).toHaveLength(1);
  } finally {
    await close();
  }
});

test("a full day: the calm warning, and saving is allowed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders/new");
  const fill = async (first: string) => {
    await page.getByLabel("Name", { exact: true }).fill(name(first));
    await page.getByLabel("Phone", { exact: true }).fill("07700 900 000");
    await page.getByLabel("Email", { exact: true }).fill("x@example.co.uk");
    await page.getByLabel("Date", { exact: true }).fill(day);
    await page
      .locator("label")
      .filter({ hasText: /^Collection$/ })
      .click();
    await page.getByLabel("What it is", { exact: true }).fill("A cake");
    await page.getByLabel("Serves", { exact: true }).fill("10");
    await page.getByLabel("Total", { exact: true }).fill("50");
  };
  // Fill the day up to its cap, then one more shows the warning.
  for (let i = 0; i < 6; i++) {
    await page.goto("/admin/orders/new");
    await fill(`Fill${i}`);
    await expect(page.getByText(/^That day: \d+ of \d+ booked/)).toBeVisible();
    const full = page.getByText(
      /^That day is full \(\d+ of \d+\) — saving puts it at \d+ of \d+\.$/,
    );
    if (await full.isVisible().catch(() => false)) {
      await page.screenshot({ path: ".shots/8.5b/full-day-1280.png" });
      await page
        .getByRole("button", { name: "Save the order" })
        .first()
        .click();
      await expect(page).toHaveURL(/saved=1$/);
      return;
    }
    await page.getByRole("button", { name: "Save the order" }).first().click();
    await expect(page).toHaveURL(/saved=1$/);
  }
  throw new Error("the day never showed as full");
});

test("leaving with unsaved changes asks first", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders/new");
  await page.getByLabel("Name", { exact: true }).fill("Someone");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Today", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Stay" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/new$/);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Someone");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Today", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(/\/admin\/today$/);
});

test("Owner only: a Helper is sent to Today", async ({ page }) => {
  await signIn(page, "Fiona", "helper");
  await page.goto("/admin/orders/new");
  await expect(page).toHaveURL(/\/admin\/today\?for=owner$/);
});

test("phone: one column with Save at the top", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders/new");
  await expect(
    page.getByRole("button", { name: "Save", exact: true }).first(),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: ".shots/8.5b/add-order-402.png",
    fullPage: true,
  });
});
