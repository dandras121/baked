import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.1b: the status page states A, B, B2, C (§6.2, §6.3; 1036:9106).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

async function open(
  page: Page,
  o: { days: number; handover?: string; kind?: string; status?: string },
) {
  process.loadEnvFile?.(".env.local");
  const handover = o.handover ?? "delivery";
  const date = addDays(londonDate(new Date()), o.days);
  const token = randomBytes(24).toString("base64url");
  const number = `BBL-E2E-${Date.now().toString().slice(-6)}${octet()}`;
  const { db, close } = connect();
  try {
    const [r] = await db
      .insert(orders)
      .values({
        number,
        token,
        kind: o.kind ?? "catalogue",
        status: o.status ?? "confirmed",
        date,
        earliestDate: date,
        handover,
        deliveryWindow: handover === "delivery" ? "morning" : null,
        address: handover === "delivery" ? "48 Preston Road" : null,
        postcode: handover === "delivery" ? "EH49 6HH" : null,
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 358",
        allergyNote: "No nuts",
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
      slug: o.kind === "manual" ? "" : "the-lothian",
      name: o.kind === "manual" ? "Two-tier wedding cake" : "The Lothian",
      sizeLine: "Two tiers · serves 24",
      flavour: o.kind === "manual" ? "" : "Vanilla sponge",
      message: o.kind === "manual" ? null : "Happy 30th, Mairi",
      pricePence: 18500,
      allergenText: "Contains gluten (wheat), eggs and milk.",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
  await page.goto(`/my-order/${token}`);
  await page
    .getByRole("textbox")
    .fill(handover === "delivery" ? "EH49 6HH" : "0358");
  await page.getByRole("button", { name: "Open my order" }).click();
  await expect(page.getByText(`Order ${number}`)).toBeVisible();
  return { token, date };
}

const main = (page: Page) => page.getByRole("main");

test("A · booked: the NEXT box, Change something, Message Linda, the D-2 line, Need to cancel instead", async ({
  page,
}) => {
  const { token } = await open(page, { days: 10 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cake is booked" }),
  ).toBeFocused();
  await expect(
    main(page).getByText(
      "I will be with you then. Nothing for you to do until the morning.",
    ),
  ).toBeVisible();
  await expect(
    main(page).getByRole("link", { name: "Change something" }),
  ).toHaveAttribute("href", `/my-order/${token}/change`);
  await expect(
    main(page).getByRole("link", { name: "Message Linda" }),
  ).toHaveAttribute("href", `/my-order/${token}/message`);
  await expect(
    main(page).getByText(
      /^Changes are possible until \w+day \d+ \w+\. After that/,
    ),
  ).toBeVisible();
  await expect(
    main(page).getByRole("link", { name: "Need to cancel instead? →" }),
  ).toHaveAttribute("href", `/my-order/${token}/cancel`);
  // Your order: the cake with its allergens, the handover rows, the money.
  const panel = page.getByRole("region", { name: "Your order" });
  await expect(panel.getByText("The Lothian")).toBeVisible();
  await expect(
    panel.getByText("Contains gluten (wheat), eggs and milk."),
  ).toBeVisible();
  await expect(panel.getByText("“Happy 30th, Mairi”")).toBeVisible();
  await expect(panel.getByText("48 Preston Road, EH49 6HH")).toBeVisible();
  await expect(panel.getByText("No nuts")).toBeVisible();
  await expect(panel.getByText("Paid in full")).toBeVisible();
  await expect(
    panel.getByText("Receipt sent to mairi@example.co.uk"),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
});

test("B · from D-1: no change or cancel, the fixed-design line", async ({
  page,
}) => {
  await open(page, { days: 1 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cake is booked" }),
  ).toBeVisible();
  await expect(
    main(page).getByRole("link", { name: "Change something" }),
  ).toHaveCount(0);
  await expect(
    main(page).getByRole("link", { name: /Need to cancel/ }),
  ).toHaveCount(0);
  await expect(
    main(page).getByText(
      "The design is fixed now, but ring me if something urgent has changed.",
    ),
  ).toBeVisible();
});

test("B2 · today: delivery says today and the window; collection shows where from", async ({
  page,
}) => {
  await open(page, { days: 0 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Today is the day" }),
  ).toBeVisible();
  await expect(main(page).getByText("Today, 9am – 12pm")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Your order" })
      .getByText(/^Today, \w{3} /),
  ).toBeVisible();
  await open(page, { days: 0, handover: "collection" });
  await expect(
    main(page).getByText("Today, at the time we agreed"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Your order" })
      .getByText("Agreed with Linda"),
  ).toBeVisible();
});

test("C · after the date: Order this cake again; the link's last day", async ({
  page,
}) => {
  await open(page, { days: -5 });
  await expect(
    page.getByRole("heading", { level: 1, name: "That was your cake" }),
  ).toBeVisible();
  await expect(
    main(page).getByRole("link", { name: "Order this cake again" }),
  ).toHaveAttribute("href", "/cakes/the-lothian");
  await expect(
    main(page).getByText(/^Keep this link if you like — it works until /),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
});

test("a manual order: no change, no cancel, no flavour or photo; the bespoke line", async ({
  page,
}) => {
  await open(page, { days: 10, kind: "manual" });
  await expect(
    main(page).getByRole("link", { name: "Change something" }),
  ).toHaveCount(0);
  await expect(
    main(page).getByText(/bespoke cake go through me/),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Your order" })
      .getByText("Two-tier wedding cake"),
  ).toBeVisible();
});
