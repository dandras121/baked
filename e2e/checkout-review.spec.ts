import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 4.4a: step 4 — one last look (§5.4). Each test is its own connection (two holds each, §10.3).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

/** One cake, a held day `monthsAhead` months on, delivery, the details, step 4. */
async function stepFour(
  page: Page,
  // A later month at random, so tests running side by side (and their holds) rarely meet.
  monthsAhead = 2 + Math.floor(Math.random() * 9),
) {
  await page.goto("/cakes/the-lothian");
  await page.getByRole("textbox", { name: /Inscription/ }).fill("Happy 30th");
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
  await page.goto("/order/when");
  for (let i = 0; i < monthsAhead; i++)
    await page.getByRole("button", { name: "Next month" }).click();
  await page
    .locator("[data-shown] label[data-state=available]")
    .nth(Math.floor(Math.random() * 8))
    .click();
  await page.getByText("Delivered to you").click();
  await page
    .getByRole("textbox", { name: "Address", exact: true })
    .fill("48 Preston Road");
  await page
    .getByRole("textbox", { name: "Town", exact: true })
    .fill("Linlithgow");
  await page
    .getByRole("textbox", { name: "Postcode", exact: true })
    .fill("eh49 6hh");
  await page.getByText(/^Morning/).click();
  await page
    .getByRole("button", { name: /^(Continue to your details|Your details)$/ })
    .click();
  const chip = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button")
    .first();
  await expect(page.getByText(/is held for/).or(chip)).toBeVisible();
  if (await chip.isVisible()) await chip.click();
  await expect(page).toHaveURL(/order\/details$/);
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Mairi Sinclair");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("mairi@example.co.uk");
  await page
    .getByRole("textbox", { name: "Phone", exact: true })
    .fill("07700 900 000");
  await page
    .getByRole("checkbox", { name: /I have read and agree/ })
    .check({ force: true });
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/order\/pay$/);
}

test("the order, each cake's allergens, the handover line, the total and your details with Change links", async ({
  page,
}) => {
  await stepFour(page);
  const order = page.getByRole("region", { name: "Your order" });
  await expect(order).toContainText("The Lothian");
  await expect(order).toContainText("“Happy 30th”");
  await expect(order).toContainText("Contains gluten (wheat), eggs and milk.");
  await expect(order).toContainText(/Delivery · \w+ \d+ \w+( \d{4})?, morning/);
  await expect(order).toContainText("£185");
  await expect(order).toContainText("Mairi Sinclair");
  await expect(order).toContainText("mairi@example.co.uk · 07700 900 000");
  await expect(order).toContainText("Delivery to 48 Preston Road");
  await expect(order).toContainText("Linlithgow EH49 6HH");
  await expect(
    order.getByRole("link", { name: "Change your details" }),
  ).toHaveAttribute("href", "/order/details");
  await expect(
    order.getByRole("link", { name: "Change the delivery address" }),
  ).toHaveAttribute("href", "/order/when");
  await expect(
    order.getByRole("link", { name: "Edit The Lothian" }),
  ).toHaveAttribute("href", /from=pay$/);
});

test("BEFORE YOU PAY: more than seven days away shows the tiers, the kitchen sentence once; Due today", async ({
  page,
}) => {
  await stepFour(page);
  const box = page.getByRole("region", { name: "Before you pay" });
  await expect(box).toContainText("14-day right to cancel");
  await expect(box).toContainText(
    "Cancel more than seven days before your date and I refund in full.",
  );
  await expect(box).toContainText("You pay in full today.");
  await expect(
    box.getByText(/^Made in a kitchen that also handles/),
  ).toHaveCount(1);
  await expect(box).toContainText("£185");
  await expect(box).toContainText(
    "Nothing further to pay. Your date is booked the moment this goes through.",
  );
});

