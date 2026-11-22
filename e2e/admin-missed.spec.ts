import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import {
  deliveryAttempts,
  orderHistory,
  orderLines,
  orders,
} from "../src/db/schema";
import { londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.4d: after Nobody was in (§9.5) — Delivered after all, Record their choice; the delivery link afterwards.
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const num = (first: string) => `BBL-E2M-${tag}-${first}`;
const token = (first: string) => `e2emissed${tag}${first}padding`;

async function missedOrder(first: string) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: num(first),
        token: `e2e-missed-${tag}-${first}-padding`,
        date: today,
        earliestDate: today,
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
    await db.insert(deliveryAttempts).values({
      orderId: o.id,
      attempt: 1,
      day: today,
      deliveryWindow: "morning",
      outcome: "nobody-in",
      recordedOn: today,
      recordedAt: new Date(),
      token: token(first),
    });
  } finally {
    await close();
  }
}

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2M-${tag}-%`));
  } finally {
    await close();
  }
});

test.beforeAll(async () => {
  for (const f of ["Mairi", "Ewan", "Shona"]) await missedOrder(f);
});

test("Record their choice (Owner): collect today — the order page, HISTORY and the delivery link follow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Mairi")}`);
  await expect(
    page.getByRole("region", { name: "Where and when" }),
  ).toContainText(/Nobody was in \d+ \w{3} · no choice yet/);
  await page.getByRole("button", { name: "Record their choice" }).click();
  const dialog = page.getByRole("dialog", { name: "What did Mairi choose?" });
  await expect(dialog.getByLabel("Collect it")).toBeChecked();
  await expect(dialog.getByLabel("Collecting on")).toHaveValue(today);
  await dialog.getByLabel("Redeliver").check();
  await expect(dialog.getByLabel("Window")).toBeVisible();
  await expect(dialog).toContainText("No fee is asked for this redelivery.");
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.4d/record-choice-1280.png" });
  await dialog.getByLabel("Collect it").check();
  await dialog.getByRole("button", { name: "Save their choice" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Where and when" }),
  ).toContainText(/Nobody was in \d+ \w{3} · chose to collect \d+ \w{3}/);
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    `Linda · Recorded their choice: collect ${today}`,
  );
  await page.goto(`/delivery/${token("Mairi")}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your cake is waiting for you",
  );
});

test("Delivered after all (a Helper): completed; the delivery link reads “This was sorted — thank you”", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders/${num("Ewan")}`);
  await expect(
    page.getByRole("button", { name: "Record their choice" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Delivered after all" }).click();
  const dialog = page.getByRole("dialog", { name: "Delivered after all?" });
  await expect(dialog).toContainText(
    "The order is completed and Ewan’s choices close",
  );
  await page.screenshot({ path: ".shots/8.4d/delivered-1280.png" });
  await dialog.getByRole("button", { name: "Yes, it was delivered" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delivered after all" }),
  ).toHaveCount(0);
  await page.goto(`/delivery/${token("Ewan")}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This was sorted — thank you",
  );
  await page.screenshot({ path: ".shots/8.4d/sorted-1280.png" });
  const { db, close } = connect();
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.number, num("Ewan")));
    const h = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id));
    expect(h.map((x) => `${x.byName}: ${x.what}`)).toEqual([
      "Fiona: Delivered after all",
    ]);
  } finally {
    await close();
  }
});

test("phone: both buttons in the actions; the choice dialog fits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible()) await notNow.click();
  await page.goto(`/admin/orders/${num("Shona")}`);
  await expect(
    page.getByRole("button", { name: "Delivered after all" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Record their choice" }).click();
  await expect(
    page.getByRole("button", { name: "Save their choice" }),
  ).toBeInViewport();
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".shots/8.4d/record-choice-402.png" });
  await page.getByRole("button", { name: "Not now" }).click();
});
