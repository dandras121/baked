import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.2a: Change your order — the message (§6.4), A2, the saved banner and e-mail 12.
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

async function make(days: number, kind = "catalogue") {
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
        email: `chg-${octet()}@example.com`,
        phone: "07700 900 358",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning({ id: orders.id });
    await db.insert(orderLines).values({
      orderId: r.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "Two tiers · serves 24",
      flavour: "Vanilla sponge",
      message: "Happy 30th",
      pricePence: 18500,
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

test("the e-mail 2 deep link asks the check first, then opens the change page", async ({
  page,
}) => {
  const { token } = await make(10);
  await unlockAt(page, `/my-order/${token}/change`);
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}/change$`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "What would you like to change?",
    }),
  ).toBeFocused();
  await expect(
    page.getByText(/^Changes are free until \w+day \d+ \w+$/),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
});

test("change the message: Done shows the new value, Changed · was, Undo; Save → banner, e-mail 12", async ({
  page,
}, info) => {
  const { token, number } = await make(10);
  await unlockAt(page, `/my-order/${token}`);
  await page
    .getByRole("main")
    .getByRole("link", { name: "Change something" })
    .click();
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await page
    .getByRole("button", { name: "Change the message on The Lothian" })
    .click();
  const field = page.getByLabel("Message on The Lothian");
  await expect(field).toHaveValue("Happy 30th");
  await field.fill("Happy 🎂");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByText(
      "Emoji and symbols cannot be piped — please use letters and numbers.",
    ),
  ).toBeVisible();
  await field.fill("Happy 30th, Mairi");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("“Happy 30th, Mairi”")).toBeVisible();
  await expect(page.getByText("Changed · was “Happy 30th”")).toBeVisible();
  await page
    .getByRole("button", { name: "Undo the message change on The Lothian" })
    .click();
  await expect(save).toBeDisabled();
  await page
    .getByRole("button", { name: "Change the message on The Lothian" })
    .click();
  await field.fill("Happy 30th, Mairi");
  await page.getByRole("button", { name: "Done" }).click();
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/my-order/${token}\\?saved=\\d+`));
  await expect(page.getByText("Your change is saved.")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Your order" })
      .getByText("“Happy 30th, Mairi”"),
  ).toBeVisible();
  if (info.project.name !== "desktop") return;
  await page.goto("/dev/mail");
  await expect(
    page
      .locator("main ol li")
      .filter({ hasText: "Your change is saved" })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator("main ol li")
      .filter({ hasText: `Customer changed ${number}` })
      .first(),
  ).toBeVisible();
});

test("an empty message asks “Leave the cake plain?” first", async ({
  page,
}) => {
  const { token } = await make(10);
  await unlockAt(page, `/my-order/${token}/change`);
  await page
    .getByRole("button", { name: "Change the message on The Lothian" })
    .click();
  await page.getByLabel("Message on The Lothian").fill("");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Leave the cake plain?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, keep it plain" }).click();
  await expect(page.getByText("No message", { exact: true })).toBeVisible();
});

test("from D-1 the change page is A2; a manual order goes back to its page", async ({
  page,
}) => {
  const { token } = await make(1);
  await unlockAt(page, `/my-order/${token}/change`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your cake is already being made",
    }),
  ).toBeVisible();
  await expect(page.getByText(/^Changes closed on /)).toBeVisible();
  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  const m = await make(10, "manual");
  await unlockAt(page, `/my-order/${m.token}/change`);
  await expect(page).toHaveURL(new RegExp(`/my-order/${m.token}$`));
});