test("Remove on step 4: the last cake leaves “There is nothing in your order”", async ({
  page,
}) => {
  await stepFour(page);
  await page.getByRole("button", { name: "Remove The Lothian" }).click();
  await expect(
    page.getByRole("heading", { name: "There is nothing in your order" }),
  ).toBeVisible();
});

test("axe: step 4; screenshots", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stepFour(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_review.png`),
    fullPage: true,
  });
});

test("4.4b: one PaymentIntent per draft, the same after a reload; without keys Pay is off and says so", async ({
  page,
}) => {
  await stepFour(page);
  const id = (await page.context().cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  const piOf = async () => {
    process.loadEnvFile?.(".env.local");
    const { connect } = await import("../src/db/client");
    const { drafts } = await import("../src/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db, close } = connect();
    try {
      return (await db.select().from(drafts).where(eq(drafts.id, id)))[0]
        .paymentIntentId;
    } finally {
      await close();
    }
  };
  const first = await piOf();
  expect(first).toMatch(/^pi_/);
  await page.reload();
  expect(await piOf()).toBe(first);
  await expect(
    page.getByText(/Payments are not switched on yet/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pay £185$/ })).toBeDisabled();
});

test("4.5a: a draft being paid in another tab — the notice on every step, the order's controls off; open again when the lock ends", async ({
  page,
}) => {
  await stepFour(page);
  const id = (await page.context().cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  const lock = async (lockedAt: Date | null) => {
    process.loadEnvFile?.(".env.local");
    const { connect } = await import("../src/db/client");
    const { drafts } = await import("../src/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db, close } = connect();
    try {
      await db
        .update(drafts)
        .set({ status: lockedAt ? "pending" : "draft", lockedAt })
        .where(eq(drafts.id, id));
      return (await db.select().from(drafts).where(eq(drafts.id, id)))[0]
        .status;
    } finally {
      await close();
    }
  };
  const notice = page.getByText(
    "This order is being paid in another tab — changes are paused until that payment finishes.",
  );
  await lock(new Date());
  await page.reload();
  await expect(notice).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pay £/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^Remove/ }).first(),
  ).toBeDisabled();
  await page.goto("/order/details");
  await expect(notice).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toBeDisabled();
  // The lock ran out (15 minutes) with nothing paid: editable again, the draft back to `draft`.
  expect(await lock(new Date(Date.now() - 16 * 60 * 1000))).toBe("pending");
  await page.reload();
  await expect(notice).toBeHidden();
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toBeEnabled();
});

test("4.5b: /order/confirmed waits for Stripe's confirmation and shows it without a reload; back to a step → the confirmation", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await stepFour(page);
  const id = (await page.context().cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  const setStatus = async (status: "pending" | "confirmed") => {
    process.loadEnvFile?.(".env.local");
    const { connect } = await import("../src/db/client");
    const { drafts } = await import("../src/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db, close } = connect();
    try {
      await db
        .update(drafts)
        .set(
          status === "pending"
            ? { status, lockedAt: new Date() }
            : { status, confirmedAt: new Date(), lockedAt: null },
        )
        .where(eq(drafts.id, id));
    } finally {
      await close();
    }
  };
  // Paid, the confirmation not here yet (the fake PaymentIntent is still under way, inside the lock).
  await setStatus("pending");
  await page.goto("/order/confirmed");
  await expect(
    page.getByRole("heading", { name: "Confirming your order…" }),
  ).toBeVisible();
  // After 10 seconds: “Still processing”.
  await expect(
    page.getByRole("heading", {
      name: "Payment received — confirming your order",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/This page updates itself/)).toBeVisible();
  // Stripe's confirmation arrives: the page swaps by itself.
  const url = page.url();
  await setStatus("confirmed");
  await expect(
    page.getByRole("heading", { name: "Thank you, Mairi." }),
  ).toBeVisible({
    timeout: 15_000,
  });
  expect(page.url()).toBe(url);
  await page.goto("/order/pay");
  await expect(page).toHaveURL(/\/order\/confirmed$/);
});
