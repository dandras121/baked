import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { connect } from "../src/db/client";
import { draftLineViews } from "../src/db/draft-repo";
import { createOrder } from "../src/db/order-repo";
import { draftAmount, snapshotLine } from "../src/db/payment-repo";
import { drafts } from "../src/db/schema";
import { stepFour } from "./checkout-helpers";

// Slice 4.6b: Order confirmed (§5.6) and the mascot (ANIM-25). Stripe's confirmation is played by the test: the draft
// is confirmed and its order made in the database, exactly as the webhook does.
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

async function paid(page: Page): Promise<string> {
  await stepFour(page);
  const id = (await page.context().cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  process.loadEnvFile?.(".env.local");
  const { db, close } = connect();
  try {
    const lines = (await draftLineViews(db, id)).map(snapshotLine);
    const total = await draftAmount(db, id);
    return await db.transaction(async (tx) => {
      const [d] = await tx.select().from(drafts).where(eq(drafts.id, id));
      await tx
        .update(drafts)
        .set({ status: "confirmed", confirmedAt: new Date(), lockedAt: null })
        .where(eq(drafts.id, id));
      return createOrder(tx, d, lines, total, total, null, new Date());
    });
  } finally {
    await close();
  }
}

const mascot = (page: Page) => page.locator("[data-greeting-mascot]");

test("the order: thank you, what happens next, the number, Track this order", async ({
  page,
}) => {
  const number = await paid(page);
  await page.goto("/order/confirmed");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Thank you,\s*Mairi\./,
  );
  await expect(
    page.getByRole("heading", { name: "What happens next" }),
  ).toBeVisible();
  await expect(page.getByText("Right now")).toBeVisible();
  await expect(
    page.getByText(/A confirmation is on its way to mairi@example\.co\.uk\./),
  ).toBeVisible();
  await expect(
    page.getByText(/is the last day to change or cancel online\./),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Delivery between 9am and 12pm. I will text you that morning with a tighter window.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /You can change the size, message, date or window until 23:59 on/,
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "What happens next" })
      .getByRole("link", { name: "+44 7884 199103" }),
  ).toHaveAttribute("href", "tel:+447884199103");
  await expect(page.getByTestId("order-number")).toHaveText(number);
  expect(number).toMatch(/^BBL-\d{4}-\d{4,5}$/);
  await expect(
    page.getByRole("link", { name: "Track this order" }),
  ).toHaveAttribute("href", /^\/my-order\/[\w-]{20,}$/);
  // Back to a step after paying: the confirmation.
  await page.goto("/order/pay");
  await expect(page).toHaveURL(/\/order\/confirmed$/);
});

test("ANIM-25: the mascot greets once — 300 ms, 450 ms, from hidden and 18° to 8°; a reload does not replay", async ({
  page,
}) => {
  await paid(page);
  await page.goto("/order/confirmed");
  await expect(mascot(page)).toHaveAttribute("data-state", "rest");
  const timing = await mascot(page).evaluate((el) => {
    const a = el.getAnimations()[0];
    const t = a?.effect?.getComputedTiming();
    return [t?.duration, t?.delay];
  });
  expect(timing).toEqual([450, 300]);
  await page.waitForTimeout(900);
  await expect(mascot(page)).toHaveCSS("transform", /matrix\(0\.99/);
  // Clipped by the card's top edge: its box ends where the card begins.
  const clip = await mascot(page).evaluate((el) => {
    const c = el.parentElement!.getBoundingClientRect();
    const card = el.parentElement!.parentElement!.getBoundingClientRect();
    return [
      Math.round(c.bottom),
      Math.round(card.top),
      getComputedStyle(el.parentElement!).overflow,
    ];
  });
  expect(clip[0]).toBe(clip[1]);
  expect(clip[2]).toBe("hidden");
  await page.reload();
  await expect(mascot(page)).toHaveAttribute("data-state", "rest");
  expect(await mascot(page).evaluate((el) => el.getAnimations().length)).toBe(
    0,
  );
});

test("reduced motion: the mascot simply sits in place; axe; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await paid(page);
  await page.goto("/order/confirmed");
  await expect(mascot(page)).toHaveAttribute("data-state", "rest");
  expect(await mascot(page).evaluate((el) => el.getAnimations().length)).toBe(
    0,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_confirmed.png`),
    fullPage: true,
  });
});
