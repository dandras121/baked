import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { and, eq, like } from "drizzle-orm";
import { addOrder } from "../src/db/add-order-repo";
import { connect } from "../src/db/client";
import { applyPayLink, preparePayLink } from "../src/db/pay-link-repo";
import { mailSends, orders, paymentLinks } from "../src/db/schema";
import { countingGateway } from "../src/db/test-gateway";
import { checkAddOrder, EMPTY_FORM } from "../src/lib/admin/add-order";
import { addDays, londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.7a: Send a payment link (§9.8), the link line's Copy the link · Cancel this link (§9.5), Save and send (§9.6).
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const day = addDays(
  londonDate(new Date()),
  300 + Math.floor(Math.random() * 300),
);

async function manual() {
  const { db, close } = connect();
  try {
    return await addOrder(
      db,
      checkAddOrder(
        {
          ...EMPTY_FORM,
          name: `Mairi ${tag}`,
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          date: day,
          address: "Hopetoun House",
          postcode: "EH30 9SL",
          window: "afternoon",
          what: "Three tiers",
          serves: "100",
          total: "380",
        },
        londonDate(new Date()),
      ).value!,
      "Linda",
    );
  } finally {
    await close();
  }
}

async function payOpenLink(number: string) {
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.number, number));
    const [l] = await db
      .select()
      .from(paymentLinks)
      .where(
        and(eq(paymentLinks.orderId, o.id), eq(paymentLinks.status, "open")),
      );
    const t = countingGateway();
    const p = await preparePayLink(db, t.gw, l.token);
    if (p.kind !== "pay") throw new Error(p.kind);
    t.succeed(`pi_link_${p.linkId}`);
    await applyPayLink(db, t.gw, t.intents.get(`pi_link_${p.linkId}`)!);
    return o.id;
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

test("Send a payment link: The rest by default, the checks, Deposit £120 sent; paid → Paid so far updates", async ({
  page,
}) => {
  const number = await manual();
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${number}`);
  await page.getByRole("button", { name: "Send a payment link" }).click();
  const dialog = page.getByRole("dialog", { name: "Send a payment link" });
  await expect(dialog).toContainText(`${number} · Mairi ${tag}`);
  await expect(dialog.getByLabel("The rest")).toBeChecked();
  await expect(dialog.getByLabel("Amount")).toHaveValue("380");
  await expect(dialog).toContainText(
    "Total £380.00 · paid so far £0.00 · still to pay £380.00",
  );
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  await dialog
    .locator("label")
    .filter({ hasText: /^Deposit$/ })
    .click();
  await expect(dialog.getByLabel("Amount")).toHaveValue("");
  await expect(
    dialog.getByRole("button", { name: "Send the link" }),
  ).toBeDisabled();
  await dialog.getByLabel("Amount").fill("400");
  await expect(
    dialog.getByText("That is more than the £380.00 still to pay."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Send the link" }),
  ).toBeDisabled();
  await dialog.getByLabel("Amount").fill("£120");
  await dialog.getByRole("button", { name: "Send the link" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "Link sent" }),
  ).toHaveText("Link sent · £120.00 · Deposit");
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText(/Deposit · £120\.00 · sent \d+ \w+/);
  await expect(
    money.getByRole("button", { name: "Copy the link" }),
  ).toBeVisible();

  const id = await payOpenLink(number);
  await page.reload();
  await expect(money).toContainText("Still to pay");
  await expect(money).toContainText("£260.00");
  await expect(
    money.getByRole("button", { name: "Copy the link" }),
  ).toHaveCount(0);
  const { db, close } = connect();
  try {
    const m = await db
      .select()
      .from(mailSends)
      .where(like(mailSends.key, "pay:%"));
    const [l] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.orderId, id));
    expect(m.some((x) => x.key === `pay:${l.id}`)).toBe(true);
  } finally {
    await close();
  }
});

test("Cancel this link asks first, then the line goes", async ({ page }) => {
  const number = await manual();
  await page.setViewportSize({ width: 402, height: 902 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${number}`);
  await page.getByRole("button", { name: "Send a payment link" }).click();
  const dialog = page.getByRole("dialog", { name: "Send a payment link" });
  await dialog.getByRole("button", { name: "Send the link" }).click();
  await expect(dialog).toBeHidden();
  const money = page.getByRole("region", { name: "Money" });
  await money.getByRole("button", { name: "Cancel this link" }).click();
  const confirm = page.getByRole("dialog", { name: "Cancel this link?" });
  await expect(confirm).toContainText(
    `It stops working at once. No e-mail goes to Mairi.`,
  );
  await confirm.getByRole("button", { name: "Cancel the link" }).click();
  await expect(confirm).toBeHidden();
  await expect(
    money.getByRole("button", { name: "Cancel this link" }),
  ).toHaveCount(0);
});

test("Add an order: Save and send a payment link saves, then opens Send a payment link on the order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders/new");
  await page.getByLabel("Name", { exact: true }).fill(`Ewan ${tag}`);
  await page.getByLabel("Phone", { exact: true }).fill("07700 900 000");
  await page.getByLabel("Email", { exact: true }).fill("ewan@example.co.uk");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page.getByLabel("Address", { exact: true }).fill("1 High Street");
  await page.getByLabel("Postcode", { exact: true }).fill("EH52 6RA");
  await page
    .locator("label")
    .filter({ hasText: /^Morning/ })
    .click();
  await page.getByLabel("What it is", { exact: true }).fill("A birthday cake");
  await page.getByLabel("Serves", { exact: true }).fill("20");
  await expect(
    page.getByRole("button", { name: "Save and send a payment link" }),
  ).toHaveCount(0);
  await page.getByLabel("Total", { exact: true }).fill("90");
  await page
    .getByRole("button", { name: "Save and send a payment link" })
    .click();
  await expect(page).toHaveURL(/\/admin\/orders\/BBL-.*\?saved=1&pay=1$/);
  const dialog = page.getByRole("dialog", { name: "Send a payment link" });
  await expect(dialog.getByLabel("Amount")).toHaveValue("90");
});
