import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { mailSends, orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.6a: Change the order (§9.7) — the order's own fields; Owner and Helper.
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const num = (first: string) => `BBL-E2G-${tag}-${first}`;
const day = addDays(today, 50);

async function addOrder(first: string) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: num(first),
        token: `e2e-change-${tag}-${first}-padding`,
        date: day,
        earliestDate: day,
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        town: "Linlithgow",
        postcode: "EH49 6HH",
        customerName: `${first} Sinclair`,
        email: `${first.toLowerCase()}@example.co.uk`,
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_e2g_${tag}_${first}`,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning();
    await db.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "Two tiers · serves 24",
      pricePence: 18500,
      allergenText: "Contains: wheat, egg, milk",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
}

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2G-${tag}-%`));
  } finally {
    await close();
  }
});
test.beforeAll(async () => {
  for (const f of ["Mairi", "Ewan"]) await addOrder(f);
});

test("an Owner moves the date and window: the tick box appears, Save → Order detail, HISTORY, e-mail 12", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Mairi")}`);
  await page.getByRole("link", { name: "Change the order" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Change the order" }),
  ).toBeVisible();
  await expect(
    page.getByText(`${num("Mairi")} · Mairi Sinclair`),
  ).toBeVisible();
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  const region = page.getByRole("region", { name: "Price impact" });
  await expect(region).toContainText("Current total£185.00");
  await page.getByLabel("Date", { exact: true }).fill(addDays(day, 7));
  await expect(
    page.getByLabel("The customer asked for this"),
  ).not.toBeChecked();
  await expect(page.getByText(/That day: \d+ of \d+ booked/)).toBeVisible();
  await page
    .getByLabel("Window", { exact: true })
    .selectOption({ label: "Evening 4–7pm" });
  await expect(save).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: ".shots/8.6a/change-1280.png",
    fullPage: true,
  });
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Mairi")}$`));
  await expect(
    page.getByRole("region", { name: "Where and when" }),
  ).toContainText("Evening · 4 – 7pm");
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Linda · Changed the order · Date:",
  );
  const { db, close } = connect();
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.number, num("Mairi")));
    expect(String(o.earliestDate)).toBe(addDays(day, 7));
    const m = (await db.select().from(mailSends)).filter((x) =>
      x.key.startsWith(`order:${o.id}:12:`),
    );
    expect(m).toHaveLength(1);
  } finally {
    await close();
  }
});

test("a Helper: no money panel, the footnote without money; Discard changes goes back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders/${num("Ewan")}/change`);
  await expect(page.getByRole("region", { name: "Price impact" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Saving sends Ewan e-mail 12 with old → new.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Ewan")}$`));
});

test("phone: back to the order, one column", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Ewan")}/change`);
  await expect(
    page.getByRole("link", { name: "‹ Back to order" }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.6a/change-402.png", fullPage: true });
});
