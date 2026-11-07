import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { eq } from "drizzle-orm";
import { readOptions } from "../src/db/cake-page-repo";
import { cakes, orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.2a: Change your order — the message (§6.4), A2, the saved banner and e-mail 12.
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
        email: `chg-${octet()}@example.com`,
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

test("a smaller size: −£55 in the list, the refund line before saving; saved with the refund on the order page", async ({
  page,
}, info) => {
  const { token, number } = await make(10, "catalogue", 32);
  await unlockAt(page, `/my-order/${token}/change`);
  await page
    .getByRole("button", { name: "Change the size of The Lothian" })
    .click();
  await expect(page.getByText("−£55")).toBeVisible();
  await expect(page.getByText("current")).toBeVisible();
  await page.getByText("Serves 24 · two tiers").click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByText("Changed · was Two tiers · serves 32"),
  ).toBeVisible();
  await expect(
    page.getByText(/^£55 goes back to your card when you save/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText(/£55 back to your card within 5–10 working days/),
  ).toBeVisible();
  const panel = page.getByRole("region", { name: "Your order" });
  await expect(panel.getByText("Two tiers · serves 24")).toBeVisible();
  await expect(panel.getByText(/^Refunded £55 on /)).toBeVisible();
  await expect(panel.getByText("Paid in full")).toBeVisible();
  await expect(panel.getByText("£185")).toBeVisible();
  if (info.project.name !== "desktop") return;
  await page.goto("/dev/mail");
  await expect(
    page
      .locator("main ol li")
      .filter({ hasText: "Your change is saved — £55 on its way back" })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator("main ol li")
      .filter({ hasText: `Customer changed ${number}` })
      .first(),
  ).toBeVisible();
});

test("a bigger size: +£55 in the list, Pay the difference with “Pay £55 and save” instead of Save", async ({
  page,
}) => {
  const { token } = await make(10);
  await unlockAt(page, `/my-order/${token}/change`);
  await page
    .getByRole("button", { name: "Change the size of The Lothian" })
    .click();
  await expect(page.getByText("+£55")).toBeVisible();
  await page.getByText("Serves 32 · two tiers").click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("heading", { name: "Pay the difference" }),
  ).toBeVisible();
  await expect(
    page.getByText("£55 today — the size goes up from serves 24 to serves 32."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pay £55 and save" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(
    0,
  );
  // Without Stripe keys (this test server) nothing can be charged, and it says so.
  await expect(
    page.getByText(/Payments are not switched on yet/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Undo the size change on The Lothian" })
    .click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
});

test("options: Bramble & Cream vanilla → chocolate shows +£5 and the soya live, then Pay the difference", async ({
  page,
}) => {
  process.loadEnvFile?.(".env.local");
  const date = addDays(londonDate(new Date()), 10);
  const token = randomBytes(24).toString("base64url");
  const { db, close } = connect();
  try {
    const [cake] = await db
      .select()
      .from(cakes)
      .where(eq(cakes.slug, "bramble-and-cream"));
    const opts = await readOptions(db, cake.id);
    const sponge = opts.find((o) => o.label === "Sponge")!;
    const [r] = await db
      .insert(orders)
      .values({
        number: `BBL-E2E-${Date.now().toString().slice(-6)}${octet()}`,
        token,
        date,
        earliestDate: date,
        handover: "collection",
        customerName: "Rory Fraser",
        email: `opt-${octet()}@example.com`,
        phone: "07700 900 358",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_e2e_opt_${token.slice(0, 6)}`,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning({ id: orders.id });
    await db.insert(orderLines).values({
      orderId: r.id,
      position: 1,
      slug: "bramble-and-cream",
      name: "Bramble & Cream",
      sizeLine: "Two tiers · serves 24",
      options: "Sponge: Vanilla",
      answers: { picks: { [sponge.id]: [sponge.choices[0].id] }, texts: {} },
      message: "",
      pricePence: 18500,
      sizePricePence: 18500,
      allergenText: "Contains gluten (wheat), eggs and milk.",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
  await page.goto(`/my-order/${token}/change`);
  await page.getByRole("textbox").fill("0358");
  await page.getByRole("button", { name: "Open my order" }).click();
  await page
    .getByRole("button", { name: "Change the options on Bramble & Cream" })
    .click();
  await page.getByText("Chocolate", { exact: true }).click();
  await expect(page.getByText(/^\+£5 · Contains .*soya/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByText(/^Changed · was Sponge: Vanilla · \+£5$/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pay £5 and save" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Undo the options change on Bramble & Cream" })
    .click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
});

test("date and window: pick another free day and Evening; saved; the order page shows the new day", async ({
  page,
}) => {
  const { token } = await make(10);
  await unlockAt(page, `/my-order/${token}/change`);
  await page
    .getByRole("button", { name: "Change the date and window" })
    .click();
  const free = page
    .locator("[data-shown] label[data-state=available] input")
    .nth(3);
  const picked = await free.getAttribute("value");
  await free.locator("..").click();
  await page.locator("label").filter({ hasText: /^Evening/ }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText(/^Changed · was /)).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your change is saved.")).toBeVisible();
  const [, m, d] = picked!.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  await expect(
    page
      .getByRole("region", { name: "Your order" })
      .getByText(new RegExp(`${d} ${months[m - 1]}`)),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Your order" }).getByText("4 – 7pm"),
  ).toBeVisible();
});
