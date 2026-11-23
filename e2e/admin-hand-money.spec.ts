import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { addOrder } from "../src/db/add-order-repo";
import { adminCancelOrder } from "../src/db/admin-cancel-repo";
import { connect } from "../src/db/client";
import { orders } from "../src/db/schema";
import { countingGateway } from "../src/db/test-gateway";
import { checkAddOrder, EMPTY_FORM } from "../src/lib/admin/add-order";
import { addDays, londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.7b: Record a payment (1801:12967), Remove, Record a refund given back (1801:13035) — §9.5.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const day = addDays(
  londonDate(new Date()),
  300 + Math.floor(Math.random() * 300),
);

async function manual(paid = "") {
  const { db, close } = connect();
  try {
    return await addOrder(
      db,
      checkAddOrder(
        {
          ...EMPTY_FORM,
          name: `Callum ${tag}`,
          email: "callum@example.co.uk",
          phone: "07700 900 000",
          date: day,
          address: "1 High Street",
          postcode: "EH52 6RA",
          window: "morning",
          what: "A cake",
          serves: "20",
          total: "380",
          paid,
          method: paid ? "cash" : "",
        },
        londonDate(new Date()),
      ).value!,
      "Linda",
    );
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

test("Record a payment: checks, then a Cash line and Still to pay falls; Remove asks and puts it back", async ({
  page,
}) => {
  const number = await manual();
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${number}`);
  await page.getByRole("button", { name: "Record a payment" }).click();
  const dialog = page.getByRole("dialog", { name: "Record a payment" });
  await expect(dialog).toContainText(`${number} · Callum ${tag}`);
  await expect(dialog).toContainText(
    "Still to pay £380.00 — you can record up to this.",
  );
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await dialog.getByLabel("Amount").fill("400");
  await dialog.getByRole("button", { name: "Record it" }).click();
  await expect(
    dialog.getByText("That is more than the £380.00 still to pay."),
  ).toBeVisible();
  await expect(dialog.getByText("Choose Cash or Bank transfer.")).toBeVisible();
  await dialog.getByLabel("Amount").fill("120");
  await dialog
    .locator("label")
    .filter({ hasText: /^Cash$/ })
    .click();
  await dialog.getByRole("button", { name: "Record it" }).click();
  await expect(dialog).toBeHidden();
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText(/Cash\s*£120\.00 · \d+ \w+/);
  await expect(money).toContainText("£260.00");
  await expect(
    page.getByText(/Recorded a payment · Cash £120\.00/),
  ).toBeVisible();

  await money.getByRole("button", { name: "Remove" }).click();
  const confirm = page.getByRole("dialog", { name: "Remove this payment?" });
  await expect(confirm).toContainText(
    /Remove the £120\.00 cash payment of \d+ \w+\? Still to pay goes back up\. It stays listed in HISTORY\./,
  );
  await confirm.getByRole("button", { name: "Remove it" }).click();
  await expect(confirm).toBeHidden();
  await expect(money.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(
    page.getByText(/Removed the £120\.00 cash payment of/),
  ).toBeVisible();
});

test("a cancelled order with a by-hand part: Record a refund given back, then it reads Refunded", async ({
  page,
}) => {
  const number = await manual("185");
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.number, number));
    await adminCancelOrder(db, countingGateway().gw, {
      orderId: o.id,
      seenVersion: o.version,
      amountPence: 9250,
      by: "Linda",
    });
  } finally {
    await close();
  }
  await page.setViewportSize({ width: 402, height: 902 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${number}`);
  await expect(
    page.getByRole("button", { name: "Record a payment" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Record a refund given back" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Record a refund given back",
  });
  await expect(dialog).toContainText(`${number} · Callum ${tag} · Cancelled`);
  await expect(dialog).toContainText("£92.50 still to give back by hand.");
  await expect(dialog).toContainText(
    "It completes the cancellation refund. The Money flag “£92.50 to give back by hand” clears once the whole amount is recorded.",
  );
  await dialog.getByLabel("Amount").fill("92.50");
  await dialog
    .locator("label")
    .filter({ hasText: /^Bank transfer$/ })
    .click();
  await dialog.getByRole("button", { name: "Record it" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Record a refund given back" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Recorded a refund given back · Bank transfer £92\.50/),
  ).toBeVisible();
  await expect(
    page.getByText("Refunded", { exact: true }).first(),
  ).toBeVisible();
});
