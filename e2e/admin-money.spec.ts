import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.8a: Money (§9.9) — tiles, STILL TO PAY with Send a payment link, the note, PAID IN FULL; Owner only.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const number = `BBL-E2Y-${tag}`;

test.beforeAll(async () => {
  const { db, close } = connect();
  try {
    const day = addDays(londonDate(new Date()), 3);
    await db.insert(orders).values({
      number,
      token: `e2e-money-${tag}-padding-padding`,
      date: day,
      earliestDate: day,
      handover: "collection",
      customerName: `Fiona ${tag}`,
      email: "fiona@example.co.uk",
      phone: "07700 900 000",
      consents: {},
      totalPence: 32000,
      amountReceivedPence: 8000,
      snapshot: {},
      confirmedAt: new Date(),
    });
  } finally {
    await close();
  }
});

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2Y-${tag}`));
  } finally {
    await close();
  }
});

test("Owner: tiles, the order's row with its sums, Send a payment link, the note and PAID IN FULL", async ({
  page,
}) => {
  await signIn(page, "Linda");
  await page.goto("/admin/money");
  await expect(
    page.getByRole("heading", { level: 1, name: "Money" }),
  ).toBeVisible();
  await expect(
    page.getByText(/^£[\d,.]+ still to pay across \d+ orders?$/),
  ).toBeVisible();
  const tiles = page.getByRole("list", { name: "Money in numbers" });
  for (const t of [
    "still to pay",
    "paid this week",
    "unpaid, date within 7 days",
    "taken this year",
  ])
    await expect(tiles.getByText(t, { exact: true })).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: number });
  await expect(row).toContainText("£320");
  await expect(row).toContainText("£80.00");
  await expect(row).toContainText("£240.00");
  await expect(
    page.getByText(/Marking a payment by hand is for cash or bank transfer/),
  ).toBeVisible();
  await expect(
    page.getByText(/^\d+ orders? · £[\d,.]+ · nothing outstanding$/),
  ).toBeVisible();
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  await row.getByRole("button", { name: "Send a payment link" }).click();
  const dialog = page.getByRole("dialog", { name: "Send a payment link" });
  await expect(dialog.getByLabel("Amount")).toHaveValue("240");
  await dialog.getByRole("button", { name: "Send the link" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText(/Sent \d+ \w{3} · £240/);

  await row.getByRole("link", { name: number }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/orders/${number}\\?from=money$`),
  );
  // The back link (hidden beside the sidebar on wide screens) names Money.
  await expect(
    page.locator('a[href="/admin/money"]').filter({ hasText: "Back to money" }),
  ).toHaveCount(1);
});

test("a Helper cannot open Money", async ({ page }) => {
  await signIn(page, "Fiona", "helper");
  await page.goto("/admin/money");
  await expect(page).toHaveURL(/\/admin\/today\?for=owner$/);
});
