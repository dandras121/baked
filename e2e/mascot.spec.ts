import { expect, test, type Page } from "@playwright/test";

// Slice 1.3: ANIM-04 — the header mascot slides in on the first page load of a visit (A§7A).

const mark = (page: Page) => page.locator(".logo-mark");
const animations = (page: Page) =>
  mark(page).evaluate((el) => el.getAnimations().length);

/** The mascot's transform at one moment of its slide (the 150 ms delay included). */
const transformAt = (page: Page, ms: number) =>
  mark(page).evaluate((el, t) => {
    const a = el.getAnimations()[0];
    a.pause();
    a.currentTime = t;
    return getComputedStyle(el).transform;
  }, ms);

/** matrix(a, b, c, d, e, f) → rotation in degrees and the translate part. */
function parse(matrix: string) {
  const [a, b, , , e, f] = /matrix\(([^)]+)\)/
    .exec(matrix)![1]
    .split(",")
    .map(Number);
  return { deg: (Math.atan2(b, a) * 180) / Math.PI, x: e, y: f };
}

test("A§7A first load: the mascot slides along the sampled curve (150 ms delay, 450 ms)", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/mascot-intro/);
  const timing = await mark(page).evaluate((el) => {
    const t = el.getAnimations()[0].effect!.getComputedTiming();
    return [t.delay, t.duration, t.fill];
  });
  expect(timing).toEqual([150, 450, "both"]);
  expect(
    await mark(page).evaluate(
      (el) => getComputedStyle(el).animationTimingFunction,
    ),
  ).toBe("cubic-bezier(0.5, 1, 0.89, 1)");
  // transform-origin: 50% 100% (the bottom centre of the box).
  const [ox, oy, w, h] = await mark(page).evaluate((el) => {
    const o = getComputedStyle(el).transformOrigin.split(" ").map(parseFloat);
    return [
      o[0],
      o[1],
      (el as HTMLElement).offsetWidth,
      (el as HTMLElement).offsetHeight,
    ];
  });
  expect(ox).toBeCloseTo(w / 2, 0);
  expect(oy).toBeCloseTo(h, 0);

  // The tablet has the 77 px desktop bar since Bohoka 2026-10-31.
  const desktop = testInfo.project.name !== "phone";
  // Rows of the A§7A table: [t, phone x, y, tablet / desktop x, y, rotate].
  const rows: [number, number, number, number, number, number][] = [
    // Phone: the desktop values × 55/77 (Bohoka 2026-10-30).
    [0, -31.43, 90.71, -44, 127, 25],
    [90, -20.11, 58.06, -28.16, 81.28, 21.4],
    [180, -11.31, 32.66, -15.84, 45.72, 18.6],
    [270, -5.03, 14.51, -7.04, 20.32, 16.6],
    [360, -1.26, 3.63, -1.76, 5.08, 15.4],
    [450, 0, 0, 0, 0, 15],
  ];
  for (const [t, mx, my, dx, dy, deg] of rows) {
    const m = parse(await transformAt(page, 150 + t));
    // The computed matrix is translate(x, y) rotate(r); the bottom-centre origin is applied when drawn.
    expect(m.deg, `${t} ms rotate`).toBeCloseTo(deg, 0);
    expect(m.x, `${t} ms x`).toBeCloseTo(desktop ? dx : mx, 0);
    expect(m.y, `${t} ms y`).toBeCloseTo(desktop ? dy : my, 0);
  }
});

test("A§7A during the 150 ms delay the mascot is hidden behind the bar (never over the page)", async ({
  page,
}) => {
  await page.goto("/");
  const hidden = await mark(page).evaluate((el) => {
    const a = el.getAnimations()[0];
    a.pause();
    a.currentTime = 0;
    const r = el.getBoundingClientRect();
    const bar = el.closest("[class*='bar']")!.getBoundingClientRect();
    return r.top >= bar.bottom - 25; // only the hearts' tips may reach into the bar
  });
  expect(hidden).toBe(true);
});

test("A§7A it plays once per visit: not on the next page, not after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/mascot-intro/);
  await expect(page.locator("html")).not.toHaveClass(/mascot-intro/, {
    timeout: 2000,
  });
  await page.goto("/gallery");
  expect(await animations(page)).toBe(0);
  await page.reload();
  expect(await animations(page)).toBe(0);
  await expect(page.locator("html")).not.toHaveClass(/mascot-intro/);
});

test("A§7A a new tab (a new visit) plays it again", async ({
  browser,
}, testInfo) => {
  const options = testInfo.project.use;
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({
      viewport: options.viewport,
      hasTouch: options.hasTouch,
    });
    const page = await ctx.newPage();
    await page.goto(new URL("/faq", testInfo.project.use.baseURL).href);
    await expect(page.locator("html")).toHaveClass(/mascot-intro/);
    await ctx.close();
  }
});

test("A§7A after the slide the mascot sits exactly in its designed place", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/mascot-intro/, {
    timeout: 2000,
  });
  const after = await mark(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height].map(
      (v) => Math.round(v * 10) / 10,
    );
  });
  // The rotated box of the Figma headers: desktop 1421:9315 (−33, −26.9, 129.76 × 136.44 at 1280),
  // the tablet the same (77 px bar, Bohoka 2026-10-31); the phone the composition scaled to the 55 px bar.
  if (testInfo.project.name !== "phone") {
    expect(after[0]).toBeCloseTo(-33, 0);
    expect(after[1]).toBeCloseTo(-26.9, 0);
    expect(after[2]).toBeCloseTo(129.76, 0);
    expect(after[3]).toBeCloseTo(136.44, 0);
  } else {
    // Phone: the desktop composition × 55/77 (Bohoka 2026-10-30).
    expect(after[0]).toBeCloseTo(-23.57, 0);
    expect(after[1]).toBeCloseTo(-19.21, 0);
    expect(after[2]).toBeCloseTo(92.69, 0);
    expect(after[3]).toBeCloseTo(97.46, 0);
  }
});

test("A§1.4 reduced motion: the mascot is simply in place", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await animations(page)).toBe(0);
  expect(
    await mark(page).evaluate((el) => getComputedStyle(el).transform),
  ).toMatch(/^matrix\(0\.96592/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("A§7A nothing animates; the mascot is in place", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/mascot-intro/);
    await expect(mark(page)).toBeVisible();
  });
});
