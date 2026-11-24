import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import {
  orderHistory,
  orderLines,
  orderMessages,
  orders,
} from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.4b: Order detail (§9.5) — every block, Collection time, Mark handed over, Nobody was in, HISTORY.
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const num = (first: string) => `BBL-E2D-${tag}-${first}`;

async function addOrder(
  first: string,
  over: Partial<typeof orders.$inferInsert>,
  cakes = 1,
) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: num(first),
        token: `e2e-detail-${tag}-${first}-padding`,
        date: addDays(today, 10),
        earliestDate: addDays(today, 10),
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        town: "Linlithgow",
        postcode: "EH49 6HH",
        customerName: `${first} Sinclair`,
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        phoneE164: "+447700900000",
        consents: {
          terms: { at: new Date().toISOString() },
          marketing: { wording: "Yes please" },
        },
        marketingOptIn: true,
        cakeFor: "Mairi's 30th",
        allergyNote:
          "No nuts please — one of the children has an allergy. Applies to both cakes.",
        totalPence: 28000,
        amountReceivedPence: 28000,
        paymentIntentId: `pi_3Qx${tag}${first}8KdA`,
        snapshot: {},
        confirmedAt: new Date(),
        ...over,
      })
      .returning();
    const lines = [
      {
        name: "The Lothian",
        sizeLine: "Two tiers · serves 24",
        flavour: "vanilla sponge",
        message: "Happy 30th, Mairi",
        pricePence: 18500,
        allergenText: "Contains: wheat, egg, milk",
      },
      {
        name: "Bramble & Cream",
        sizeLine: "Single tier · serves 12",
        flavour: "chocolate sponge",
        message: "",
        pricePence: 9500,
        allergenText: "Contains: wheat, egg, milk, soya",
      },
    ].slice(0, cakes);
    await db.insert(orderLines).values(
      lines.map((l, i) => ({
        ...l,
        orderId: o.id,
        position: i + 1,
        slug: "the-lothian",
        allergenKeys: [],
      })),
    );
    return o;
  } finally {
    await close();
  }
}

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2D-${tag}-%`));
  } finally {
    await close();
  }
});

test.beforeAll(async () => {
  const mairi = await addOrder("Mairi", {}, 2);
  const { db, close } = connect();
  try {
    await db
      .insert(orderMessages)
      .values({ orderId: mairi.id, body: "Could the message be in purple?" });
  } finally {
    await close();
  }
  await addOrder("Callum", {
    handover: "collection",
    deliveryWindow: null,
    address: null,
    date: today,
    earliestDate: today,
    amountReceivedPence: 8000,
    totalPence: 21000,
  });
  await addOrder("Shona", { date: today, earliestDate: today });
});

const open = async (page: Page, first: string, from = "") =>
  page.goto(`/admin/orders/${num(first)}${from}`);

test("an Owner sees every block as drawn: cakes, where and when, allergy note, money, messages, history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await signIn(page, "Linda");
  await open(page, "Mairi");
  await expect(
    page.getByRole("heading", { level: 1, name: num("Mairi") }),
  ).toBeVisible();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /^Mairi Sinclair · paid in full · £280\.00 · Stripe, \d+ \w+$/,
    ),
  ).toBeVisible();
  const cakes = page.getByRole("region", { name: "The cakes" });
  await expect(cakes).toContainText(
    "Two tiers · serves 24 · vanilla sponge · “Happy 30th, Mairi”",
  );
  await expect(cakes).toContainText(
    "Single tier · serves 12 · chocolate sponge · no message",
  );
  await expect(cakes).toContainText("Contains: wheat, egg, milk, soya");
  const where = page.getByRole("region", { name: "Where and when" });
  await expect(where).toContainText("Morning · 9am – 12pm");
  await expect(where).toContainText("48 Preston Road, Linlithgow EH49 6HH");
  await expect(where).toContainText(/Agreed \d+ \w+ \d{4} · wording stored/);
  await expect(where).toContainText("Mairi's 30th");
  await expect(
    page.getByRole("region", { name: "Allergy note" }),
  ).toContainText("No nuts please");
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText("£280.00");
  await expect(money).toContainText(
    /Paid in full£280\.00 · Stripe · \d+ \w{3} · pi_3Qx…8KdA/,
  );
  await expect(money).toContainText("Still to pay£0.00");
  await expect(page.getByRole("region", { name: "Messages" })).toContainText(
    "Could the message be in purple?",
  );
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Booked on the website",
  );
  await expect(
    page.getByText("£280.00 refund if cancelled today"),
  ).toBeVisible();
  await expect(
    page.getByText(
      /More than 7 days before .* — the full-refund rule applies\./,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Mairi can change the date, size or message online until 23:59 on/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Message the customer" }),
  ).toHaveAttribute(
    "href",
    `mailto:mairi@example.co.uk?subject=Your%20order%20${num("Mairi")}`,
  );
  await expect(
    page.getByRole("link", { name: "Refund in Stripe" }),
  ).toHaveAttribute(
    "href",
    `https://dashboard.stripe.com/test/payments/pi_3Qx${tag}Mairi8KdA`,
  );
  // Not on its day yet: no Mark handed over, no Nobody was in.
  await expect(
    page.getByRole("button", { name: "Mark handed over" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nobody was in" })).toHaveCount(
    0,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: ".shots/8.4b/detail-1280.png",
    fullPage: true,
  });
});

