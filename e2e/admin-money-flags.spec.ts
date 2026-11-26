import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";
import { connect } from "../src/db/client";
import {
  deliveryAttempts,
  disputes,
  orders,
  paymentAlerts,
  refunds,
} from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.8b: the Money flags (§9.9) and their actions.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const num = (k: string) => `BBL-E2F-${tag}-${k}`;
const pi = `pi_e2eflag_${tag}`;

test.beforeAll(async () => {
  const { db, close } = connect();
  const day = addDays(londonDate(new Date()), 20);
  const base = (k: string) => ({
    number: num(k),
    token: `e2e-flag-${tag}-${k}-padding`,
    date: day,
    earliestDate: day,
    handover: "delivery" as const,
    deliveryWindow: "morning",
    postcode: "EH49 6HH",
    customerName: `Callum ${k}`,
    email: "callum@example.co.uk",
    phone: "07700 900 000",
    consents: {},
    totalPence: 18500,
    amountReceivedPence: 18500,
    paymentIntentId: `${pi}_${k}`,
    snapshot: {},
    confirmedAt: new Date(),
  });
  try {
    await db.insert(paymentAlerts).values({
      kind: "no-order",
      paymentIntentId: pi,
      detail: "x",
      amountPence: 6400,
    });
    const [failed] = await db
      .insert(orders)
      .values({
        ...base("R"),
        status: "cancelled",
        cancellation: {
          cardPence: 9250,
          handPence: 0,
          cancelledOn: londonDate(new Date()),
        },
      })
      .returning();
    await db.insert(refunds).values({
      orderId: failed.id,
      kind: "cancel",
      amountPence: 9250,
      paymentIntentId: `${pi}_R`,
      idempotencyKey: `${failed.id}-e2e`,
      status: "failed",
      error: "card_declined",
    });
    await db.insert(orders).values({ ...base("C"), checkDay: true });
    const [fee] = await db.insert(orders).values(base("F")).returning();
    await db.insert(deliveryAttempts).values({
      orderId: fee.id,
      attempt: 1,
      day: londonDate(new Date()),
      outcome: "nobody-in",
      choice: "redeliver",
      feePaidPence: 1500,
      paymentIntentId: `${pi}_fee`,
      feeRefundDue: true,
    });
    await db.insert(orders).values({
      ...base("H"),
      status: "cancelled",
      cancellation: {
        cardPence: 0,
        handPence: 9250,
        cancelledOn: londonDate(new Date()),
      },
    });
  } finally {
    await close();
  }
});

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2F-${tag}-%`));
    await db
      .delete(paymentAlerts)
      .where(like(paymentAlerts.paymentIntentId, `${pi}%`));
  } finally {
    await close();
  }
});

test("the flags, each with its action", async ({ page }) => {
  test.skip(
    test.info().project.name !== "desktop",
    "acts on shared rows: one viewport",
  );
  await signIn(page, "Linda");
  await page.goto("/admin/money");
  const flags = page.getByRole("region", { name: "Needs you" });
  await expect(
    flags.getByText(
      new RegExp(
        `^£64\\.00 was taken on \\d+ \\w+ \\(pi_e2e…${pi.slice(-4)}\\)`,
      ),
    ),
  ).toBeVisible();
  await expect(
    flags.getByText(
      new RegExp(
        `^£92\\.50 back to the card for ${num("R")} \\(Callum R\\) did not go through on .*: card_declined\\.`,
      ),
    ),
  ).toBeVisible();
  await expect(
    flags.getByRole("heading", {
      name: `Booked after its hold ran out — ${num("C")}`,
    }),
  ).toBeVisible();
  await expect(
    flags.getByRole("heading", {
      name: `£15 redelivery to refund — ${num("F")}`,
    }),
  ).toBeVisible();
  await expect(
    flags.getByRole("heading", {
      name: `£92.50 to give back by hand — ${num("H")}`,
    }),
  ).toBeVisible();
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.8b/flags-1280.png", fullPage: true });

  // Booked after its hold ran out → Checked.
  const check = flags
    .locator("div")
    .filter({
      has: page.getByRole("heading", {
        name: `Booked after its hold ran out — ${num("C")}`,
      }),
    })
    .last();
  await check.getByRole("button", { name: "Checked" }).click();
  await expect(
    flags.getByRole("heading", {
      name: `Booked after its hold ran out — ${num("C")}`,
    }),
  ).toHaveCount(0);

  // Refund failed → Try again (the fake Stripe takes it).
  const failed = flags
    .locator("div")
    .filter({ hasText: `${num("R")} (Callum R)` })
    .last();
  await failed.getByRole("button", { name: "Try again" }).click();
  await expect(
    flags.getByText(`${num("R")} (Callum R)`, { exact: false }),
  ).toHaveCount(0);

  // £15 redelivery → Dismiss → “Keep the £15?”
  const fee = flags
    .locator("div")
    .filter({
      has: page.getByRole("heading", {
        name: `£15 redelivery to refund — ${num("F")}`,
      }),
    })
    .last();
  await fee.getByRole("button", { name: "Dismiss" }).click();
  const keep = page.getByRole("dialog", { name: "Keep the £15?" });
  await expect(keep).toContainText("Nothing is refunded.");
  await keep.getByRole("button", { name: "Keep the £15" }).click();
  await expect(
    flags.getByRole("heading", {
      name: `£15 redelivery to refund — ${num("F")}`,
    }),
  ).toHaveCount(0);

  // No order → Dismiss (asks first).
  const stray = flags
    .locator("div")
    .filter({ hasText: `pi_e2e…${pi.slice(-4)})` })
    .last();
  await expect(
    stray.getByRole("link", { name: "Open in Stripe" }),
  ).toHaveAttribute("href", new RegExp(`/payments/${pi}$`));
  await stray.getByRole("button", { name: "Dismiss" }).click();
  const dismiss = page.getByRole("dialog", { name: "Dismiss this flag?" });
  await dismiss.getByRole("button", { name: "Dismiss it" }).click();
  await expect(
    flags.getByText(`pi_e2e…${pi.slice(-4)})`, { exact: false }),
  ).toHaveCount(0);

  // To give back by hand → the order's Record a refund given back.
  const hand = flags
    .locator("div")
    .filter({
      has: page.getByRole("heading", {
        name: `£92.50 to give back by hand — ${num("H")}`,
      }),
    })
    .last();
  await hand.getByRole("link", { name: "Record a refund given back" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/orders/${num("H")}\\?from=money$`),
  );
  await expect(
    page.getByRole("button", { name: "Record a refund given back" }),
  ).toBeVisible();
});

