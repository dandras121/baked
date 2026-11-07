import AxeBuilder from "@axe-core/playwright";
import { eq } from "drizzle-orm";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { drafts } from "../src/db/schema";

// Slice 4.3: step 3 — your details (§5.3, §10.8, D16). Each test is its own connection (two holds each, §10.3).
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

const field = (page: Page, name: string | RegExp) =>
  page.getByRole("textbox", { name, exact: typeof name === "string" });
const cont = (page: Page) =>
  page.getByRole("button", { name: "Continue to payment" });
const terms = (page: Page) =>
  page.getByRole("checkbox", { name: /I have read and agree to the terms/ });

/** One cake, a held day (collection), step 3. */
async function stepThree(page: Page) {
  await page.goto("/cakes/the-lothian");
  await page.getByRole("textbox", { name: /Inscription/ }).fill("Happy 30th");
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to your order" }),
  ).toBeVisible();
  await page.goto("/order/when");
  const steps = 2 + Math.floor(Math.random() * 9);
  for (let i = 0; i < steps; i++)
    await page.getByRole("button", { name: "Next month" }).click();
  await page
    .locator("[data-shown] label[data-state=available]")
    .nth(Math.floor(Math.random() * 4))
    .click();
  await page.getByText("Collect from me").click();
  await page
    .getByRole("button", { name: /^(Continue to your details|Your details)$/ })
    .click();
  const chip = page
    .getByRole("group", { name: "Free dates" })
    .getByRole("button")
    .first();
  await expect(page.getByText(/is held for/).or(chip)).toBeVisible();
  if (await chip.isVisible()) await chip.click();
  await expect(page).toHaveURL(/order\/details$/);
}

async function fillRight(page: Page) {
  await field(page, "Your name").fill("Mairi Sinclair");
  await field(page, "Email").fill("mairi@example.co.uk");
  await field(page, "Phone").fill("+36 30 123 4567");
}

async function draftRow(page: Page) {
  const id = (await page.context().cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  process.loadEnvFile?.(".env.local");
  const { db, close } = connect();
  try {
    const [d] = await db.select().from(drafts).where(eq(drafts.id, id));
    return d;
  } finally {
    await close();
  }
}

test("wrong first: a message under each field and beside the terms box, focus on the first; nothing goes on", async ({
  page,
}) => {
  await stepThree(page);
  await field(page, "Email").fill("mairi@");
  await field(page, "Phone").fill("0770");
  await cont(page).click();
  await expect(page.getByText("Please tell me your name.")).toBeVisible();
  await expect(
    page.getByText("That does not look like a full email address."),
  ).toBeVisible();
  await expect(
    page.getByText(/Please give a mobile number, like 07700 900 000/),
  ).toBeVisible();
  await expect(
    page.getByText(/Please tick this to agree to the terms/),
  ).toBeVisible();
  await expect(field(page, "Your name")).toBeFocused();
  await expect(page).toHaveURL(/order\/details$/);
  // Corrected, a field's message goes.
  await field(page, "Your name").fill("Mairi Sinclair");
  await expect(page.getByText("Please tell me your name.")).toHaveCount(0);
});

test("right then: a foreign mobile is fine, the e-mail box is not ticked for you, Continue opens step 4", async ({
  page,
}) => {
  await stepThree(page);
  await fillRight(page);
  const marketing = page.getByRole("checkbox", {
    name: /Send me an email once a year/,
  });
  await expect(marketing).not.toBeChecked();
  await expect(terms(page)).not.toBeChecked();
  await terms(page).check({ force: true });
  await cont(page).click();
  await expect(page).toHaveURL(/order\/pay$/);
  const d = await draftRow(page);
  expect(d.phoneE164).toBe("+36301234567");
  expect(d.termsAcceptedAt).not.toBeNull();
  expect(d.termsRevisionId).not.toBeNull();
  expect(d.cancellationsRevisionId).not.toBeNull();
  expect(d.marketingOptIn).toBe(false);
  expect(d.allergyConsentAt).toBeNull();
});

test("D16: the consent box shows with an allergy note, goes when the note is emptied, and is required; stored with time and wording", async ({
  page,
}) => {
  await stepThree(page);
  const consent = page.getByRole("checkbox", {
    name: "I agree to Linda using this to make my cake safely.",
  });
  await expect(consent).toHaveCount(0);
  const note = field(page, /Allergies or anything I should know/);
  await note.fill("One guest cannot have nuts.");
  await expect(consent).toBeVisible();
  await expect(consent).not.toBeChecked();
  await note.fill("");
  await expect(consent).toHaveCount(0);
  await note.fill("One guest cannot have nuts.");
  await fillRight(page);
  await terms(page).check({ force: true });
  await cont(page).click();
  await expect(
    page.getByText("Please tick this so I can use your allergy note."),
  ).toBeVisible();
  await expect(page).toHaveURL(/order\/details$/);
  await page
    .getByText("I agree to Linda using this to make my cake safely.", {
      exact: true,
    })
    .click();
  await expect(consent).toBeChecked();
  // Click the visible words, as a person does: the hidden 1 px input sits under the row above while that row
  // is lit up by the mouse (its 44 px hit area, ANIM-07).
  const mk = page.getByRole("checkbox", {
    name: /Send me an email once a year/,
  });
  await page.getByText(/^Send me an email once a year/).click();
  await expect(mk).toBeChecked();
  await cont(page).click();
  await expect(page).toHaveURL(/order\/pay$/);
  const d = await draftRow(page);
  expect(d.allergyNote).toBe("One guest cannot have nuts.");
  expect(d.allergyConsentAt).not.toBeNull();
  expect(d.allergyConsentWording).toBe(
    "I agree to Linda using this to make my cake safely.",
  );
  expect(d.marketingOptIn).toBe(true);
  expect(d.marketingWording).toMatch(/^Send me an email once a year/);
});

test("each cake's allergens above the note; typed answers survive a refresh; step 4 without details goes back to step 3", async ({
  page,
}) => {
  await stepThree(page);
  await expect(
    page.getByText(/^The Lothian contains gluten \(wheat\), eggs and milk/),
  ).toBeVisible();
  await page.goto("/order/pay");
  await expect(page).toHaveURL(/order\/details$/);
  await field(page, "Your name").fill("Mairi Sinclair");
  await field(page, "Email").fill("mairi@example.co.uk");
  await field(page, "Email").blur();
  await expect
    .poll(async () => (await draftRow(page)).email)
    .toBe("mairi@example.co.uk");
  await page.reload();
  await expect(field(page, "Your name")).toHaveValue("Mairi Sinclair");
  await expect(field(page, "Email")).toHaveValue("mairi@example.co.uk");
});

test("axe: step 3 with its messages and the consent box; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stepThree(page);
  await field(page, /Allergies or anything I should know/).fill("No nuts.");
  await cont(page).click();
  await expect(page.getByText("Please tell me your name.")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_details.png`),
    fullPage: true,
  });
});