test("Copy the order link copies the status page link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await open(page, "Mairi");
  await page.getByRole("button", { name: "Copy the order link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    new RegExp(`/my-order/e2e-detail-${tag}-Mairi-padding$`),
  );
});

test("Collection time saves on blur, shows Saved. and goes to HISTORY and Today", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await open(page, "Callum", "?from=today");
  const where = page.getByRole("region", { name: "Where and when" });
  await expect(where).toContainText("From ");
  await expect(
    page.getByText(/^Callum Sinclair · £80\.00 paid · £210\.00/),
  ).toBeVisible();
  const field = page.getByLabel("Collection time");
  await field.fill("12 noon");
  await field.press("Tab");
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Linda · Collection time set to “12 noon”",
  );
  await page.screenshot({
    path: ".shots/8.4b/collection-1280.png",
    fullPage: true,
  });
  await page.goto("/admin/today");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Callum Sinclair" }).first(),
  ).toContainText("12 noon");
});

test("Mark handed over, Undo and Nobody was in work here as on Today", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await open(page, "Shona");
  await page.getByRole("button", { name: "Nobody was in" }).click();
  await expect(
    page.getByRole("dialog", { name: "Nobody in at 48 Preston Road?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not yet" }).click();
  await page.getByRole("button", { name: "Mark handed over" }).click();
  await expect(
    page.getByText(/^Handed over \d+ \w{3} \d{2}:\d{2}/),
  ).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Linda · Marked handed over",
  );
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.getByRole("button", { name: "Mark handed over" }),
  ).toBeVisible();
  const { db, close } = connect();
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.number, num("Shona")));
    const h = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id))
      .orderBy(orderHistory.id);
    expect(h.map((x) => x.what)).toEqual([
      "Marked handed over",
      "Undid handed over",
    ]);
  } finally {
    await close();
  }
});

test("a Helper: no money, no marketing, no Refund in Stripe; the back link on the desktop too", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  await open(page, "Mairi");
  await expect(page.getByText("Mairi Sinclair", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Money" })).toHaveCount(0);
  await expect(page.getByText(/wording stored/)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Refund in Stripe" }),
  ).toHaveCount(0);
  await expect(page.getByText(/refund if cancelled today/)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "‹ Back to orders" }),
  ).toBeVisible();
});

test("phone: back to where it was opened from, the number as title, cards in the drawn order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible()) await notNow.click();
  await open(page, "Mairi", "?from=today");
  await expect(
    page.getByRole("link", { name: "‹ Back to today" }),
  ).toHaveAttribute("href", "/admin/today");
  const y = async (name: string) =>
    (await page.getByRole("region", { name }).boundingBox())!.y;
  expect(await y("Where and when")).toBeLessThan(await y("Allergy note"));
  expect(await y("Allergy note")).toBeLessThan(await y("The cakes"));
  const actions = (await page
    .getByRole("link", { name: "Message the customer" })
    .boundingBox())!.y;
  expect(actions).toBeGreaterThan(await y("The cakes"));
  expect(actions).toBeLessThan(await y("Money"));
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.4b/detail-402.png", fullPage: true });
  await open(page, "Mairi");
  await expect(
    page.getByRole("link", { name: "‹ Back to orders" }),
  ).toBeVisible();
});

test("an unknown number is not found", async ({ page }) => {
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/BBL-NOPE-${tag}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See all orders" }),
  ).toBeVisible();
});
