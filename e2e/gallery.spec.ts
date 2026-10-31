import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 2.8a: the gallery page — grid, paging, ANIM-17, ANIM-23 (§4.8). The seed has 30 sample photos.
const tiles = (page: Page) =>
  page.locator("main ul[aria-label] > li:not([data-later])");
const more = (page: Page) =>
  page.getByRole("link", { name: /^Show the next \d+$/ });

test("title, intro, bespoke link and the first 12 tiles with one-line captions", async ({
  page,
}) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Cakes,\s*I have made\./,
  );
  await expect(page).toHaveTitle(/^Gallery — Baked by Linda$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A few of the cakes I have made for birthdays, weddings and everything in between.",
  );
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "Start a bespoke enquiry" })
      .first(),
  ).toHaveAttribute("href", "/bespoke");
  await expect(tiles(page)).toHaveCount(12);
  await expect(tiles(page).first()).toContainText("Digger birthday · 2025");
  // Square tiles on the lilac base; a caption is one line.
  const frame = tiles(page).first().locator("div").first();
  const box = (await frame.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  await expect(frame).toHaveCSS("background-color", "rgb(201, 167, 232)");
  await expect(tiles(page).first().locator("p")).toHaveCSS(
    "text-overflow",
    "ellipsis",
  );
  await expect(page.getByText("Showing 12 of 30")).toBeVisible();
});

test("columns: 2 on the phone, 4 on tablet and desktop", async ({ page }) => {
  await page.goto("/gallery");
  const ys = await tiles(page).evaluateAll((els) =>
    els.slice(0, 4).map((el) => Math.round(el.getBoundingClientRect().top)),
  );
  const perRow = ys.filter((y) => y === ys[0]).length;
  expect(perRow).toBe(page.viewportSize()!.width < 768 ? 2 : 4);
});

test("Show the next: 12 more rise in, focus on the first new tile, ?shown= kept, no scroll; at the end it goes", async ({
  page,
}) => {
  await page.goto("/gallery");
  await more(page).scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await more(page).click();
  await expect(tiles(page)).toHaveCount(24);
  await expect(page).toHaveURL(/\/gallery\?shown=24$/);
  await expect(tiles(page).nth(12)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.getByText("Showing 24 of 30")).toBeVisible();
  await expect(more(page)).toHaveText("Show the next 6");
  await more(page).click();
  await expect(tiles(page)).toHaveCount(30);
  await expect(more(page)).toHaveCount(0);
  await expect(page.getByText("Showing 30 of 30")).toBeVisible();
});

test("ANIM-17: the new tiles rise 12 px and fade in, 240 ms, 40 ms apart, at most 6 staggered", async ({
  page,
}) => {
  await page.goto("/gallery");
  await more(page).click();
  const timing = await tiles(page).evaluateAll((els) =>
    els.slice(12).map((el) => {
      const a = el.getAnimations()[0];
      const t = a?.effect?.getComputedTiming();
      return [t?.duration, t?.delay];
    }),
  );
  expect(timing.slice(0, 7)).toEqual([
    [240, 0],
    [240, 40],
    [240, 80],
    [240, 120],
    [240, 160],
    [240, 200],
    [240, 200],
  ]);
});

test("ANIM-17 reduced motion: the new tiles are simply there", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery");
  await more(page).click();
  await expect(tiles(page)).toHaveCount(24);
  const t = await tiles(page)
    .nth(20)
    .evaluate((el) => {
      const a = el.getAnimations()[0];
      return a
        ? [
            a.effect!.getComputedTiming().duration,
            a.effect!.getComputedTiming().delay,
          ]
        : [0, 0];
    });
  expect(t).toEqual([0, 0]);
});

test("a shared ?shown= opens with those tiles; nonsense → one page; too many → all", async ({
  page,
}) => {
  await page.goto("/gallery?shown=24");
  await expect(tiles(page)).toHaveCount(24);
  await page.goto("/gallery?shown=999");
  await expect(tiles(page)).toHaveCount(30);
  await expect(more(page)).toHaveCount(0);
  await page.goto("/gallery?shown=abc");
  await expect(tiles(page)).toHaveCount(12);
});

test("ANIM-23: a photo waits on the lilac base, then fades in once decoded", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/brand/menu-texture.webp?demo", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/dev/components", { waitUntil: "domcontentloaded" });
  const photo = page.getByTestId("photo-demo").locator("img");
  // Lazy-loaded: it is asked for once it is near the screen.
  await page.getByTestId("photo-demo").scrollIntoViewIfNeeded();
  await expect(photo).toHaveAttribute("data-photo", "waiting");
  await expect(photo).toHaveCSS("opacity", "0");
  release();
  await expect(photo).toHaveAttribute("data-photo", "shown");
  await expect(photo).toHaveCSS("opacity", "1");
  await expect(photo).toHaveCSS("transition-duration", "0.24s");
  // From the cache: at once.
  await page.unrouteAll();
  await page.reload();
  await expect(photo).toHaveAttribute("data-photo", /instant|shown/);
});

test("axe: no violations, with more tiles loaded", async ({
  page,
}, testInfo) => {
  await page.goto("/gallery");
  await more(page).click();
  await expect(tiles(page)).toHaveCount(24);
  // Contrast is checked once the new tiles have finished fading in.
  await tiles(page).evaluateAll((els) =>
    Promise.all(els.flatMap((el) => el.getAnimations().map((a) => a.finished))),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_gallery.png`),
    fullPage: true,
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every photo shows (lazy-loaded) and there is no paging", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one browser is enough");
    await page.goto("/gallery");
    await expect(page.locator("main ul[aria-label] > li")).toHaveCount(30);
    await expect(page.locator("main ul[aria-label] > li").last()).toBeVisible();
    await expect(more(page)).toBeHidden();
    await expect(page.getByText(/^Showing/)).toBeHidden();
  });
});
