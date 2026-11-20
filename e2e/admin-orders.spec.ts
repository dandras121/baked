import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.4a: Orders (§9.4) — filters, search, paging, the URL keeps the view.
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function addOrder(
  first: string,
  over: Partial<typeof orders.$inferInsert>,
) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: `BBL-E2O-${tag}-${first}`,
        token: `e2e-orders-${tag}-${first}-padding`,
        date: addDays(today, 3),
        earliestDate: today,
        handover: "delivery",
        deliveryWindow: "morning",
        town: "Linlithgow",
        postcode: "EH49 6HH",
        customerName: `${first} ${tag}`,
        email: `${first.toLowerCase()}@example.co.uk`,
        phone: "07700 900 000",
        phoneE164: "+447700900000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: new Date(),
        ...over,
      })
      .returning();
    await db.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "serves 12",
      pricePence: o.totalPence,
      allergenText: "",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
}

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2O-${tag}-%`));
  } finally {
    await close();
  }
});

test.beforeAll(async () => {
  await addOrder("Eilidh", {});
  await addOrder("Douglas", { amountReceivedPence: 8000, totalPence: 32000 });
  await addOrder("Rhona", { status: "cancelled", date: addDays(today, -40) });
  await addOrder("Ailsa", {
    status: "completed",
    date: addDays(today, -2),
    handover: "collection",
    deliveryWindow: null,
  });
});

test("an Owner's Orders: subtitle, filters, search, the URL keeps the view, Back returns", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders");
  await expect(
    page.getByRole("heading", { level: 1, name: "Orders" }),
  ).toBeVisible();
  await expect(
    page.getByText(/this year · £[\d,.]+ taken · £[\d,.]+ still to pay/),
  ).toBeVisible();
  for (const f of [
    "All",
    "This week",
    "Upcoming",
    "Completed",
    "Cancelled",
    "To pay",
  ])
    await expect(
      page.getByRole("link", { name: f, exact: true }),
    ).toBeVisible();
  await expect(page.getByRole("link", { name: "Add an order" })).toBeVisible();
  await page.screenshot({ path: ".shots/8.4a/orders-all-1280.png" });

  const search = page.getByRole("searchbox", { name: /Search orders/ });
  await search.fill(tag);
  await expect(page).toHaveURL(new RegExp(`q=${tag}`));
  const rows = page.getByRole("list").last().getByRole("link");
  await expect(rows).toHaveCount(4);
  // Upcoming first (date ascending), then the past (date descending).
  await expect(rows.nth(0)).toHaveAccessibleName(/Eilidh|Douglas/);
  await expect(rows.nth(3)).toHaveAccessibleName(new RegExp(`Rhona ${tag}`));
  await expect(page.getByText("Showing 4 of 4")).toBeVisible();
  const douglas = page.getByRole("link", {
    name: new RegExp(`Douglas ${tag}`),
  });
  await expect(douglas).toContainText("£80 of £320");
  await expect(
    page.getByRole("link", { name: new RegExp(`Rhona ${tag}`) }),
  ).toContainText("Cancelled");
  await expect(
    page.getByRole("link", { name: new RegExp(`Ailsa ${tag}`) }),
  ).toContainText("Collection");
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: ".shots/8.4a/orders-1280.png",
    fullPage: true,
  });

  await page.getByRole("link", { name: "To pay", exact: true }).click();
  await expect(page).toHaveURL(/filter=topay/);
  await expect(page).toHaveURL(new RegExp(`q=${tag}`));
  await expect(rows).toHaveCount(1);
  await douglas.click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/orders/BBL-E2O-${tag}-Douglas`),
  );
  await page.goBack();
  await expect(page).toHaveURL(/filter=topay/);
  await expect(search).toHaveValue(tag);

  await search.fill(`zz${tag}`);
  await expect(page.getByText(`Nothing matches “zz${tag}”`)).toBeVisible();
  await page.getByRole("link", { name: "Clear the search" }).click();
  await expect(search).toHaveValue("");
});

test("Show 20 more loads the next 20", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders");
  const showing = page.getByText(/^Showing \d+ of \d+$/);
  const total = Number((await showing.innerText()).split(" of ")[1]);
  test.skip(total <= 20, "needs more than 20 orders");
  await page.getByRole("link", { name: "Show 20 more" }).click();
  await expect(page).toHaveURL(/shown=40/);
  // Other tests add and remove orders meanwhile: only the 40 is checked.
  await expect(showing).toHaveText(/^Showing 40 of \d+$/);
});

test("a Helper's Orders: no PAID column, no To pay, no Add an order, no money subtitle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders?q=${tag}&filter=topay`);
  await expect(
    page.getByRole("link", { name: "To pay", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add an order" })).toHaveCount(0);
  await expect(page.getByText(/still to pay/)).toHaveCount(0);
  await expect(page.getByText("£80 of £320")).toHaveCount(0);
  await expect(page.getByRole("list").last().getByRole("link")).toHaveCount(4);
});

test("phone: search above the pills, All · This week · To pay, rows as cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible()) await notNow.click();
  await page.goto("/admin/orders");
  await expect(page.getByPlaceholder("Search by name or number")).toBeVisible();
  await page.screenshot({ path: ".shots/8.4a/orders-all-402.png" });
  await page.goto(`/admin/orders?q=${tag}`);
  await expect(page.getByPlaceholder("Search by name or number")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Upcoming", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("link", { name: "To pay", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add", exact: true }),
  ).toBeVisible();
  const box = await page.getByRole("searchbox").boundingBox();
  const pill = await page
    .getByRole("link", { name: "All", exact: true })
    .boundingBox();
  expect(box!.y).toBeLessThan(pill!.y);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.4a/orders-402.png", fullPage: true });
});
