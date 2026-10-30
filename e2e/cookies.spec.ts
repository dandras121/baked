import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 1.5: the cookie bar, the settings panel and the stored choice (SITE-FLOWS §3.3, §10.11, ANIM-15).

// A first visit: no stored choice (the config gives every other test one).
test.use({ storageState: { cookies: [], origins: [] } });

const bar = (page: Page) => page.getByTestId("cookie-bar");
const panel = (page: Page) =>
  page.getByRole("dialog", { name: "Cookie settings" });
const isTouch = (name: string) => name !== "desktop";

/** Press like the visitor's device does (tap on the touch projects). */
async function press(page: Page, name: string, touch: boolean) {
  const b = page.getByRole("button", { name, exact: true }).last();
  await (touch ? b.tap() : b.click());
}

/** Overlays arrive with a motion (ANIM-12 / ANIM-13); taps wait until it has finished. */
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );

async function consentCookie(page: Page) {
  const c = (await page.context().cookies()).find(
    (k) => k.name === "bbl_consent",
  );
  return c ? { ...c, value: JSON.parse(decodeURIComponent(c.value)) } : null;
}

test("§3.3 first visit: the bar comes in after about 0.7 s, does not take the focus, and nothing is set before a choice", async ({
  page,
}) => {
  const start = Date.now();
  await page.goto("/cakes");
  await expect(bar(page)).toHaveCount(0);
  await expect(bar(page)).toBeVisible();
  expect(Date.now() - start).toBeGreaterThanOrEqual(650);
  await expect(bar(page)).toHaveAttribute("aria-label", "Cookies");
  expect(
    await page.evaluate(() => document.activeElement === document.body),
  ).toBe(true);
  expect(await page.context().cookies()).toEqual([]);
  // ANIM-15: 24 px up and in, 320 ms.
  const anim = await bar(page).evaluate((el) => {
    const a = el.getAnimations()[0];
    return a ? a.effect!.getComputedTiming().duration : null;
  });
  if (anim !== null) expect(anim).toBe(320);
  // Accept all and Essential only are the same button, side by side or stacked, same size (§3.3).
  const a = (await bar(page)
    .getByRole("button", { name: "Accept all" })
    .boundingBox())!;
  const e = (await bar(page)
    .getByRole("button", { name: "Essential only" })
    .boundingBox())!;
  expect(Math.round(a.width)).toBe(Math.round(e.width));
  expect(Math.round(a.height)).toBe(Math.round(e.height));
});

test("§3.3 Accept all stores analytics on for 12 months; the bar leaves and stays away", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes");
  await expect(bar(page)).toBeVisible();
  await press(page, "Accept all", isTouch(testInfo.project.name));
  await expect(bar(page)).toHaveCount(0);
  const c = (await consentCookie(page))!;
  expect(c.value).toMatchObject({ v: 1, analytics: true });
  expect(c.secure).toBe(true);
  expect(c.sameSite).toBe("Lax");
  const days = (c.expires * 1000 - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(364);
  expect(days).toBeLessThan(366);
  await expect(page.locator("html")).toHaveAttribute(
    "data-analytics",
    "allowed",
  );
  // Only the consent cookie: no analytics provider is chosen yet (§14.1).
  expect((await page.context().cookies()).map((k) => k.name)).toEqual([
    "bbl_consent",
  ]);
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(bar(page)).toHaveCount(0);
});

