import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 1.2: phone and tablet header, the menu overlay (ANIM-01 open, ANIM-02 close, ANIM-03 select).

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "the menu is below 1120 px");
});

const button = (page: Page) => page.locator("[data-menu-button]");
const overlay = (page: Page) => page.locator("#site-menu");
const menu = (page: Page) => page.getByRole("navigation", { name: "Menu" });
const item = (page: Page, name: string) =>
  menu(page).getByRole("link", { name, exact: true });
const pink = (page: Page) => page.locator("#site-menu > div").nth(0);
const white = (page: Page) => page.locator("#site-menu > div").nth(1);

async function openMenu(page: Page) {
  await button(page).click();
  await expect(item(page, "Home")).toBeFocused({ timeout: 2000 });
  await expect(overlay(page)).toHaveAttribute("data-state", "open");
}

/** Freeze every running animation at one time and read a value. */
async function at<T>(page: Page, t: number, read: () => T): Promise<T> {
  await page.evaluate((ms) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = ms;
    }
  }, t);
  return page.evaluate(read);
}

test("§3.1 the phone / tablet header: “menu” button 17 px from the right edge, 34 × 13, closed", async ({
  page,
}) => {
  await page.goto("/gallery");
  const vw = page.viewportSize()!.width;
  const b = (await button(page).boundingBox())!;
  expect(b.x + b.width).toBeCloseTo(vw - 17, 0);
  // The tablet bar is 77 px since Bohoka 2026-10-31: the button moves down by half the 22 px.
  expect(b.y).toBeCloseTo(vw >= 768 ? 33.22 : 22.22, 0);
  expect([Math.round(b.width), Math.round(b.height)]).toEqual([34, 13]);
  await expect(button(page)).toHaveAttribute("aria-expanded", "false");
  await expect(button(page)).toHaveAttribute("aria-label", "Open menu");
  await expect(button(page)).toHaveAttribute("aria-controls", "site-menu");
  await expect(button(page)).toHaveText("menu");
  await expect(overlay(page)).toBeHidden();
  // 44 × 44 hit area around the small button (§10.13).
  const hit = await page.evaluate(
    ([x, y]) =>
      !!document.elementFromPoint(x, y)?.closest("[data-menu-button]"),
    [b.x + b.width / 2, b.y + b.height / 2 + 20],
  );
  expect(hit).toBe(true);
});

