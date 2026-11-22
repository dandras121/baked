import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import sharp from "sharp";
import { connect } from "../src/db/client";
import { orders, uploads } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { signIn } from "./admin-helpers";

// Slice 8.5c: Add a sketch or photo on Add an order (§9.6) — Owner only, never shown to the customer.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const day = addDays(londonDate(new Date()), 40);

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.customerName, `% ${tag}`));
  } finally {
    await close();
  }
});

test("a sketch uploads on Add an order, is saved with the order and shows on Order detail only", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto("/admin/orders/new");
  await expect(
    page.getByText("Up to three. Only you see them — never the customer."),
  ).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(`Shona ${tag}`);
  await page.getByLabel("Phone", { exact: true }).fill("07700 900 127");
  await page.getByLabel("Email", { exact: true }).fill("shona@example.co.uk");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page
    .locator("label")
    .filter({ hasText: /^Collection$/ })
    .click();
  await page
    .getByLabel("What it is", { exact: true })
    .fill("Two tiers, peonies");
  await page.getByLabel("Serves", { exact: true }).fill("30");
  await page.getByLabel("Total", { exact: true }).fill("150");
  const buffer = await sharp({
    create: { width: 900, height: 700, channels: 3, background: "#e8d3a0" },
  })
    .jpeg()
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "peonies.jpg", mimeType: "image/jpeg", buffer });
  await expect(page.getByRole("img", { name: "peonies.jpg" })).toBeVisible();
  await page.screenshot({ path: ".shots/8.5c/form-1280.png", fullPage: true });
  await page.getByRole("button", { name: "Save the order" }).first().click();
  await expect(page).toHaveURL(/saved=1$/);
  const sketches = page.getByRole("region", { name: "Sketches and photos" });
  await expect(
    sketches.getByRole("img", { name: "Sketch: peonies.jpg" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".shots/8.5c/detail-1280.png",
    fullPage: true,
  });
  // The full picture opens through its signed link.
  const href = await sketches.getByRole("link").getAttribute("href");
  expect((await page.request.get(href!)).headers()["content-type"]).toBe(
    "image/jpeg",
  );

  const { db, close } = connect();
  let token = "";
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.customerName, `Shona ${tag}`));
    token = o.token;
    const pics = await db
      .select()
      .from(uploads)
      .where(eq(uploads.orderId, o.id));
    expect(pics.map((p) => p.purpose)).toEqual(["order"]);
  } finally {
    await close();
  }
  // The customer's order page never shows it.
  await page.goto(`/my-order/${token}`);
  await expect(page.getByRole("img", { name: /peonies/ })).toHaveCount(0);
});

test("an order sketch cannot be uploaded without an Owner session", async ({
  request,
}) => {
  const r = await request.post("/api/pictures", {
    multipart: {
      formKey: crypto.randomUUID(),
      purpose: "order",
      file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") },
    },
  });
  expect(r.status()).toBe(400);
  expect(await r.json()).toEqual({ error: "failed" });
});
