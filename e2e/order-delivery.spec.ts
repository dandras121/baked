import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { eq } from "drizzle-orm";
import { deliveryAttempts, orderLines, orders } from "../src/db/schema";
import { recordNobodyIn } from "../src/db/delivery-repo";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.5a: Nobody was in (§6.8): the status page, the delivery link, Collect and G.
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
        email: `dlv-${octet()}-${Date.now()}@example.com`,
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

async function orderId(token: string) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.token, token));
    return o.id;
  } finally {
    await close();
  }
}

/** Linda's Nobody was in on today's delivery; returns the delivery token. */
async function nobody(token: string) {
  const { db, close } = connect();
  try {
    const r = await recordNobodyIn(db, await orderId(token));
    if (r.kind !== "recorded") throw new Error(r.kind);
    return r.token;
  } finally {
    await close();
  }
}

const axe = async (page: Page) =>
  (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;

test("Nobody was in: the status page offers both ways; Collect is confirmed and final", async ({
  page,
}) => {
  const { token } = await make(0);
  const delivery = await nobody(token);
  await unlockAt(page, `/my-order/${token}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Nobody was in" }),
  ).toBeVisible();
  await expect(page.getByText(/^I waited fifteen minutes on /)).toBeVisible();
  await expect(
    page.getByText(/^Collect it (today|tomorrow) — free/),
  ).toBeVisible();
  await expect(
    page.getByText(/^Or I run it out again tomorrow for £15/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try again tomorrow — £15" }),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await page
    .getByRole("link", { name: /^I will collect it (today|tomorrow)$/ })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/delivery/${delivery}\\?choice=collect$`),
  );
  await expect(
    page.getByText(
      /^Collect it (today|tomorrow) from .+, before (6pm|12 noon)\?$/,
    ),
  ).toBeVisible();
  // Nothing is recorded by opening the link.
  await page.goto(`/delivery/${delivery}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Nobody was in" }),
  ).toBeVisible();
  await page.goto(`/delivery/${delivery}?choice=collect`);
  expect(await axe(page)).toEqual([]);
  await page.getByRole("button", { name: "Yes, I will collect it" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your cake is waiting for you",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/^Collection (today|tomorrow), confirmed$/),
  ).toBeVisible();
  await expect(
    page.getByText("To change your mind, ring me on", { exact: false }),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);
  // Final: the question again shows G.
  await page.goto(`/delivery/${delivery}?choice=collect`);
  await expect(
    page.getByRole("button", { name: "Yes, I will collect it" }),
  ).toHaveCount(0);

  await page.goto(`/my-order/${token}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your cake is waiting for you",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/^Collect it (today|tomorrow) before (6pm|12 noon)$/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Message Linda" })).toBeVisible();
});

test("No choice by 23:59: the choices have closed, on the status page and the link", async ({
  page,
}) => {
  const { token } = await make(-1);
  const id = await orderId(token);
  const delivery = `closed-${Date.now()}-${octet()}-aaaaaaaaaaaa`;
  const yesterday = addDays(londonDate(new Date()), -1);
  const { db, close } = connect();
  try {
    await db.insert(deliveryAttempts).values({
      orderId: id,
      attempt: 1,
      day: yesterday,
      deliveryWindow: "morning",
      outcome: "nobody-in",
      recordedOn: yesterday,
      recordedAt: new Date(),
      token: delivery,
    });
  } finally {
    await close();
  }
  await unlockAt(page, `/my-order/${token}`);
  await expect(
    page.getByText(/^These choices have closed\. Ring me on /),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /I will collect it/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Message Linda" })).toBeVisible();
  await page.goto(`/delivery/${delivery}`);
  await expect(page.getByText(/^These choices have closed\./)).toBeVisible();
});

test("an unknown delivery link is a 404", async ({ page }) => {
  const r = await page.goto("/delivery/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  expect(r?.status()).toBe(404);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const { token } = await make(0);
    const delivery = await nobody(token);
    await unlockAt(page, `/my-order/${token}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Nobody was in" }),
    ).toBeVisible();
    await page.screenshot({
      path: `.shots/6.5/status-nobody-${w}.png`,
      fullPage: true,
    });
    await page.goto(`/delivery/${delivery}`);
    await page.screenshot({
      path: `.shots/6.5/delivery-${w}.png`,
      fullPage: true,
    });
    await page.goto(`/delivery/${delivery}?choice=collect`);
    await page.getByRole("button", { name: "Yes, I will collect it" }).click();
    await expect(page.getByText(/confirmed$/)).toBeVisible();
    await page.screenshot({
      path: `.shots/6.5/collecting-${w}.png`,
      fullPage: true,
    });
  });
