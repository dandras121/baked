import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { connect } from "../src/db/client";
import { enquiries, galleryPhotos } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 7.1a: the bespoke enquiry form (§7.1) — without pictures (7.1b).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

const axe = async (page: Page) =>
  (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
/** The form reacts once the page has started (a pill toggles); typing before that would not reach it. */
async function ready(page: Page) {
  const p = page.getByRole("button", { name: "My date is still flexible" });
  await p.click();
  await expect(p).toHaveAttribute("aria-pressed", "true");
  await p.click();
  await expect(p).toHaveAttribute("aria-pressed", "false");
}
const pill = (page: Page, group: RegExp | string, name: string) =>
  page
    .getByRole("group", { name: group })
    .getByRole("button", { name, exact: true });

async function fillAll(page: Page) {
  await ready(page);
  await pill(page, /The occasion/, "Birthday").click();
  await page
    .getByLabel("Date of the event")
    .fill(addDays(londonDate(new Date()), 60));
  await pill(page, /How many servings/, "20 – 40").click();
  await pill(page, /Where it needs to go/, "Edinburgh").click();
  await pill(page, /Budget/, "£250 – 400").click();
  await pill(page, "Finish", "Buttercream").click();
  await pill(page, "Flavour", "Vanilla").click();
  await page.getByLabel("Full name").fill("Mairi Sinclair");
  await page
    .locator("#bespoke-email")
    .fill(`bespoke-${Date.now()}@example.com`);
}

test("the page: intro from Settings, How this works, axe", async ({ page }) => {
  await page.goto("/bespoke");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Dreams\s*come true\./,
  );
  await expect(
    page.getByText("Bespoke cakes start at £160.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("three to four weeks")).toBeVisible();
  await expect(
    page.getByText("Free delivery covers Edinburgh & the Lothians.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("pills: tapping the selected one clears it; None and the other dietary pills; the consent box", async ({
  page,
}) => {
  await page.goto("/bespoke");
  const wedding = pill(page, /The occasion/, "Wedding");
  await wedding.click();
  await expect(wedding).toHaveAttribute("aria-pressed", "true");
  await wedding.click();
  await expect(wedding).toHaveAttribute("aria-pressed", "false");
  await pill(page, /Dietary needs/, "No nuts").click();
  await expect(
    page.getByText("I agree to Linda using this to make my cake safely."),
  ).toBeVisible();
  await pill(page, /Dietary needs/, "None").click();
  await expect(pill(page, /Dietary needs/, "No nuts")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(
    page.getByText("I agree to Linda using this to make my cake safely."),
  ).toHaveCount(0);
});

test("dates: the calm warnings, never a block", async ({ page }) => {
  await page.goto("/bespoke");
  await ready(page);
  const today = londonDate(new Date());
  await page.getByLabel("Date of the event").fill(addDays(today, 9));
  await expect(
    page.getByText(/^That is nine days away — very soon for a bespoke cake\./),
  ).toBeVisible();
  await pill(page, /The occasion/, "Wedding").click();
  await expect(page.getByText(/very soon for a wedding cake/)).toBeVisible();
  await page.getByLabel("Date of the event").fill(addDays(today, 100));
  await expect(
    page.getByText(
      /months? away — weddings are usually booked about six months ahead\./,
    ),
  ).toBeVisible();
  await expect(page.getByText("You can still send it")).toBeVisible();
});

test("missing answers: the summary, Take me to the first one, send it anyway with a phone", async ({
  page,
}) => {
  await page.goto("/bespoke");
  await page.getByLabel("Full name").fill("Mairi Sinclair");
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(
    page.getByText("Add an email address or a phone number so I can reply."),
  ).toBeVisible();
  await page.locator("#bespoke-phone").fill("07700 900 000");
  await pill(page, /The occasion/, "Birthday").click();
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(page.getByText("Seven things still need you")).toBeVisible();
  await expect(page.getByText("· How many servings.")).toBeVisible();
  await expect(page.getByText("· Your email address.")).toBeVisible();
  await page.getByRole("button", { name: "Take me to the first one" }).click();
  await page
    .getByRole("button", { name: "or send it anyway and I will call you →" })
    .click();
  await expect(page).toHaveURL(/\/bespoke\/sent\?ref=BBL-\d{4}-E-\d{4}/);
  await expect(
    page.getByText(/^Your reference is BBL-\d{4}-E-\d{4}\.$/),
  ).toBeVisible();
});

test("a full enquiry is sent and stored; the dietary consent is needed", async ({
  page,
}) => {
  await page.goto("/bespoke");
  await fillAll(page);
  await pill(page, /Dietary needs/, "Vegan").click();
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(
    page.getByText("Please tick this so I can use your dietary answers."),
  ).toBeVisible();
  await page
    .getByText("I agree to Linda using this to make my cake safely.")
    .click();
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(page).toHaveURL(/\/bespoke\/sent\?ref=/);
  const ref = new URL(page.url()).searchParams.get("ref")!;
  const { db, close } = connect();
  try {
    const [row] = await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.reference, ref));
    expect(row).toMatchObject({ status: "new", withGaps: false });
    expect(row.answers).toMatchObject({
      dietary: ["Vegan"],
      dietaryConsent: true,
      flavour: "Vanilla",
    });
  } finally {
    await close();
  }
  // Opened directly, the sent page goes back to the form.
  await page.goto("/bespoke/sent?ref=BBL-2026-E-0001&t=forged");
  await expect(page).toHaveURL(/\/bespoke$/);
});

test("Inspired by: from the gallery, removable", async ({ page }) => {
  process.loadEnvFile?.(".env.local");
  const { db, close } = connect();
  let id = 0;
  try {
    const [p] = await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.showing, true))
      .limit(1);
    id = p?.id ?? 0;
  } finally {
    await close();
  }
  test.skip(!id, "no showing gallery photo");
  await page.goto(`/bespoke?inspired=${id}`);
  await expect(page.getByText("Inspired by", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "You came from my gallery — I will see this picture with your enquiry.",
    ),
  ).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.getByRole("button", { name: "Remove ×" }).click();
  await expect(page.getByText("Inspired by", { exact: true })).toHaveCount(0);
  await page.goto("/bespoke?inspired=999999");
  await expect(page.getByText("Inspired by", { exact: true })).toHaveCount(0);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/bespoke");
    await page.screenshot({
      path: `.shots/7.1a/bespoke-${w}.png`,
      fullPage: true,
    });
    await page.getByLabel("Full name").fill("Mairi Sinclair");
    await page.locator("#bespoke-phone").fill("07700 900 000");
    await pill(page, /Dietary needs/, "No nuts").click();
    await page
      .getByLabel("Date of the event")
      .fill(addDays(londonDate(new Date()), 9));
    await page.getByRole("button", { name: "Send my enquiry" }).click();
    await page.getByText("I agree to Linda using this").first().waitFor();
    await page.screenshot({
      path: `.shots/7.1a/bespoke-states-${w}.png`,
      fullPage: true,
    });
  });
