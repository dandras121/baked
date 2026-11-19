import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { connect } from "../src/db/client";
import { complaints, mailSends, uploads } from "../src/db/schema";

// Slice 7.3: the Complaints procedure page with its form, Complaint sent, references, e-mail 17 (§7.5).
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

async function ready(page: Page) {
  const pill = page.getByRole("button", { name: "Repair", exact: true });
  await pill.click();
  await expect(pill).toHaveAttribute("aria-pressed", "true");
  await pill.click();
  await expect(pill).toHaveAttribute("aria-pressed", "false");
}

async function fill(page: Page, email: string) {
  await page.getByLabel("Order number").fill("BBL-2026-0284");
  await page.getByLabel("Your name").fill("Alan Doyle");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("What’s wrong")
    .fill(
      "The bottom tier arrived cracked across the icing and one of the sugar flowers had snapped off in transit.",
    );
}

test("the page: the procedure, then Send it here with every field; checks under the fields", async ({
  page,
}) => {
  await page.goto("/complaints");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Complaints procedure",
  );
  for (const h of [
    "1 · How to raise it",
    "5 · Keeping records",
    "6 · Send it here",
  ])
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "6 · Send it here" }),
  ).toHaveAttribute("href", "#send-it-here");
  await expect(page.getByText("0 / 400")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add a picture" })).toHaveCount(
    3,
  );
  for (const p of [
    "Repair",
    "Replacement cake",
    "Partial refund",
    "Full refund",
  ])
    await expect(
      page.getByRole("button", { name: p, exact: true }),
    ).toBeVisible();
  await ready(page);
  await page.getByRole("button", { name: "Send my complaint" }).click();
  await expect(page.getByText("Please tell me your name.")).toBeVisible();
  await expect(page.getByText("Please tell me what went wrong.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
  expect(await axe(page)).toEqual([]);
});

test("send with a picture and a wish: Complaint sent, its own reference each time, Linda's e-mail and e-mail 17", async ({
  page,
}) => {
  const email = `complaint-${Date.now()}@example.com`;
  const refs: string[] = [];
  for (let i = 0; i < 2; i++) {
    await page.goto("/complaints");
    await ready(page);
    await fill(page, email);
    if (i === 0) {
      const buffer = await sharp({
        create: { width: 900, height: 700, channels: 3, background: "#e8d3a0" },
      })
        .jpeg()
        .toBuffer();
      await page
        .locator('input[type="file"]')
        .setInputFiles({ name: "cracked.jpg", mimeType: "image/jpeg", buffer });
      await expect(
        page.getByRole("img", { name: "cracked.jpg" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Partial refund", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Send my complaint" }).click();
    await expect(page).toHaveURL(/\/complaints\/sent\?ref=BBL-\d{4}-C-\d{4}/);
    const ref = new URL(page.url()).searchParams.get("ref")!;
    refs.push(ref);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `I’ve got it — reference ${ref}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `${ref} · The bottom tier arrived cracked across the icing and one of…`,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/");
    if (i === 0) expect(await axe(page)).toEqual([]);
  }
  expect(refs[1]).not.toBe(refs[0]);

  const { db, close } = connect();
  try {
    const [row] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.reference, refs[0]));
    expect(row).toMatchObject({
      wanted: "Partial refund",
      orderNumber: "BBL-2026-0284",
    });
    const pics = await db
      .select()
      .from(uploads)
      .where(eq(uploads.complaintId, row.id));
    expect(pics.map((p) => p.name)).toEqual(["cracked.jpg"]);
    const mails = await db
      .select()
      .from(mailSends)
      .where(eq(mailSends.to, email));
    expect(mails.map((m) => m.template).sort()).toEqual([
      "complaint-received",
      "complaint-received",
    ]);
    const alerts = await db
      .select()
      .from(mailSends)
      .where(eq(mailSends.key, `alert:complaint:${refs[0]}`));
    expect(alerts[0]).toMatchObject({ replyTo: email });
  } finally {
    await close();
  }

  // Opened directly, the sent page goes back to the form.
  await page.goto(`/complaints/sent?ref=${refs[0]}&t=forged`);
  await expect(page).toHaveURL(/\/complaints$/);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/complaints");
    await ready(page);
    await page.screenshot({
      path: `.shots/7.3/complaints-${w}.png`,
      fullPage: true,
    });
    await fill(page, `shot-${w}-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Send my complaint" }).click();
    await expect(page).toHaveURL(/\/complaints\/sent/);
    await page.screenshot({ path: `.shots/7.3/sent-${w}.png`, fullPage: true });
  });
