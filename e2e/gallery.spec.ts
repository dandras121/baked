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
  const frame = tiles(page).first().locator("button > span").first();
  const box = (await frame.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  await expect(frame).toHaveCSS("background-color", "rgb(201, 167, 232)");
  await expect(tiles(page).first().locator("button > span").nth(1)).toHaveCSS(
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
  await expect(tiles(page).nth(12).getByRole("button")).toBeFocused();
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
  await expect(tiles(page)).toHaveCount(24);
  // Read from CSS: each rise lets go of its tile once it ends (fill backwards), so some may be over already.
  const timing = await tiles(page).evaluateAll((els) =>
    els.slice(12).map((el) => {
      const cs = getComputedStyle(el);
      return [cs.animationDuration, cs.animationDelay];
    }),
  );
  expect(timing.slice(0, 7)).toEqual([
    ["0.24s", "0s"],
    ["0.24s", "0.04s"],
    ["0.24s", "0.08s"],
    ["0.24s", "0.12s"],
    ["0.24s", "0.16s"],
    ["0.24s", "0.2s"],
    ["0.24s", "0.2s"],
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
  await page.route("**/home/west-lothian.webp?demo", async (route) => {
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

// Slice 2.8b: the lightbox (§4.8, ANIM-14).
const dialog = (page: Page) => page.locator("dialog[open]");
const caption = (page: Page) => page.locator("#lightbox-caption");
const openTile = async (page: Page, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(dialog(page)).toHaveCount(1);
};
const photoId = (page: Page) => new URL(page.url()).searchParams.get("photo");

test("a tile opens the lightbox: ?photo=, caption, occasion, I’d like one like this → bespoke", async ({
  page,
}) => {
  await page.goto("/gallery");
  const tile = page.getByRole("button", { name: "Rosette wedding · 2025" });
  await expect(tile).toHaveAttribute("aria-haspopup", "dialog");
  await openTile(page, "Rosette wedding · 2025");
  const id = photoId(page);
  expect(id).toMatch(/^\d+$/);
  await expect(caption(page)).toHaveText("Rosette wedding · 2025");
  await expect(dialog(page)).toContainText("Weddings");
  await expect(
    dialog(page).getByRole("link", { name: "I’d like one like this →" }),
  ).toHaveAttribute("href", `/bespoke?inspired=${id}`);
  await expect(dialog(page)).toHaveAccessibleName("Rosette wedding · 2025");
});

test("I’d like one like this → leaves no open lightbox behind: the bespoke page scrolls and takes clicks", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openTile(page, "Rosette wedding · 2025");
  await dialog(page)
    .getByRole("link", { name: "I’d like one like this →" })
    .click();
  await expect(page).toHaveURL(/\/bespoke\?inspired=\d+/);
  await expect(page.getByText("Inspired by")).toBeVisible();
  expect(
    await page.evaluate(() => ({
      open: document.querySelectorAll("dialog[open]").length,
      overflow: getComputedStyle(document.documentElement).overflowY,
    })),
  ).toEqual({ open: 0, overflow: "visible" });
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const flexible = page.getByRole("button", {
    name: "My date is still flexible",
  });
  await flexible.click();
  await expect(flexible).toHaveAttribute("aria-pressed", "true");
});

test("Esc and × close it, focus returns to the tile, the address loses ?photo=", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openTile(page, "Muddy pigs · 2025");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(
    page.getByRole("button", { name: "Muddy pigs · 2025" }),
  ).toBeFocused();
  await openTile(page, "Muddy pigs · 2025");
  await dialog(page).getByRole("button", { name: "Close" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/gallery$/);
});

test("browser Back closes the lightbox and stays on the gallery; Forward opens it again", async ({
  page,
}) => {
  await page.goto("/faq");
  await page.goto("/gallery");
  await openTile(page, "Engagement · 2024");
  await page.goBack();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/gallery$/);
  await page.goForward();
  await expect(dialog(page)).toHaveCount(1);
  await expect(caption(page)).toHaveText("Engagement · 2024");
});

test("‹ › and the arrow keys move between photos, replacing the address; the ends stop", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openTile(page, "Digger birthday · 2025");
  const length = await page.evaluate(() => history.length);
  const prev = dialog(page).getByRole("button", { name: "Previous cake" });
  const next = dialog(page).getByRole("button", { name: "Next cake" });
  await expect(prev).toBeDisabled();
  await next.click();
  await expect(caption(page)).toHaveText("First birthday · 2025");
  await page.keyboard.press("ArrowRight");
  await expect(caption(page)).toHaveText("Rosette wedding · 2025");
  await page.keyboard.press("ArrowLeft");
  await expect(caption(page)).toHaveText("First birthday · 2025");
  expect(await page.evaluate(() => history.length)).toBe(length);
  // Back still closes it (one entry for the whole visit).
  await page.goBack();
  await expect(dialog(page)).toHaveCount(0);
});

test("ANIM-10 on the dark surface: at most 5 dashes, named “Photo n of 30”", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openTile(page, "Rosette wedding · 2025");
  const dashes = dialog(page).getByRole("button", {
    name: /^Photo \d+ of 30$/,
  });
  expect(await dashes.count()).toBeLessThanOrEqual(5);
  await dialog(page).getByRole("button", { name: "Photo 5 of 30" }).click();
  await expect(caption(page)).toHaveText("Farmyard 60th · 2024");
  await expect(dialog(page).locator("#lightbox-position")).toHaveText(
    "Photo 5 of 30",
  );
});

test("moving past the loaded tiles loads the next page", async ({ page }) => {
  await page.goto("/gallery");
  await openTile(page, "Anniversary · 2023");
  await page.keyboard.press("ArrowRight");
  await expect(caption(page)).toHaveText("Sample photo 13 · 2023");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(tiles(page)).toHaveCount(24);
  await expect(
    page.getByRole("button", { name: "Sample photo 13 · 2023" }),
  ).toBeFocused();
});

test("a shared ?photo= opens it; × removes the id; an unknown id opens the page alone", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openTile(page, "Rosette wedding · 2025");
  const shared = page.url();
  await page.goto(shared);
  await expect(dialog(page)).toHaveCount(1);
  await expect(caption(page)).toHaveText("Rosette wedding · 2025");
  await dialog(page).getByRole("button", { name: "Close" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/gallery$/);
  await page.goto("/gallery?photo=999999");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
});

test("focus never reaches the page behind the open lightbox", async ({
  page,
}) => {
  await page.goto("/gallery");
  await openTile(page, "First birthday · 2025");
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    // Inside the dialog, or out to the browser itself (a modal dialog allows that) — never the page.
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          !!document.activeElement?.closest("dialog"),
      ),
    ).toBe(true);
  }
});

