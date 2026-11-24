import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { addOrder } from "../src/db/add-order-repo";
import { connect } from "../src/db/client";
import { orderHistory, orders } from "../src/db/schema";
import { checkAddOrder, EMPTY_FORM } from "../src/lib/admin/add-order";
import { addDays, londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.6d: Edit the order (§9.7, manual orders) — the Add an order form filled in, Paid so far fixed, the refund question.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const day = addDays(
  londonDate(new Date()),
  300 + Math.floor(Math.random() * 300),
);

async function manual(over: Partial<typeof EMPTY_FORM> = {}) {
  const { db, close } = connect();
  try {
    const v = checkAddOrder(
      {
        ...EMPTY_FORM,
        name: `Mairi ${tag}`,
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        date: day,
        address: "Hopetoun House",
        town: "South Queensferry",
        postcode: "EH30 9SL",
        window: "afternoon",
        what: "Three tiers, ivory buttercream",
        serves: "100",
        tiers: "3",
        allergens: ["milk", "eggs"],
        total: "380",
        paid: "100",
        method: "bank",
        ...over,
      },
      londonDate(new Date()),
    ).value!;
    return await addOrder(db, v, "Linda");
  } finally {
    await close();
  }
}

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.customerName, `% ${tag}`));
  } finally {
    await close();
  }
});

test("Owner: Edit the order opens filled in; a total below what was paid asks first, then saves with the by-hand part", async ({
  page,
}) => {
  const number = await manual();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${number}`);
  await page.getByRole("link", { name: "Edit the order" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit the order" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Edit the order/);
  await expect(page.getByLabel("What it is", { exact: true })).toHaveValue(
    "Three tiers, ivory buttercream",
  );
  await expect(page.getByLabel("Total", { exact: true })).toHaveValue("380");
  await expect(page.getByText("£100.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Paid so far" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  await page.getByLabel("Total", { exact: true }).fill("60");
  await page.getByLabel("Inscription", { exact: true }).fill("Mairi & Tom");
  await page.getByRole("button", { name: "Save changes" }).click();
  const dialog = page.getByRole("dialog", { name: "Save and refund?" });
  await expect(dialog).toContainText(
    "The new total is £40.00 less than Mairi has paid: £40.00 you give back by hand.",
  );
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Save changes" }).click();
  await dialog.getByRole("button", { name: "Save and refund" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${number}$`));
  await expect(
    page.getByText(/Edited the order · .*Total: £380\.00 → £60\.00/),
  ).toBeVisible();

  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.number, number));
    expect(o.totalPence).toBe(6000);
    const h = await db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id))
      .orderBy(orderHistory.id);
    expect(h.at(-1)?.what).toMatch(/£40\.00 to give back by hand/);
  } finally {
    await close();
  }
});

test("Helper: only the day, handover, address, inscription and collection time can be changed", async ({
  page,
}) => {
  const number = await manual();
  await page.setViewportSize({ width: 402, height: 902 });
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders/${number}/change`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit the order" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Total", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("What it is", { exact: true })).toBeDisabled();
  await page.getByLabel("Inscription", { exact: true }).fill("Happy day");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${number}$`));
  await expect(
    page.getByText(/Edited the order · Message: No message → “Happy day”/),
  ).toBeVisible();
});

test("Two people at once: the second save shows who changed it and the new version, nothing of theirs is lost", async ({
  page,
}) => {
  const number = await manual();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${number}/change`);
  await expect(page.getByLabel("Inscription", { exact: true })).toHaveValue("");
  // Meanwhile someone else saves an inscription.
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.number, number));
    await db
      .update(orders)
      .set({
        version: o.version + 1,
        changedBy: "member:Fiona",
        changedAt: new Date(),
      })
      .where(eq(orders.id, o.id));
  } finally {
    await close();
  }
  await page.getByLabel("Inscription", { exact: true }).fill("Mine");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "here is the new version" }),
  ).toHaveText(/^Fiona changed this at .* — here is the new version$/);
  await expect(page.getByLabel("Inscription", { exact: true })).toHaveValue("");
});
