import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { connect } from "../src/db/client";
import { enquiries, mailSends } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";

// Slice 7.2: Enquiry sent, Your enquiry and e-mail 6 (§7.2, §8.2 row 6).
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

async function send(page: Page, email: string) {
  await page.goto("/bespoke");
  const flexible = page.getByRole("button", {
    name: "My date is still flexible",
  });
  await flexible.click();
  await expect(flexible).toHaveAttribute("aria-pressed", "true");
  await flexible.click();
  const pill = (group: RegExp | string, name: string) =>
    page
      .getByRole("group", { name: group })
      .getByRole("button", { name, exact: true });
  await pill(/The occasion/, "Wedding").click();
  await page
    .getByLabel("Date of the event")
    .fill(addDays(londonDate(new Date()), 240));
  await pill(/How many servings/, "70 – 120").click();
  await pill(/Where it needs to go/, "West Lothian").click();
  await page
    .getByLabel("Venue name or postcode")
    .fill("Hopetoun House, EH30 9SL");
  await pill(/Budget/, "£400 – 600").click();
  await pill("Finish", "Buttercream").click();
  await pill("Flavour", "Vanilla").click();
  await pill(/Dietary needs/, "None").click();
  await page.locator("#bespoke-anything").fill("Three tiers, sugar peonies.");
  await page.getByLabel("Full name").fill("Mairi Sinclair");
  await page.locator("#bespoke-email").fill(email);
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(page).toHaveURL(/\/bespoke\/sent\?ref=/);
  return new URL(page.url()).searchParams.get("ref")!;
}

test("Enquiry sent: the reference, the three steps, the phone, the two ways on; a refresh keeps it", async ({
  page,
}) => {
  const ref = await send(page, `sent-${Date.now()}@example.com`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /We’ve got\s*your idea\./,
  );
  await expect(
    page.getByText(
      `Enquiry ${ref} · nothing has been charged and nothing is committed`,
    ),
  ).toBeVisible();
  for (const step of [
    "Within 24 hours",
    "Then it is your call",
    "Only after you agree",
  ])
    await expect(page.getByText(step, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "+44 7884 199103" }),
  ).toHaveAttribute("href", "tel:+447884199103");
  await expect(
    page
      .getByRole("link", { name: "Browse the ready-made range" })
      .filter({ visible: true }),
  ).toHaveAttribute("href", "/cakes");
  await expect(
    page.getByRole("link", { name: "Back to home" }).filter({ visible: true }),
  ).toHaveAttribute("href", "/");
  expect(await axe(page)).toEqual([]);
  await page.reload();
  await expect(
    page.getByText(`Enquiry ${ref}`, { exact: false }),
  ).toBeVisible();
});

test("e-mail 6 and Your enquiry: every answer read-only, Email Linda about it; unknown links are 404", async ({
  page,
}) => {
  const email = `mine-${Date.now()}@example.com`;
  const ref = await send(page, email);
  const { db, close } = connect();
  let token = "";
  try {
    const [row] = await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.reference, ref));
    token = row.token;
    const [six] = await db
      .select()
      .from(mailSends)
      .where(eq(mailSends.key, `enquiry:${ref}:6`));
    expect(six).toMatchObject({ to: email, template: "enquiry-received" });
    expect(JSON.stringify(six.data)).not.toMatch(/Hopetoun|peonies|Mairi/);
  } finally {
    await close();
  }
  const res = await page.goto(`/my-enquiry/${token}`);
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your enquiry.",
  );
  await expect(
    page.getByText(`Enquiry ${ref} · sent `, { exact: false }),
  ).toContainText("read-only");
  const value = (label: string) =>
    page
      .locator("dt", { hasText: new RegExp(`^${label}$`) })
      .locator("xpath=following-sibling::dd");
  await expect(value("Occasion")).toHaveText("Wedding");
  await expect(value("Where")).toHaveText(
    "West Lothian · Hopetoun House, EH30 9SL",
  );
  await expect(value("Dietary needs")).toHaveText("None");
  await expect(value("How to reach you")).toHaveText(`By email · ${email}`);
  await expect(value("In your words")).toHaveText(
    "“Three tiers, sugar peonies.”",
  );
  await expect(value("Pictures")).toHaveText("None");
  await expect(
    page
      .getByRole("link", { name: "Email Linda about it" })
      .filter({ visible: true }),
  ).toHaveAttribute(
    "href",
    `mailto:info@bakedbylinda.co.uk?subject=Enquiry%20${ref}`,
  );
  expect(await page.locator("input, textarea, select").count()).toBe(0);
  expect(await axe(page)).toEqual([]);

  const missing = await page.goto(`/my-enquiry/${"x".repeat(32)}`);
  expect(missing?.status()).toBe(404);
});

for (const [w, h] of [
  [402, 902],
  [1024, 1366],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    const ref = await send(page, `shot-${w}-${Date.now()}@example.com`);
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: `.shots/7.2/sent-${w}.png`, fullPage: true });
    const { db, close } = connect();
    try {
      const [row] = await db
        .select()
        .from(enquiries)
        .where(eq(enquiries.reference, ref));
      await page.goto(`/my-enquiry/${row.token}`);
    } finally {
      await close();
    }
    await page.screenshot({
      path: `.shots/7.2/your-enquiry-${w}.png`,
      fullPage: true,
    });
  });
