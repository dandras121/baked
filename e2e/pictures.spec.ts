import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { connect } from "../src/db/client";
import { enquiries, uploads } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 7.1b: Add up to three pictures on the bespoke form (§7.1, J 975:9114, tiles 660:4230 / 847:8173).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

const colours = ["#c9a0dc", "#f4b6c2", "#a0c4dc", "#e8d3a0"];
async function picture(name: string, i = 0) {
  const buffer = await sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 3,
      background: colours[i % 4],
    },
  })
    .jpeg()
    .toBuffer();
  return { name, mimeType: "image/jpeg", buffer };
}
const picker = (page: Page) => page.locator('input[type="file"]');
const tiles = (page: Page) =>
  page.getByRole("button", { name: "Add a picture" });

async function ready(page: Page) {
  const p = page.getByRole("button", { name: "My date is still flexible" });
  await p.click();
  await expect(p).toHaveAttribute("aria-pressed", "true");
  await p.click();
}

async function thumbShown(page: Page, name: string) {
  const img = page.getByRole("img", { name });
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBe(400);
}

test("pictures upload as soon as picked, show their thumbnail, and come off with ×", async ({
  page,
}) => {
  await page.goto("/bespoke");
  await ready(page);
  await expect(page.getByText("Add up to three pictures")).toBeVisible();
  await expect(tiles(page)).toHaveCount(3);
  await picker(page).setInputFiles([
    await picture("inspiration-1.jpg", 0),
    await picture("venue.jpg", 1),
  ]);
  await thumbShown(page, "inspiration-1.jpg");
  await thumbShown(page, "venue.jpg");
  await expect(tiles(page)).toHaveCount(1);
  expect(
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze(),
  ).toHaveProperty("violations", []);
  await page.getByRole("button", { name: "Remove venue.jpg" }).click();
  await expect(page.getByRole("img", { name: "venue.jpg" })).toHaveCount(0);
  await expect(tiles(page)).toHaveCount(2);
});

test("the limits: too big as drawn (J), a wrong type, more than three", async ({
  page,
}) => {
  await page.goto("/bespoke");
  await ready(page);
  await picker(page).setInputFiles({
    name: "peonies-4.heic",
    mimeType: "image/heic",
    buffer: Buffer.alloc(12 * 1024 * 1024 - 100),
  });
  await expect(page.getByText("That one is too big")).toBeVisible();
  await expect(
    page.getByText(
      "peonies-4.heic is 12 MB and the limit is 8 MB. JPG, PNG or HEIC, up to three pictures.",
    ),
  ).toBeVisible();
  await expect(tiles(page)).toHaveCount(3);

  await picker(page).setInputFiles({
    name: "notes.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(
    page.getByText(
      "notes.pdf is not a picture I can open. JPG, PNG or HEIC, up to three pictures.",
    ),
  ).toBeVisible();

  // Named .jpg but not a picture: the server reads the bytes.
  await picker(page).setInputFiles({
    name: "fake.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("this is not a picture at all"),
  });
  await expect(
    page.getByText("fake.jpg is not a picture I can open."),
  ).toBeVisible();
  await expect(tiles(page)).toHaveCount(3);

  await picker(page).setInputFiles(
    await Promise.all([1, 2, 3, 4].map((i) => picture(`cake-${i}.jpg`, i))),
  );
  await expect(
    page.getByText("I kept the first three — remove one to swap it."),
  ).toBeVisible();
  await thumbShown(page, "cake-3.jpg");
  await expect(page.getByRole("img", { name: "cake-4.jpg" })).toHaveCount(0);
  await expect(tiles(page)).toHaveCount(0);
});

test("a failed upload offers Try again; Send waits for an unfinished one; the pictures are kept with the enquiry", async ({
  page,
}) => {
  await page.goto("/bespoke");
  await ready(page);
  // The first attempt fails on the way.
  let fail = true;
  await page.route("**/api/pictures", async (route) => {
    if (fail) {
      fail = false;
      return route.abort();
    }
    await new Promise((r) => setTimeout(r, 1500));
    return route.continue();
  });
  await picker(page).setInputFiles(await picture("venue.jpg", 2));
  await expect(
    page.getByText(
      "venue.jpg did not upload — nothing else was lost. Try again or remove it.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: /Try again/ }).click();

  await pill(page, "Birthday");
  await page.getByLabel("Full name").fill("Mairi Sinclair");
  await page
    .locator("#bespoke-email")
    .fill(`pictures-${Date.now()}@example.com`);
  await page.locator("#bespoke-phone").fill("07700 900 000");
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await page.getByRole("button", { name: /send it anyway/ }).click();
  await expect(page.getByText("Waiting for 1 picture…")).toBeVisible();
  await expect(page).toHaveURL(/\/bespoke\/sent\?ref=/, { timeout: 15_000 });

  const ref = new URL(page.url()).searchParams.get("ref")!;
  const { db, close } = connect();
  try {
    const [row] = await db
      .select({ id: enquiries.id })
      .from(enquiries)
      .where(eq(enquiries.reference, ref));
    const pics = await db
      .select()
      .from(uploads)
      .where(eq(uploads.enquiryId, row.id));
    expect(pics.map((p) => p.name)).toEqual(["venue.jpg"]);
  } finally {
    await close();
  }
});

async function pill(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

test("a picture is only reachable through its signed link", async ({
  request,
}) => {
  const r = await request.get(
    "/api/pictures/4b0c0e7e-1111-4222-8333-944455556666/file?u=zzzz&s=forged",
  );
  expect(r.status()).toBe(404);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/bespoke");
    await ready(page);
    await picker(page).setInputFiles(await picture("inspiration-1.jpg", 0));
    await thumbShown(page, "inspiration-1.jpg");
    await picker(page).setInputFiles({
      name: "peonies-4.heic",
      mimeType: "image/heic",
      buffer: Buffer.alloc(12 * 1024 * 1024 - 100),
    });
    await page.getByText("That one is too big").waitFor();
    await page
      .getByLabel("Date of the event")
      .fill(addDays(londonDate(new Date()), 90));
    const block = page.locator("section", {
      hasText: "Add up to three pictures",
    });
    await block.screenshot({ path: `.shots/7.1b/pictures-${w}.png` });
    await page.screenshot({
      path: `.shots/7.1b/bespoke-${w}.png`,
      fullPage: true,
    });
  });