// Slice 8.8c: a dispute flags Money until it closes; a refund made in Stripe shows as a goodwill line.
test("Disputed — respond in Stripe by …, and a goodwill refund line on the order", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "shared rows: one viewport",
  );
  const { db, close } = connect();
  const day = addDays(londonDate(new Date()), 25);
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: num("D"),
        token: `e2e-flag-${tag}-D-padding`,
        date: day,
        earliestDate: day,
        handover: "collection",
        customerName: "Mairi D",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `${pi}_D`,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning();
    await db.insert(disputes).values({
      stripeDisputeId: `dp_e2e_${tag}`,
      paymentIntentId: `${pi}_D`,
      orderId: o.id,
      amountPence: 18500,
      status: "needs_response",
      respondBy: addDays(londonDate(new Date()), 10),
    });
    await db.insert(refunds).values({
      orderId: o.id,
      kind: "goodwill",
      amountPence: 3000,
      paymentIntentId: `${pi}_D`,
      stripeRefundId: `re_e2e_${tag}`,
      status: "succeeded",
    });
  } finally {
    await close();
  }
  await signIn(page, "Linda");
  await page.goto("/admin/money");
  const flags = page.getByRole("region", { name: "Needs you" });
  await expect(
    flags.getByRole("heading", {
      name: /^Disputed — respond in Stripe by \d+ \w+$/,
    }),
  ).toBeVisible();
  await expect(
    flags.getByText(
      `The customer’s bank has questioned £185.00 for ${num("D")} (Mairi D).`,
      { exact: false },
    ),
  ).toBeVisible();
  const box = flags
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: /^Disputed/ }) })
    .last();
  await expect(
    box.getByRole("link", { name: "Open in Stripe" }),
  ).toHaveAttribute(
    "href",
    `https://dashboard.stripe.com/test/disputes/dp_e2e_${tag}`,
  );
  await settled(page);
  await page.screenshot({ path: ".shots/8.8c/disputed-1280.png" });
  await box.getByRole("link", { name: `Open ${num("D")}` }).click();
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText(/Goodwill refund\s*−£30\.00 · Stripe/);
  await expect(
    page.getByText(/Paid in full|nothing paid yet|paid/).first(),
  ).toBeVisible();
  await money.scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".shots/8.8c/goodwill-1280.png" });
  const c = connect();
  try {
    await c.db
      .delete(disputes)
      .where(like(disputes.stripeDisputeId, `dp_e2e_${tag}`));
  } finally {
    await c.close();
  }
});
