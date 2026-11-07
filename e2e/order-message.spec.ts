import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { eq } from "drizzle-orm";
import { mailSends, orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.4: Message Linda (§6.5) and Find my order (§6.7).
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
        email: `msg-${octet()}-${Date.now()}@example.com`,
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

async function orderOf(token: string) {
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.token, token));
    return o;
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

test("Message Linda: empty says nothing was sent; a message goes to Linda and the status page says so", async ({
  page,
}) => {
  const { token, number } = await make(12);
  await unlockAt(page, `/my-order/${token}`);
  await page.getByRole("link", { name: "Message Linda" }).click();
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}/message$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Send Linda a message" }),
  ).toBeFocused();
  await expect(page.getByText(`with order ${number} attached`)).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await page
    .getByRole("textbox", { name: "What would you like to tell me?" })
    .fill("   ");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("Write a message first — nothing was sent."),
  ).toBeVisible();

  const box = page.getByRole("textbox", {
    name: "What would you like to tell me?",
  });
  await box.fill("Could we move the delivery window to the afternoon?");
  await expect(page.getByText("51 / 400")).toBeVisible();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/my-order/${token}\\?message=\\d+$`),
  );
  const o = await orderOf(token);
  await expect(page.getByText("Message sent.")).toBeVisible();
  await expect(
    page.getByText(`I’ll reply to ${o.email} within 24 hours.`, {
      exact: false,
    }),
  ).toBeVisible();
  // Gone on the next load.
  await page.goto(`/my-order/${token}`);
  await expect(page.getByText("Message sent.")).toHaveCount(0);
});

test("Message Linda asks the check first", async ({ page }) => {
  const { token } = await make(12);
  await unlockAt(page, `/my-order/${token}/message`);
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}/message$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Send Linda a message" }),
  ).toBeVisible();
});

test("Find my order: from the footer; a bad address is named; the same answer whether or not an order matches", async ({
  page,
}) => {
  const { token, number } = await make(12);
  const o = await orderOf(token);
  await page.goto("/contact");
  await page.getByRole("link", { name: "Find my order →" }).click();
  await expect(page).toHaveURL(/\/find-my-order$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Track your order easily." }),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await page.getByRole("textbox", { name: "Email" }).fill("not-an-address");
  await page.getByRole("button", { name: "Send me the link" }).click();
  await expect(
    page.getByText("Put in the e-mail you ordered with — nothing was sent."),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Order number (optional)" })
    .fill(number.toLowerCase());
  await page
    .getByRole("textbox", { name: "Email" })
    .fill(o.email.toUpperCase());
  await page.getByRole("button", { name: "Send me the link" }).click();
  await expect(page.getByText("New link sent")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send me the link" }),
  ).toHaveCount(0);
  await expect(
    page.locator("main").getByRole("link", { name: "Find my order" }),
  ).toHaveCount(0);
  const mails = await mailsTo(o.email.toUpperCase());
  expect(mails.map((m) => m.template)).toEqual(["order-link"]);
  expect(JSON.stringify(mails[0].data)).toContain(token);

  // An address with no order: the same answer, nothing sent.
  await page.goto("/find-my-order");
  const nobody = `nobody-${Date.now()}@example.com`;
  await page.getByRole("textbox", { name: "Email" }).fill(nobody);
  await page.getByRole("button", { name: "Send me the link" }).click();
  await expect(page.getByText("New link sent")).toBeVisible();
  expect(await mailsTo(nobody)).toEqual([]);
});

test("Find my order: the fourth request for one address in an hour is refused, the address kept", async ({
  page,
}) => {
  const email = `many-${Date.now()}-${octet()}@example.com`;
  for (let i = 0; i < 3; i++) {
    await page.goto("/find-my-order");
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("button", { name: "Send me the link" }).click();
    await expect(page.getByText("New link sent")).toBeVisible();
  }
  await page.goto("/find-my-order");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Send me the link" }).click();
  await expect(page.getByText("Nothing new has been sent")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(email);
  await expect(
    page.getByRole("button", { name: "Send me the link" }),
  ).toBeEnabled();
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const { token } = await make(12);
    await unlockAt(page, `/my-order/${token}/message`);
    await page
      .getByRole("textbox", { name: "What would you like to tell me?" })
      .fill(
        "Could we move the delivery window to the afternoon? We are out until about one.",
      );
    await page.screenshot({
      path: `.shots/6.4/message-${w}.png`,
      fullPage: true,
    });
    await page.goto("/find-my-order");
    await expect(
      page.getByRole("heading", { level: 1, name: "Track your order easily." }),
    ).toBeVisible();
    await page.screenshot({ path: `.shots/6.4/find-${w}.png`, fullPage: true });
  });
