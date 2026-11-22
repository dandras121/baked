import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { and, eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { mailSends, orderHistory, orderLines, orders } from "../src/db/schema";
import { londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.3b: Today’s actions (§9.3) — Mark handed over and Undo, Checked, Nobody was in.
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
        number: `BBL-E2A-${tag}-${name.split(" ")[0]}`,
        token: `e2e-acts-${tag}-${name.split(" ")[0]}-padding`,
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
        paymentIntentId: `pi_e2a_${tag}_${name.split(" ")[0]}`,
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
    await db.delete(orders).where(like(orders.number, `BBL-E2A-${tag}-%`));
  } finally {
    await close();
  }
});

test.beforeAll(async () => {
  await addOrder(`Isla ${tag}`, { deliveryWindow: "morning" });
  await addOrder(`Ruaridh ${tag}`, {
    handover: "collection",
    deliveryWindow: null,
    collectionTime: "12 noon",
    address: null,
  });
  await addOrder(`Kirsty ${tag}`, {
    deliveryWindow: "evening",
    checkDay: true,
  });
});

const row = (page: import("@playwright/test").Page, n: string) =>
  page.getByRole("listitem").filter({ hasText: `${n} ${tag}` });

async function historyOf(first: string) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.number, `BBL-E2A-${tag}-${first}`));
    const h = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id))
      .orderBy(orderHistory.id);
    const mails = await db
      .select()
      .from(mailSends)
      .where(
        and(
          eq(mailSends.template, "missed-you"),
          like(mailSends.key, `order:${o.id}:13:%`),
        ),
      );
    return {
      status: o.status,
      history: h.map((x) => x.what),
      mails: mails.length,
    };
  } finally {
    await close();
  }
}

test("Mark handed over → Handed over {time} · Undo, and Undo puts it back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  const r = row(page, "Ruaridh");
  await r.getByRole("button", { name: "Mark handed over" }).click();
  await expect(r).toContainText(/Handed over \d{2}:\d{2}/);
  expect((await historyOf("Ruaridh")).status).toBe("completed");
  await page.screenshot({
    path: ".shots/8.3b/handed-over-1280.png",
    fullPage: true,
  });
  await r.getByRole("button", { name: "Undo" }).click();
  await expect(
    r.getByRole("button", { name: "Mark handed over" }),
  ).toBeVisible();
  const h = await historyOf("Ruaridh");
  expect(h.status).toBe("confirmed");
  expect(h.history).toEqual(["Marked handed over", "Undid handed over"]);
});

test("Checked clears the check-the-day line", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  const r = row(page, "Kirsty");
  await expect(r).toContainText(
    "Booked after its hold ran out — check the day",
  );
  await r.getByRole("button", { name: "Checked" }).click();
  await expect(r).not.toContainText("check the day");
});

test("Nobody was in: the confirm, Not yet changes nothing, Send the email sends e-mail 13", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  const r = row(page, "Isla");
  await r.getByRole("button", { name: "Nobody was in" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Nobody in at 48 Preston Road?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Isla ${tag} · 9am – 12pm`);
  await expect(dialog).toContainText("collect it today for free");
  await expect(dialog).toContainText("The order page shows the same");
  // The dialog has finished opening (its colours are final) before axe looks.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.3b/nobody-1280.png" });
  await dialog.getByRole("button", { name: "Not yet" }).click();
  await expect(dialog).toBeHidden();
  expect((await historyOf("Isla")).mails).toBe(0);

  await r.getByRole("button", { name: "Nobody was in" }).click();
  await dialog.getByRole("button", { name: "Send the email" }).click();
  await expect(dialog).toBeHidden();
  await expect(r).toContainText("Nobody was in · email sent");
  await expect(r.getByRole("button", { name: "Nobody was in" })).toHaveCount(0);
  const h = await historyOf("Isla");
  expect(h.mails).toBe(1);
  expect(h.history).toEqual(["Nobody was in — the “I missed you” e-mail sent"]);
  await page.screenshot({ path: ".shots/8.3b/today-1280.png", fullPage: true });
});

test("phone: the confirm is a sheet; the row shows its buttons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible()) await notNow.click();
  await expect(
    row(page, "Kirsty").getByRole("button", { name: "Mark handed over" }),
  ).toBeVisible();
  await page.screenshot({ path: ".shots/8.3b/today-402.png", fullPage: true });
  const nobody = row(page, "Kirsty").getByRole("button", {
    name: "Nobody was in",
  });
  if (await nobody.count()) {
    await nobody.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: ".shots/8.3b/nobody-402.png" });
    await page.getByRole("button", { name: "Not yet" }).click();
  }
});
