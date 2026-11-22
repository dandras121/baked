import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import {
  adminSessions,
  mailSends,
  orderLines,
  orders,
  teamMembers,
} from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { codeFor, settled, signIn } from "./admin-helpers";

// Slice 8.4c: Cancel the order from the admin (§9.5), the version check and a save after the session ended (§9.2).
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const num = (first: string) => `BBL-E2C-${tag}-${first}`;

async function addOrder(first: string) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: num(first),
        token: `e2e-cancel-${tag}-${first}-padding`,
        date: addDays(today, 20),
        earliestDate: addDays(today, 20),
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        town: "Linlithgow",
        postcode: "EH49 6HH",
        customerName: `${first} Sinclair`,
        email: `${first.toLowerCase()}@example.co.uk`,
        phone: "07700 900 000",
        consents: {},
        totalPence: 28000,
        amountReceivedPence: 28000,
        paymentIntentId: `pi_e2c_${tag}_${first}`,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning();
    await db.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "Two tiers · serves 24",
      pricePence: 28000,
      allergenText: "Contains: wheat, egg, milk",
      allergenKeys: [],
    });
    return o;
  } finally {
    await close();
  }
}

const orderRow = async (first: string) => {
  const { db, close } = connect();
  try {
    return (
      await db
        .select()
        .from(orders)
        .where(eq(orders.number, num(first)))
    )[0];
  } finally {
    await close();
  }
};

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2C-${tag}-%`));
  } finally {
    await close();
  }
});

test.beforeAll(async () => {
  for (const f of ["Mairi", "Ewan", "Shona", "Kirsty"]) await addOrder(f);
});

test("Cancel the order: the terms' refund, an amount over what was paid is refused, then cancelled with e-mail 8", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Mairi")}`);
  test.skip(
    (await orderRow("Mairi")).status !== "confirmed",
    "cancelled by another width already",
  );
  await page.getByRole("button", { name: "Cancel the order" }).click();
  const dialog = page.getByRole("dialog", { name: `Cancel ${num("Mairi")}?` });
  await expect(dialog).toContainText(
    "The terms give a full refund today: £280.00. Paid so far: £280.00.",
  );
  await expect(dialog.getByLabel("Refund")).toHaveValue("280.00");
  await expect(dialog).toContainText("£280.00 back to the card");
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.4c/cancel-1280.png" });
  await dialog.getByLabel("Refund").fill("300");
  await dialog.getByRole("button", { name: /^Cancel and refund/ }).click();
  await expect(dialog).toContainText("That is more than the £280.00 paid.");
  await dialog.getByLabel("Refund").fill("200");
  await expect(
    dialog.getByRole("button", { name: "Cancel and refund £200.00" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Cancel and refund £200.00" })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/^(Cancelled|Refunded)$/).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Money" })).toContainText(
    /Cancelled\d+ \w{3} · £200\.00 back to the card/,
  );
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Linda · Cancelled the order · £200.00 back to the card",
  );
  await expect(
    page.getByRole("button", { name: "Cancel the order" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: ".shots/8.4c/cancelled-1280.png",
    fullPage: true,
  });
  const { db, close } = connect();
  try {
    const o = await orderRow("Mairi");
    const mails = await db
      .select()
      .from(mailSends)
      .where(eq(mailSends.key, `order:${o.id}:8`));
    expect(mails).toHaveLength(1);
    expect(mails[0].data).toMatchObject({
      view: { tier: "own", cardPence: 20000, byLinda: true },
    });
  } finally {
    await close();
  }
});

test("two people at once: an out-of-date page is refused with who changed it; the amount stays", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Ewan")}`);
  test.skip(
    (await orderRow("Ewan")).status !== "confirmed",
    "cancelled by another width already",
  );
  await page.getByRole("button", { name: "Cancel the order" }).click();
  const { db, close } = connect();
  try {
    const o = await orderRow("Ewan");
    await db
      .update(orders)
      .set({
        version: o.version + 1,
        changedBy: "member:Ewan",
        changedAt: new Date(),
      })
      .where(eq(orders.id, o.id));
  } finally {
    await close();
  }
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Refund").fill("150");
  await dialog
    .getByRole("button", { name: "Cancel and refund £150.00" })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    /^Ewan changed this at \d{2}:\d{2} — here is the new version$/,
  );
  await expect(dialog.getByLabel("Refund")).toHaveValue("150");
  expect((await orderRow("Ewan")).status).toBe("confirmed");
  // The page now holds the new version: pressing again cancels.
  await dialog
    .getByRole("button", { name: "Cancel and refund £150.00" })
    .click();
  await expect(dialog).toBeHidden();
  expect((await orderRow("Ewan")).status).not.toBe("confirmed");
});

test("a save after the session ended: sign in inside the dialog, nothing typed is lost, Save again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const email = await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Shona")}`);
  test.skip(
    (await orderRow("Shona")).status !== "confirmed",
    "cancelled by another width already",
  );
  await page.getByRole("button", { name: "Cancel the order" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Refund").fill("99");
  const { db, close } = connect();
  try {
    const [m] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.email, email));
    await db.delete(adminSessions).where(eq(adminSessions.memberId, m.id));
  } finally {
    await close();
  }
  await dialog
    .getByRole("button", { name: "Cancel and refund £99.00" })
    .click();
  await expect(dialog).toContainText(
    "Your sign-in has ended, so nothing was saved yet.",
  );
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByRole("button", { name: "Send me a code" }).click();
  await dialog.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(await codeFor(email));
  await expect(dialog.getByLabel("Refund")).toHaveValue("99");
  await expect(dialog).toContainText(
    "Signed in again — press the button to save.",
  );
  await dialog.getByRole("button", { name: "Save again" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Shona")}$`));
  expect((await orderRow("Shona")).status).not.toBe("confirmed");
});

test("a Helper has no Cancel the order", async ({ page }) => {
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders/${num("Kirsty")}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    num("Kirsty"),
  );
  await expect(
    page.getByRole("button", { name: "Cancel the order" }),
  ).toHaveCount(0);
});

test("phone: the cancel confirm opens and keeps its buttons on screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible()) await notNow.click();
  await page.goto(`/admin/orders/${num("Kirsty")}`);
  await page.getByRole("button", { name: "Cancel the order" }).click();
  await expect(
    page.getByRole("button", { name: "Keep the order" }),
  ).toBeInViewport();
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".shots/8.4c/cancel-402.png" });
  await page.getByRole("button", { name: "Keep the order" }).click();
  expect((await orderRow("Kirsty")).status).toBe("confirmed");
});
