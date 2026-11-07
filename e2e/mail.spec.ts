import { expect, test } from "@playwright/test";
import { connect } from "../src/db/client";
import { eq } from "drizzle-orm";
import { jobRuns, orderLines, orders } from "../src/db/schema";

// Slices 5.1–5.2b: the e-mails on /dev/emails, and the outbox at /dev/mail (nothing leaves the site, Bohoka 1A).
test("/dev/emails: e-mail 1 at 600 px and phone width with its plain text; Send to the outbox lands in /dev/mail with its PDFs", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a developer page");
  await page.goto("/dev/emails");
  await expect(page.locator("iframe")).toHaveCount(12);
  const mail = page.frameLocator("iframe").first();
  await expect(
    mail
      .getByRole("heading", { name: "Your cake is booked" })
      .or(mail.getByText("Your cake is booked")),
  ).toBeVisible();
  await expect(mail.getByRole("img", { name: "Baked by Linda" })).toBeVisible();
  await expect(
    mail.getByRole("link", { name: "See your order" }),
  ).toBeVisible();
  await expect(mail.getByText("Key terms")).toBeVisible();
  await page.getByText("Plain text").first().click();
  await expect(page.getByText("Size: Serves 24 · two tiers")).toBeVisible();
  await page
    .getByRole("button", { name: "Send to the outbox" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dev\/mail/);
  await expect(page.locator("main ol li").first()).toContainText(
    "Your cake is booked — Saturday 12 September",
  );
  await expect(page.locator("main ol li").first()).toContainText("sent");
  await expect(page.getByText(/via outbox/)).toBeVisible();
  const pdf = page.getByRole("link", { name: /^terms-.+\.pdf$/ });
  const res = await page.request.get((await pdf.getAttribute("href"))!);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("/dev/emails: Play a morning sends e-mails 3 and 4 for that day's order to the outbox", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a developer page");
  process.loadEnvFile?.(".env.local");
  const day = "2031-03-14";
  const { db, close } = connect();
  try {
    // A day of its own, cleared first: the test's order is the only one on it.
    await db.delete(orders).where(eq(orders.date, day));
    await db.delete(jobRuns).where(eq(jobRuns.day, day));
    const [o] = await db
      .insert(orders)
      .values({
        number: `BBL-2031-${String(Date.now()).slice(-5)}`,
        token: `e2e-morning-${Date.now()}`,
        date: day,
        earliestDate: day,
        handover: "delivery",
        deliveryWindow: "afternoon",
        address: "48 Preston Road",
        town: "Linlithgow",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email: "mairi@example.com",
        phone: "07700 900 000",
        phoneE164: "+447700900000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        facts: {},
        confirmedAt: new Date("2031-03-01T10:00:00Z"),
      })
      .returning({ id: orders.id });
    await db.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "Two tiers · serves 24",
      pricePence: 18500,
      allergenText: "Contains gluten (wheat), eggs and milk.",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
  await page.goto("/dev/emails");
  await page.getByLabel("Day").fill(day);
  await page.getByRole("button", { name: "Play this morning" }).click();
  await expect(page).toHaveURL(/\/dev\/mail/);
  const list = page.locator("main ol");
  await expect(
    list.getByText("Today — your cake arrives between 12 and 4pm").first(),
  ).toBeVisible();
  await expect(list.getByText("Today: 1 cake out").first()).toBeVisible();
});