test("ANIM-01: the circles grow from the button corner along the A§12 rows (step 8 = 385 ms)", async ({
  page,
}) => {
  await page.goto("/gallery");
  const vw = page.viewportSize()!.width;
  const vh = page.viewportSize()!.height;
  await button(page).click();
  const values = await at(page, 385, () => {
    const layers = document.querySelectorAll("#site-menu > div");
    return [0, 1].map((i) => getComputedStyle(layers[i]).clipPath);
  });
  const ox = vw - 17;
  const oy = vw >= 768 ? 33.22 : 22.22;
  const rWhite = Math.ceil(Math.hypot(ox, vh - oy));
  const radius = (s: string) => parseFloat(/circle\(([\d.]+)px/.exec(s)![1]);
  expect(radius(values[0])).toBeCloseTo(0.7746 * (rWhite + 24), 0);
  expect(radius(values[1])).toBeCloseTo(0.4755 * rWhite, 0);
  const centre = /at ([\d.]+)px ([\d.]+)px/.exec(values[0])!;
  expect(Number(centre[1])).toBeCloseTo(ox, 0);
  expect(Number(centre[2])).toBeCloseTo(oy, 1);
  // The arrow is edge-on at 330 ms and turned over at 660 ms (A§4.4).
  const arrow330 = await at(
    page,
    330,
    () =>
      getComputedStyle(document.querySelector("[data-menu-button] svg")!)
        .transform,
  );
  expect(arrow330).toMatch(/^matrix3d\(/);
  const items605 = await at(
    page,
    605,
    () => getComputedStyle(document.querySelector("#site-menu ul")!).opacity,
  );
  expect(Number(items605)).toBeCloseTo(0.65, 2); // portrait: items 0.65 at 605 ms
});

test("ANIM-01 → open: focus on Home, aria-expanded, the page behind is inert and does not scroll", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openMenu(page);
  await expect(button(page)).toHaveAttribute("aria-expanded", "true");
  await expect(button(page)).toHaveAttribute("aria-label", "Close menu");
  expect(
    await page
      .locator("[data-page-content]")
      .evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("hidden");
  // Open and still: pure white, no underline (Bohoka 2026-10-29); the current page keeps aria-current.
  await expect(item(page, "Gallery")).toHaveAttribute("aria-current", "page");
  expect(await menu(page).locator("span[aria-hidden]").count()).toBe(0);
  // The current page's item is SemiBold, the others Light (Bohoka 2026-10-30).
  await expect(item(page, "Gallery")).toHaveCSS("font-weight", "600");
  await expect(item(page, "Home")).toHaveCSS("font-weight", "300");
  await expect(item(page, "Home")).toHaveCSS(
    "transition",
    /font-weight 0\.2s cubic-bezier\(0\.33, 1, 0\.68, 1\)/,
  );
});

test("A§4.1 open layout on the reference phone: items 24 px from the left, 68 px pitch, centred below the bar", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "reference viewport 402 × 902");
  await page.goto("/");
  await openMenu(page);
  const tops: number[] = [];
  for (const name of [
    "Home",
    "Cakes",
    "Bespoke",
    "Gallery",
    "About Linda",
    "FAQ",
    "Contact",
  ]) {
    const b = (await item(page, name).boundingBox())!;
    expect(b.x).toBeCloseTo(24, 0);
    tops.push(b.y);
  }
  expect(tops[0]).toBeGreaterThanOrEqual(247);
  expect(tops[0]).toBeLessThanOrEqual(248.5);
  expect(tops.slice(1).map((t, i) => Math.round(t - tops[i]))).toEqual([
    68, 68, 68, 68, 68, 68,
  ]);
  const heading = (await page
    .getByText("Follow our social media")
    .boundingBox())!;
  expect(heading.y).toBeCloseTo(792, 0);
  await expect(item(page, "Home")).toHaveCSS("font-size", "34px");
  await expect(item(page, "Home")).toHaveCSS("color", "rgb(86, 59, 131)");
});

test("A§8.1 tablet landscape (1024 × 768): the items start 51 px below the 77 px bar (y 128)", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "tablet only");
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await openMenu(page);
  expect((await item(page, "Home").boundingBox())!.y).toBeCloseTo(128, 0);
  expect(
    (await page.getByText("Follow our social media").boundingBox())!.y,
  ).toBeCloseTo(768 - 110, 0);
});

test("tablet portrait: the items start at y 248 as on the phone (Bohoka 2026-10-29)", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "tablet only");
  await page.goto("/");
  await openMenu(page);
  expect((await item(page, "Home").boundingBox())!.y).toBeCloseTo(248, 0);
  expect(
    (await page.getByText("Follow our social media").boundingBox())!.y,
  ).toBeCloseTo(1366 - 110, 0);
});

