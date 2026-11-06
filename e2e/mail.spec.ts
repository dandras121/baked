import { expect, test } from "@playwright/test";

// Slice 5.1: the e-mail frame on /dev/emails, and the outbox at /dev/mail (nothing leaves the site, Bohoka 1A).
test("/dev/emails shows the sample at 600 px and phone width with its plain text; Send to the outbox lands in /dev/mail", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a developer page");
  await page.goto("/dev/emails");
  const frames = page.locator("iframe");
  await expect(frames).toHaveCount(2);
  const mail = page.frameLocator("iframe").first();
  await expect(mail.getByText("Your cake is next")).toBeVisible();
  await expect(mail.getByRole("img", { name: "Baked by Linda" })).toBeVisible();
  await expect(
    mail.getByRole("link", { name: "Change something" }),
  ).toBeVisible();
  await page.getByText("Plain text").click();
  await expect(page.getByText("Date: Saturday 12 September")).toBeVisible();
  await page.getByRole("button", { name: "Send to the outbox" }).click();
  await expect(page).toHaveURL(/\/dev\/mail/);
  await expect(page.locator("main ol li").first()).toContainText(
    "Your cake is being made this week",
  );
  await expect(page.locator("main ol li").first()).toContainText("sent");
  await expect(page.getByText(/via outbox/)).toBeVisible();
});