test("§3.3 Essential only stores analytics off", async ({ page }, testInfo) => {
  await page.goto("/faq");
  await expect(bar(page)).toBeVisible();
  await press(page, "Essential only", isTouch(testInfo.project.name));
  await expect(bar(page)).toHaveCount(0);
  expect((await consentCookie(page))!.value).toMatchObject({
    v: 1,
    analytics: false,
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-analytics");
});

test("§3.3 Settings opens the panel: Essential locked on, Analytics off; switching it on and saving stores it", async ({
  page,
}, testInfo) => {
  const touch = isTouch(testInfo.project.name);
  await page.goto("/cakes");
  await expect(bar(page)).toBeVisible();
  await press(page, "Settings", touch);
  await expect(panel(page)).toBeVisible();
  // Dialog with a mouse, bottom sheet with touch below 1120 px (ANIM-12 / ANIM-13).
  await expect(panel(page)).toHaveAttribute(
    "data-kind",
    touch ? "sheet" : "dialog",
  );
  await expect(panel(page)).toContainText("The rest are yours to decide.");
  const essential = panel(page).getByRole("switch", { name: /Essential/ });
  const analytics = panel(page).getByRole("switch", { name: "Analytics" });
  await expect(essential).toHaveAttribute("aria-checked", "true");
  await expect(essential).toHaveAttribute("aria-disabled", "true");
  await expect(analytics).toHaveAttribute("aria-checked", "false");
  await expect(panel(page)).toContainText("Off until you switch it on.");
  // Let the dialog / sheet finish arriving (ANIM-12 / ANIM-13) before pressing inside it.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
  // Pressing the locked switch changes nothing.
  await (touch
    ? essential.tap({ force: true })
    : essential.click({ force: true }));
  await expect(essential).toHaveAttribute("aria-checked", "true");
  await (touch ? analytics.tap() : analytics.click());
  await expect(analytics).toHaveAttribute("aria-checked", "true");
  await expect(panel(page)).toContainText("Currently on.");
  await press(page, "Save my choices", touch);
  await expect(panel(page)).toBeHidden();
  await expect(bar(page)).toHaveCount(0);
  expect((await consentCookie(page))!.value).toMatchObject({ analytics: true });
});

test("§3.3 closing the panel without a choice stores nothing; on a first visit the bar shows again", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes");
  await expect(bar(page)).toBeVisible();
  await press(page, "Settings", isTouch(testInfo.project.name));
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(bar(page)).toBeVisible();
  expect(await consentCookie(page)).toBeNull();
});

test("§3.2 / §3.3 the footer's Cookie preferences reopens the panel with the stored choice; withdrawing works without a reload", async ({
  page,
}, testInfo) => {
  const touch = isTouch(testInfo.project.name);
  await page.goto("/terms");
  await expect(bar(page)).toBeVisible();
  await press(page, "Accept all", touch);
  await expect(bar(page)).toHaveCount(0);
  // A cookie an analytics provider would set.
  await page.evaluate(() => (document.cookie = "_ga=GA1.1.123; Path=/"));
  const prefs = page
    .locator("footer")
    .getByRole("button", { name: "Cookie preferences" });
  await prefs.scrollIntoViewIfNeeded();
  await (touch ? prefs.tap() : prefs.click());
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toContainText(
    "Here's what you're currently sharing",
  );
  await expect(panel(page)).toContainText("Opened from the footer");
  await settled(page);
  const analytics = panel(page).getByRole("switch", { name: "Analytics" });
  await expect(analytics).toHaveAttribute("aria-checked", "true");
  await (touch ? analytics.tap() : analytics.click());
  await press(page, "Save my choices", touch);
  await expect(panel(page)).toBeHidden();
  expect((await consentCookie(page))!.value).toMatchObject({
    analytics: false,
  });
  const names = (await page.context().cookies()).map((k) => k.name);
  expect(names).not.toContain("_ga");
  await expect(page.locator("html")).not.toHaveAttribute("data-analytics");
  // Focus goes back to the control that opened the panel.
  await expect(prefs).toBeFocused();
});

test("§3.3 before any choice the footer opens the same panel; closing it leaves the bar in place", async ({
  page,
}, testInfo) => {
  const touch = isTouch(testInfo.project.name);
  await page.goto("/terms");
  await expect(bar(page)).toBeVisible();
  const prefs = page
    .locator("footer")
    .getByRole("button", { name: "Cookie preferences" });
  await prefs.scrollIntoViewIfNeeded();
  await (touch ? prefs.tap() : prefs.click());
  await expect(panel(page)).toContainText("The rest are yours to decide.");
  await expect(
    panel(page).getByRole("switch", { name: "Analytics" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(bar(page)).toBeVisible();
});

test("§3.3 an older consent version shows the bar again", async ({
  page,
  baseURL,
}) => {
  const value = encodeURIComponent(
    JSON.stringify({ v: 0, analytics: true, ts: new Date().toISOString() }),
  );
  await page
    .context()
    .addCookies([{ name: "bbl_consent", value, url: baseURL! }]);
  await page.goto("/cakes");
  await expect(bar(page)).toBeVisible();
});

test("§3.3 page padding: while the bar shows the end of the page stays reachable above it", async ({
  page,
}, testInfo) => {
  await page.goto("/terms");
  await expect(bar(page)).toBeVisible();
  const card = (await bar(page).locator("[data-cookie-card]").boundingBox())!;
  const padding = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.body).paddingBottom),
  );
  const gap = page.viewportSize()!.width >= 768 ? 24 : 0;
  expect(padding).toBeCloseTo(card.height + gap, 0);
  await press(page, "Essential only", isTouch(testInfo.project.name));
  await expect(bar(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).paddingBottom),
  ).toBe("0px");
});

test("§3.3 the bar is not modal: the page behind stays usable", async ({
  page,
}) => {
  await page.goto("/terms");
  await expect(bar(page)).toBeVisible();
  // The dimming on the phone sheet is visual only: a point above the sheet reaches the page.
  const hit = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, 120);
    return !!el?.closest("main, header");
  });
  expect(hit).toBe(true);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
});

test("§3.3 the open phone menu covers the bar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "the menu is below 1120 px");
  await page.goto("/terms");
  await expect(bar(page)).toBeVisible();
  await page.locator("[data-menu-button]").click();
  await expect(page.locator("#site-menu")).toHaveAttribute(
    "data-state",
    "open",
    { timeout: 2000 },
  );
  const card = (await bar(page).locator("[data-cookie-card]").boundingBox())!;
  const top = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest("#site-menu") !== null,
    [card.x + card.width / 2, card.y + card.height / 2],
  );
  expect(top).toBe(true);
});

test("A§1.4 reduced motion: the bar appears and leaves at once", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await expect(bar(page)).toBeVisible();
  expect(await bar(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  await press(page, "Accept all", isTouch(testInfo.project.name));
  await expect(bar(page)).toHaveCount(0);
});

test("axe: no violations with the bar and with the panel open", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes");
  await expect(bar(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_cookie-bar.png`),
  });
  await press(page, "Settings", isTouch(testInfo.project.name));
  await expect(panel(page)).toBeVisible();
  await page.waitForTimeout(400);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_cookie-panel.png`),
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("§3.3 no bar, no cookies; Cookie preferences is a link to the Cookie policy", async ({
    page,
  }) => {
    await page.goto("/terms");
    await expect(bar(page)).toHaveCount(0);
    expect(await page.context().cookies()).toEqual([]);
    await expect(
      page
        .locator("footer")
        .getByRole("button", { name: "Cookie preferences" }),
    ).toHaveAttribute("href", "/cookies#changing-your-mind");
  });
});
