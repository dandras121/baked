import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { eq } from "drizzle-orm";
import { mailSends, orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.3: Cancel your order (§6.6), A2 and the cancelled state E (§6.3).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

async function make(days: number, kind = "catalogue", serves = 24) {
  process.loadEnvFile?.(".env.local");
  const date = addDays(londonDate(new Date()), days);
  const token = randomBytes(24).toString("base64url");
  const number = `BBL-E2E-${Date.now().toString().slice(-6)}${octet()}`;
  const { db, close } = connect();
  try {
    const [r] = await db
      .insert(orders)
      .values({
        number,
        token,
        kind,
        date,
        earliestDate: date,
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email: `cnl-${octet()}-${Date.now()}@example.com`,
        phone: "07700 900 358",
        consents: {},
        totalPence: serves === 32 ? 24000 : 18500,
        amountReceivedPence: serves === 32 ? 24000 : 18500,
        paymentIntentId: `pi_e2e_${number}`,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning({ id: orders.id });
    await db.insert(orderLines).values({
      orderId: r.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: `Two tiers · serves ${serves}`,
      flavour: "Vanilla sponge",
      message: "Happy 30th",
      pricePence: serves === 32 ? 24000 : 18500,
      allergenText: "Contains gluten (wheat), eggs and milk.",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
  return { token, number };
}

async function unlockAt(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("textbox").fill("EH49 6HH");
  await page.getByRole("button", { name: "Open my order" }).click();
}

async function mailsTo(email: string) {
  const { db, close } = connect();
  try {
    return await db.select().from(mailSends).where(eq(mailSends.to, email));
  } finally {
    await close();
  }
}

async function emailOf(token: string) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .select({ email: orders.email, status: orders.status })
      .from(orders)
      .where(eq(orders.token, token));
    return o;
  } finally {
    await close();
  }
}

test("more than seven days ahead: the full price back, then state E", async ({
  page,
}) => {
  const { token } = await make(12);
  await unlockAt(page, `/my-order/${token}`);
  await page.getByRole("link", { name: "Need to cancel instead? →" }).click();
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}/cancel$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Cancel this order?" }),
  ).toBeFocused();
  await expect(
    page.getByText(/is twelve days away, so you are due the full £185 back\./),
  ).toBeVisible();
  await expect(page.getByText("Cancelling cannot be undone")).toBeVisible();
  await expect(page.getByText(/^You paid £185 on /)).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await page.getByRole("button", { name: "Cancel the order" }).click();
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "This order was cancelled" }),
  ).toBeVisible();
  await expect(
    page.getByText("Refunded", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("£185 back to your card")).toBeVisible();
  await expect(
    page.getByText("Your date is back in the calendar."),
  ).toBeVisible();
  await expect(
    page.locator("main").getByRole("link", { name: "Cancellations & refunds" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Change something" }),
  ).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  const o = await emailOf(token);
  expect(o.status).toBe("refunded");
  const mails = await mailsTo(o.email);
  expect(mails.map((m) => m.template)).toContain("cancelled");

  // The cancel page of a cancelled order goes back to E.
  await page.goto(`/my-order/${token}/cancel`);
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}$`));
});

test("inside seven days: half back", async ({ page }) => {
  const { token } = await make(5);
  await unlockAt(page, `/my-order/${token}/cancel`);
  await expect(
    page.getByText(/is five days away, so you are due half — £92\.50 back\./),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel the order" }).click();
  await expect(
    page.getByText(
      "£92.50 back to your card — half, as the cancellation was inside seven days",
    ),
  ).toBeVisible();
});

test("Keep my order goes back to the status page and changes nothing", async ({
  page,
}) => {
  const { token } = await make(12);
  await unlockAt(page, `/my-order/${token}/cancel`);
  await page.getByRole("link", { name: "Keep my order" }).click();
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cake is booked" }),
  ).toBeVisible();
  expect((await emailOf(token)).status).toBe("confirmed");
});

test("after the change window: A2, nothing cancelled", async ({ page }) => {
  const { token } = await make(1);
  await unlockAt(page, `/my-order/${token}/cancel`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your cake is already being made",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel the order" }),
  ).toHaveCount(0);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const { token } = await make(12);
    await unlockAt(page, `/my-order/${token}/cancel`);
    await expect(page.getByText("What you get back")).toBeVisible();
    await page.screenshot({
      path: `.shots/6.3/cancel-${w}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel the order" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "This order was cancelled" }),
    ).toBeVisible();
    await page.screenshot({
      path: `.shots/6.3/cancelled-${w}.png`,
      fullPage: true,
    });
  });
