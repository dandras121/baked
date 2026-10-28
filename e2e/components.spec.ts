import { expect, test } from "@playwright/test";

// Slice 0.5a: base components on /dev/components (axe and screenshots run in smoke.spec.ts).
test.beforeEach(async ({ page }) => {
  await page.goto("/dev/components");
});

test("A§7E every button, standalone link, pill and choice row is pressable; every field box is writable", async ({
  page,
}) => {
  const main = page.locator("main");
  for (const el of await main.locator("button, a").all()) {
    const inSentence = await el.evaluate(
      (n) => n.closest("p") !== null && n.tagName === "A",
    );
    if (inSentence) await expect(el).not.toHaveAttribute("data-pressable");
    else await expect(el).toHaveAttribute("data-pressable");
  }
  await expect(main.locator("label[data-pressable]")).toHaveCount(4);
  for (const field of await main
    .locator("input:not([type=checkbox]):not([type=radio]), textarea, select")
    .all()) {
    await expect(
      field.locator("xpath=ancestor::*[@data-writable][1]"),
    ).toHaveCount(1);
  }
});

test("§10.13 small controls still have a 44 × 44 hit area", async ({
  page,
}) => {
  const small = page.getByRole("button", { name: "Cookie preferences" });
  const box = (await small.boundingBox())!;
  expect(box.height).toBeLessThan(44);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (const y of [cy - 21, cy + 21]) {
    const hit = await page.evaluate(
      ([x, yy]) =>
        document.elementFromPoint(x, yy)?.closest("button")?.textContent,
      [cx, y],
    );
    expect(hit).toBe("Cookie preferences");
  }
});

test("filter pills: exactly one selected; keyboard Space selects", async ({
  page,
}) => {
  const group = page.getByRole("group", { name: "Filter the cakes" });
  await expect(group.locator('[aria-pressed="true"]')).toHaveText(
    "All designs",
  );
  await group.getByRole("button", { name: "Birthdays" }).click();
  await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(group.locator('[aria-pressed="true"]')).toHaveText("Birthdays");
  await group.getByRole("button", { name: "Weddings" }).focus();
  await page.keyboard.press("Space");
  await expect(group.locator('[aria-pressed="true"]')).toHaveText("Weddings");
});

test("§0.5 rule 5 / ANIM-19: the error sits under the field in words and goes when fixed", async ({
  page,
}) => {
  const email = page.getByTestId("email");
  await email.fill("mairi@example");
  await email.blur();
  const message = page.getByText(
    "That does not look like a full email address.",
  );
  await expect(message).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-describedby", /error/);
  const fieldBox = (await email.boundingBox())!;
  const messageBox = (await message.boundingBox())!;
  expect(messageBox.y).toBeGreaterThan(fieldBox.y + fieldBox.height);
  await email.fill("mairi@example.co.uk");
  await expect(message).toBeHidden();
  await expect(email).not.toHaveAttribute("aria-invalid");
});

test("§5.1 inscription counter: n / 24, over the limit says so", async ({
  page,
}) => {
  const field = page.getByTestId("inscription");
  await field.fill("Happy 30th, Mairi");
  await expect(page.getByText("17 / 24")).toBeVisible();
  await field.fill("Happy 30th birthday Mairi!");
  await expect(page.getByText("26 / 24")).toBeVisible();
  await expect(
    page.getByText("26 of 24 characters — a little too long to pipe neatly."),
  ).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");
});

test("check box: the label ticks it; the error shows beside it and goes when ticked", async ({
  page,
}) => {
  const terms = page.getByTestId("terms");
  await page.getByTestId("check-terms").click();
  const message = page.getByText(
    "Tick this to confirm you have read the terms. I cannot take the order without it.",
  );
  await expect(message).toBeVisible();
  await page.getByText("I accept the terms and conditions").click();
  await expect(terms).toBeChecked();
  await expect(message).toBeHidden();
});

test("radio buttons: one choice in the group", async ({ page }) => {
  await page.getByText("Delivered to you").click();
  await page.getByText("Collect from me").click();
  await expect(
    page.getByRole("radio", { name: "Collect from me" }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Delivered to you" }),
  ).not.toBeChecked();
});

test("UI-03 busy: the label swaps in the button and stays at least 600 ms", async ({
  page,
}) => {
  const quick = page.getByTestId("quick");
  await quick.click();
  await expect(quick).toHaveAttribute("aria-busy", "true");
  await expect(quick).toHaveText("Saving");
  await page.waitForTimeout(350);
  await expect(quick).toHaveAttribute("aria-busy", "true");
  await expect(quick).not.toHaveAttribute("aria-busy", { timeout: 1000 });
  await expect(quick).toHaveText("Quick action (100 ms)");

  const pay = page.getByTestId("pay");
  await pay.click();
  await expect(pay).toHaveText("Taking payment");
  await pay.click({ force: true }); // a second press while busy does nothing
  await expect(pay).toHaveText("Pay £185", { timeout: 3000 });
});
