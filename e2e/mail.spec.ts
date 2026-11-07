import { expect, test } from "@playwright/test";

// Slices 5.1–5.2a: the e-mails on /dev/emails, and the outbox at /dev/mail (nothing leaves the site, Bohoka 1A).
test("/dev/emails: e-mail 1 at 600 px and phone width with its plain text; Send to the outbox lands in /dev/mail with its PDFs", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a developer page");
  await page.goto("/dev/emails");
  await expect(page.locator("iframe")).toHaveCount(4);
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
