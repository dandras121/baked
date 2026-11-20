import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { orderLines, orders } from "../src/db/schema";
import { londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.3a: Today (§9.3) — rows, flags, tiles, Send a text.
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function addOrder(
  name: string,
  over: Partial<typeof orders.$inferInsert>,
) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: `BBL-E2E-${tag}-${name.split(" ")[0]}`,
        token: `e2e-today-${tag}-${name.split(" ")[0]}-padding`,
        date: today,
        earliestDate: today,
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        postcode: "EH49 6HH",
        customerName: name,
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        phoneE164: "+447700900000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_e2e_${tag}_${name.split(" ")[0]}`,
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
      pricePence: 18500,
      allergenText: "",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
}

// Leave no rows behind: the next run (and the screenshots) start from the seed.
test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2E-${tag}-%`));
  } finally {
    await close();
  }
});

test.beforeAll(async () => {
  await addOrder(`Morven ${tag}`, { deliveryWindow: "morning" });
  await addOrder(`Callum ${tag}`, {
    handover: "collection",
    deliveryWindow: null,
    collectionTime: "12 noon",
    address: null,
  });
  await addOrder(`Flora ${tag}`, { deliveryWindow: "evening", checkDay: true });
});

test("an Owner's Today: date, subtitle, tiles, rows with flags, Send a text with the ready-written text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/,
  );
  await expect(page.getByText(/going out today/)).toBeVisible();
  for (const t of [
    "out today",
    "this week",
    "new enquiries",
    "taken this week",
    "still to pay",
  ])
    await expect(
      page
        .getByRole("list", { name: "This week in numbers" })
        .getByText(t, { exact: true }),
    ).toBeVisible();
  const row = (n: string) =>
    page.getByRole("listitem").filter({ hasText: `${n} ${tag}` });
  await expect(row("Morven")).toContainText("9am – 12pm");
  await expect(row("Callum")).toContainText("12 noon");
  await expect(row("Flora")).toContainText(
    "Booked after its hold ran out — check the day",
  );
  const text = row("Callum").getByRole("link", { name: "Send a text" });
  const href = decodeURIComponent((await text.getAttribute("href")) ?? "");
  expect(href).toMatch(
    /^sms:\+447700900000\?&body=Hi Callum, it’s Linda from Baked by Linda\. Your cake is ready — see you at 12 noon at /,
  );
  await expect(
    row("Morven").getByRole("link", {
      name: `Morven ${tag}, order BBL-E2E-${tag}-Morven`,
    }),
  ).toHaveAttribute("href", `/admin/orders/BBL-E2E-${tag}-Morven?from=today`);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.3a/today-1280.png", fullPage: true });
});

test("a Helper's Today: two tiles, no payment words", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  const tiles = page
    .getByRole("list", { name: "This week in numbers" })
    .getByRole("listitem");
  await expect(tiles).toHaveCount(2);
  await expect(page.getByText(/payment/)).toHaveCount(0);
});

test("phone: rows as cards, the short subtitle, no tiles", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible()) await notNow.click();
  await expect(page.getByText(/going out ·/)).toBeVisible();
  await expect(
    page.getByRole("list", { name: "This week in numbers" }),
  ).toBeHidden();
  await page.screenshot({ path: ".shots/8.3a/today-402.png", fullPage: true });
});