test("ANIM-02: the button and Esc close the menu (760 ms); focus returns to the button; no history left behind", async ({
  page,
}) => {
  await page.goto("/faq");
  await page.goto("/gallery");
  const length = await page.evaluate(() => history.length);
  await openMenu(page);
  await button(page).click();
  await expect(overlay(page)).toHaveAttribute("data-state", "closing");
  const duration = await page.evaluate(
    () =>
      document
        .querySelector("#site-menu > div")!
        .getAnimations()[0]
        .effect!.getComputedTiming().duration,
  );
  expect(duration).toBe(760);
  await expect(overlay(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await expect(button(page)).toHaveAttribute("aria-expanded", "false");
  expect(
    await page
      .locator("[data-page-content]")
      .evaluate((el) => (el as HTMLElement).inert),
  ).toBe(false);

  await openMenu(page);
  await page.keyboard.press("Escape");
  await expect(overlay(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  // Back is never “eaten”: it goes straight to the previous page.
  await expect
    .poll(() => page.evaluate(() => history.length))
    .toBeGreaterThanOrEqual(length);
  await page.goBack();
  await expect(page).toHaveURL(/\/faq$/);
});

test("A§3.4 browser Back only closes the menu and stays on the page", async ({
  page,
}) => {
  await page.goto("/faq");
  await page.goto("/gallery");
  await openMenu(page);
  await page.goBack();
  await expect(overlay(page)).toBeHidden();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Gallery" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/faq$/);
});

test("A§5 input lock: a second tap during the opening is ignored", async ({
  page,
}) => {
  await page.goto("/gallery");
  await button(page).click();
  await page.waitForTimeout(100);
  await button(page).click({ force: true });
  await expect(overlay(page)).toHaveAttribute("data-state", "open", {
    timeout: 2000,
  });
});

test("ANIM-03: tapping another item opens the page under the circles and reveals it; Back returns", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openMenu(page);
  await item(page, "Cakes").click();
  await expect(overlay(page)).toHaveAttribute("data-state", "selecting");
  // The tapped item takes the selected state at once; its weight eases from 300 to 600.
  await expect(item(page, "Cakes")).toHaveAttribute("data-bold", "");
  await expect(item(page, "Gallery")).not.toHaveAttribute("data-bold");
  await expect(page).toHaveURL(/\/cakes$/);
  await expect(overlay(page)).toBeHidden({ timeout: 3000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "The full range" }),
  ).toBeVisible();
  await expect(page.locator("main#main")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await openMenu(page);
  await expect(item(page, "Cakes")).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(overlay(page)).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/gallery$/);
});

test("ANIM-03 timeline: the reveal runs 620 ms after the hand-over at 240 ms (920 ms in all)", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openMenu(page);
  const t0 = await page.evaluate(() => performance.now());
  await item(page, "FAQ").click();
  const reveal = await page.waitForFunction(() => {
    const a = document.querySelector("#site-menu > div")?.getAnimations()[0];
    return a
      ? { d: a.effect!.getComputedTiming().duration, start: performance.now() }
      : null;
  });
  const r = (await reveal.jsonValue()) as { d: number; start: number };
  expect(r.d).toBe(620);
  expect(r.start - t0).toBeGreaterThanOrEqual(240);
  await expect(overlay(page)).toBeHidden({ timeout: 3000 });
  await expect(page).toHaveURL(/\/faq$/);
});

test("A§7.2 the current page's item reloads the page (same-item variant); Back is not eaten", async ({
  page,
}) => {
  await page.goto("/faq");
  await page.goto("/gallery?filter=birthday");
  await openMenu(page);
  await item(page, "Gallery").click();
  await expect(overlay(page)).toBeHidden({ timeout: 3000 });
  await expect(page).toHaveURL(/\/gallery$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/faq$/);
});

test("A§3.4 the logo in the open menu goes Home like the Home item", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openMenu(page);
  await page
    .getByTestId("site-header")
    .getByRole("link", { name: "Baked by Linda" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(overlay(page)).toBeHidden({ timeout: 3000 });
});

test("§3.1 social links come from Settings: Instagram opens in a new tab; an empty Facebook address is hidden", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openMenu(page);
  const ig = overlay(page).getByRole("link", { name: /@bakedbylinda/ });
  await expect(ig).toHaveAttribute(
    "href",
    "https://www.instagram.com/bakedbylinda",
  );
  await expect(ig).toHaveAttribute("target", "_blank");
  await expect(ig).toHaveAttribute("rel", "noopener");
  await expect(
    overlay(page).getByRole("link", { name: /Facebook/ }),
  ).toHaveCount(0);
});

test("A§3.4 resizing to 1120 px or wider closes the menu at once", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openMenu(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(overlay(page)).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("");
});

test("A§1.4 reduced motion: the menu opens and closes at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery");
  await button(page).click();
  await expect(overlay(page)).toHaveAttribute("data-state", "open");
  expect(await pink(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect(item(page, "Home")).toBeFocused();
  await button(page).click();
  await expect(overlay(page)).toBeHidden();
  expect(await white(page).evaluate((el) => el.getAnimations().length)).toBe(0);
});

test("axe: no violations with the menu open", async ({ page }, testInfo) => {
  await page.goto("/gallery");
  await openMenu(page);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_menu-open.png`),
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("§3.1 the menu is a disclosure with the same list", async ({ page }) => {
    await page.goto("/gallery");
    await expect(button(page)).toBeHidden();
    const summary = page.locator("summary", { hasText: "menu" });
    await expect(summary).toBeVisible();
    await summary.click();
    await expect(page.getByRole("link", { name: "About Linda" })).toBeVisible();
  });
});