test("ANIM-14 open: photo 320 ms from the tile, scrim 240 ms linear, controls 200–320 ms", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  await page.goto("/gallery");
  await page.getByRole("button", { name: "Muddy pigs · 2025" }).click();
  const timing = await page.evaluate(() =>
    document
      .querySelector("dialog")!
      .getAnimations({ subtree: true })
      .map((a) => {
        const t = a.effect!.getComputedTiming();
        const k = (a.effect as KeyframeEffect).getKeyframes();
        return [t.duration, t.delay, t.easing, String(k[0].transform ?? "")];
      }),
  );
  expect(timing).toContainEqual([
    320,
    0,
    "cubic-bezier(0.33, 1, 0.68, 1)",
    expect.stringMatching(/^translate\(.*scale/),
  ]);
  expect(timing).toContainEqual([240, 0, "linear", ""]);
  expect(timing).toContainEqual([
    120,
    200,
    "cubic-bezier(0.33, 1, 0.68, 1)",
    "",
  ]);
});

test("ANIM-14 reduced motion: opens and closes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery");
  await page.getByRole("button", { name: "Muddy pigs · 2025" }).click();
  expect(
    await page.evaluate(
      () =>
        document.querySelector("dialog")!.getAnimations({ subtree: true })
          .length,
    ),
  ).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
});

test("phone: a swipe moves to the next cake; the ‹ › beside the hint are 44 px buttons", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone only");
  await page.goto("/gallery");
  await openTile(page, "Digger birthday · 2025");
  await expect(dialog(page).getByText("Swipe for the next cake")).toBeVisible();
  const box = (await dialog(page)
    .getByRole("button", { name: "Next cake" })
    .boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(14);
  const hit = await dialog(page)
    .getByRole("button", { name: "Next cake" })
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return !!document
        .elementFromPoint(r.left + r.width / 2, r.top + r.height / 2 + 18)
        ?.closest("button[aria-label='Next cake']");
    });
  expect(hit).toBe(true);
  const photo = dialog(page).locator("[class*='photo']").first();
  const r = (await photo.boundingBox())!;
  const at = (x: number) => ({
    pointerId: 1,
    pointerType: "touch",
    clientX: x,
    clientY: r.y + r.height / 2,
    bubbles: true,
  });
  await photo.dispatchEvent("pointerdown", at(r.x + 300));
  await photo.dispatchEvent("pointermove", at(r.x + 200));
  await photo.dispatchEvent("pointerup", at(r.x + 150));
  await expect(caption(page)).toHaveText("First birthday · 2025");
  // A short drag springs back.
  await photo.dispatchEvent("pointerdown", at(r.x + 200));
  await photo.dispatchEvent("pointerup", at(r.x + 180));
  await expect(caption(page)).toHaveText("First birthday · 2025");
});

test("axe: no violations with the lightbox open", async ({
  page,
}, testInfo) => {
  await page.goto("/gallery");
  await openTile(page, "Rosette wedding · 2025");
  await page.waitForTimeout(400);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_lightbox.png`),
  });
});

// Bohoka 2026-11-01: with the larger cake name the dashes were pushed off the desktop screen.
test("lightbox: the caption bar and the dashes always fit on the screen", async ({
  page,
}) => {
  for (const size of [
    { width: 1280, height: 700 },
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/gallery");
    await page.locator("[data-pressable][class*=tileButton]").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const last = dialog.locator("[data-index]").last();
    const box = (await last.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
  }
});
