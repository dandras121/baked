import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { connect } from "../src/db/client";
import {
  applyPayLink,
  createPayLink,
  preparePayLink,
  withdrawPayLink,
} from "../src/db/pay-link-repo";
import { orderLines, orders, paymentLinks } from "../src/db/schema";
import { countingGateway } from "../src/db/test-gateway";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.6: Pay for your cake (§6.9) — the link, its states and the status page's Pay row.
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

/** A bespoke order with £380 to pay and a link for `pence` sent. */
async function withLink(
  pence: number,
  purpose: "deposit" | "rest" = "deposit",
) {
  process.loadEnvFile?.(".env.local");
  const token = randomBytes(24).toString("base64url");
  const number = `BBL-E2E-${Date.now().toString().slice(-6)}${octet()}`;
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number,
        token,
        kind: "manual",
        date: addDays(londonDate(new Date()), 20),
        earliestDate: addDays(londonDate(new Date()), 20),
        handover: "collection",
        customerName: "Isla Morrison",
        email: `pay-${octet()}-${Date.now()}@example.com`,
        phone: "07700 900 358",
        consents: {},
        totalPence: 38000,
        amountReceivedPence: 0,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning();
    await db.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "",
      name: "Two-tier wedding cake, white roses",
      sizeLine: "Two tiers · serves 60",
      pricePence: 38000,
      allergenText: "Contains gluten (wheat), eggs and milk.",
      allergenKeys: [],
    });
    const r = await createPayLink(db, {
      orderId: o.id,
      purpose,
      amountPence: pence,
    });
    if (r.kind !== "sent") throw new Error(r.kind);
    return { token, link: r.token, orderId: o.id };
  } finally {
    await close();
  }
}

/** Stripe's answer played in the test: the link is paid. */
async function pay(link: string) {
  const { db, close } = connect();
  try {
    const t = countingGateway();
    const p = await preparePayLink(db, t.gw, link);
    if (p.kind !== "pay") throw new Error(p.kind);
    t.succeed(`pi_link_${p.linkId}`);
    await applyPayLink(db, t.gw, t.intents.get(`pi_link_${p.linkId}`)!);
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

test("a deposit link: the rows, then paid and already paid; the status page's Pay row goes", async ({
  page,
}) => {
  const { token, link } = await withLink(12000);
  // The status page offers it.
  await page.goto(`/my-order/${token}`);
  await page.getByRole("textbox").fill("0358");
  await page.getByRole("button", { name: "Open my order" }).click();
  await expect(page.getByRole("link", { name: "Pay £120 →" })).toBeVisible();
  await page.getByRole("link", { name: "Pay £120 →" }).click();
  await expect(page).toHaveURL(new RegExp(`/pay/${link}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Pay for your cake" }),
  ).toBeVisible();
  await expect(page.getByText("What it is for")).toBeVisible();
  await expect(page.getByText("Deposit", { exact: true })).toBeVisible();
  await expect(
    page.getByText("£120 · total £380, paid so far £0"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay £120" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Prefer to talk\? Call Linda on / }),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await pay(link);
  await page.goto(`/pay/${link}?paid=1`);
  await expect(page.getByText("Paid — thank you.")).toBeVisible();
  await expect(
    page.getByText(
      /^£120 has been paid for order BBL-E2E-.+\. A receipt is on its way to /,
    ),
  ).toBeVisible();
  await page.goto(`/pay/${link}`);
  await expect(page.getByText("Already paid")).toBeVisible();
  await page.getByRole("link", { name: "See your order →" }).click();
  await expect(page.getByRole("link", { name: "Pay £120 →" })).toHaveCount(0);
  await expect(page.getByText("Paid so far")).toBeVisible();
  await expect(page.getByText("£260", { exact: true })).toBeVisible();
});

test("a withdrawn link is no longer needed; an unknown link is a 404", async ({
  page,
}) => {
  const { link } = await withLink(38000, "rest");
  await page.goto(`/pay/${link}`);
  await expect(page.getByText("£380 · this settles your cake")).toBeVisible();
  const { db, close } = connect();
  try {
    const [l] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.token, link));
    await withdrawPayLink(db, null, l.id);
  } finally {
    await close();
  }
  await page.goto(`/pay/${link}`);
  await expect(
    page.getByText("This payment link is no longer needed."),
  ).toBeVisible();
  await expect(
    page.getByText(/^Nothing has been taken\. Questions\? Call /),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);
  expect(
    (await page.goto("/pay/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))?.status(),
  ).toBe(404);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const { link } = await withLink(12000);
    await page.goto(`/pay/${link}`);
    await expect(page.getByText("What it is for")).toBeVisible();
    await page.screenshot({ path: `.shots/6.6/pay-${w}.png`, fullPage: true });
    await pay(link);
    await page.goto(`/pay/${link}?paid=1`);
    await expect(page.getByText("Paid — thank you.")).toBeVisible();
    await page.screenshot({ path: `.shots/6.6/paid-${w}.png`, fullPage: true });
  });
