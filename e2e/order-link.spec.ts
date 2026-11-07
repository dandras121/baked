import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 6.1a: the status link's second check, the lock, and D / F (§6.1, §10.5).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

async function makeOrder(
  o: { handover?: string; daysAhead?: number; email?: string } = {},
) {
  process.loadEnvFile?.(".env.local");
  const handover = o.handover ?? "delivery";
  const date = addDays(londonDate(new Date()), o.daysAhead ?? 10);
  const token = randomBytes(24).toString("base64url");
  const number = `BBL-E2E-${Date.now().toString().slice(-6)}${octet()}`;
  const { db, close } = connect();
  try {
    await db.insert(orders).values({
      number,
      token,
      date,
      earliestDate: date,
      handover,
      deliveryWindow: handover === "delivery" ? "morning" : null,
      postcode: handover === "delivery" ? "EH49 6HH" : null,
      customerName: "Mairi Sinclair",
      email: o.email ?? "mairi@example.co.uk",
      phone: "07700 900 358",
      consents: {},
      totalPence: 18500,
      amountReceivedPence: 18500,
      snapshot: {},
      confirmedAt: new Date(),
    });
  } finally {
    await close();
  }
  return { token, number };
}

const answer = (page: Page) => page.getByRole("textbox").first();

test("delivery: nothing personal before the answer; wrong keeps the value; right opens it", async ({
  page,
}) => {
  const { token, number } = await makeOrder();
  const res = await page.goto(`/my-order/${token}`);
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { level: 1, name: "Open your order" }),
  ).toBeFocused();
  await expect(page.getByText(number)).toHaveCount(0);
  await expect(page.getByText("Mairi")).toHaveCount(0);
  await expect(page.getByLabel("Delivery postcode")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Call \+44/ })).toHaveAttribute(
    "href",
    /^tel:\+44/,
  );
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);

  await answer(page).fill("EH49 6HX");
  await page.getByRole("button", { name: "Open my order" }).click();
  await expect(page.getByText("Nothing has opened yet")).toBeVisible();
  await expect(
    page.getByText(/only unlocks once the postcode matches/),
  ).toBeVisible();
  await expect(answer(page)).toHaveValue("EH49 6HX");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  await answer(page).fill("eh496hh");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(`Order ${number}`)).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "bbl_unlock",
  );
  expect(cookie).toMatchObject({ httpOnly: true, path: `/my-order/${token}` });
  await page.reload();
  await expect(page.getByText(`Order ${number}`)).toBeVisible();
});

test("collection asks the last four digits; five wrong lock the link for 15 minutes", async ({
  page,
}) => {
  const { token } = await makeOrder({ handover: "collection" });
  await page.goto(`/my-order/${token}`);
  const field = page.getByLabel("Last four digits of your phone number");
  await expect(field).toHaveAttribute("inputmode", "numeric");
  for (let i = 0; i < 5; i++) {
    await field.fill(`111${i}`);
    await page.getByRole("button", { name: /Open my order|Try again/ }).click();
    await expect(
      page.getByText("Nothing has opened yet").first(),
    ).toBeVisible();
  }
  await expect(
    page.getByText(/too many tries\. Wait 15 minutes/),
  ).toBeVisible();
  await field.fill("0358");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/too many tries/)).toBeVisible();
});

test("an expired or unknown link: D, then F; e-mail 16 reaches the outbox only for a live order", async ({
  page,
}, info) => {
  const email = `link-${Date.now()}-${octet()}@example.com`;
  const { token } = await makeOrder({ daysAhead: -40, email });
  await makeOrder({ email });
  await page.goto(`/my-order/${token}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Let me send you a new one" }),
  ).toBeVisible();
  await expect(page.getByText("This link has expired")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("");
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me a new link" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "New link sent" }),
  ).toBeAttached();
  await expect(
    page.getByText("Check your inbox — it usually arrives within a minute."),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Find my order" }),
  ).toHaveAttribute("href", "/find-my-order");

  await page.goto("/my-order/not-a-real-token-at-all-0000");
  await expect(
    page.getByRole("heading", { level: 1, name: "Let me send you a new one" }),
  ).toBeVisible();

  if (info.project.name !== "desktop") return;
  await page.goto("/dev/mail");
  await expect(
    page
      .locator("main ol li")
      .filter({ hasText: email })
      .filter({ hasText: /Your link to order BBL-E2E/ }),
  ).toHaveCount(1);
});
