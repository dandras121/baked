import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 2.1: Home hero (UI-06, ANIM-10) and the fixed sections (§4.1).
// The e2e server runs with BBL_HERO_PLACEHOLDERS=1, so the hero has the three development slides.

/** The slider is hydrated and its timer runs. */
const live = (page: Page) =>
  expect(page.locator("[data-hero-slider]")).toHaveAttribute(
    "data-autoplay",
    "",
  );

const slides = (page: Page) =>
  page.locator("[data-hero-slider] [aria-roledescription='slide']");
const activeIndex = (page: Page) =>
  slides(page).evaluateAll((els) =>
    els.findIndex((el) => el.getAttribute("data-state") === "active"),
  );

test("the hero has the designed slide and two placeholders, with dashes and a pause button", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await expect(slides(page)).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Slide 1 of 3" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    page.getByRole("button", { name: "Pause the slides" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("hero").getByRole("link", { name: "Start enquiry" }),
  ).toHaveAttribute("href", "/bespoke");
  await expect(
    page.getByTestId("hero").getByRole("link", { name: "About Linda" }),
  ).toHaveAttribute("href", "/about");
});

test("?hero=live shows the designed hero alone: no dashes, no timer", async ({
  page,
}) => {
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await expect(page.getByTestId("hero")).toHaveAttribute("data-slides", "1");
  await expect(page.getByText("Hero slide 2 — placeholder")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Slide \d of/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Pause the slides" }),
  ).toHaveCount(0);
});

test("advances every 6 s and loops 1 → 2 → 3 → 1", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(page.locator("[data-hero-slider]")).toHaveAttribute(
    "data-autoplay",
    "",
  );
  // Freeze the page clock, so only runFor moves time (no drift while the machine is busy).
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  let previous = 0;
  for (const expected of [1, 2, 0]) {
    // Not after only 4 s (the clock also ticks in real time while polling) …
    await page.clock.runFor(4000);
    expect(await activeIndex(page)).toBe(previous);
    // … and then it moves on (small steps, so a timer set a moment late still counts).
    await expect
      .poll(async () => {
        await page.clock.runFor(250);
        return activeIndex(page);
      })
      .toBe(expected);
    await page.clock.runFor(500); // let the crossfade finish
    previous = expected;
  }
});

test("pauses while hovered and with keyboard focus inside", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "mouse hover is a desktop case");
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await live(page);
  await page.getByTestId("hero").hover();
  await page.clock.runFor(13000);
  expect(await activeIndex(page)).toBe(0);

  await page.mouse.move(0, 0);
  await page
    .getByTestId("hero")
    .getByRole("link", { name: "Start enquiry" })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab"); // keyboard focus on Start enquiry
  await page.clock.runFor(13000);
  expect(await activeIndex(page)).toBe(0);
});

test("the pause button stops and restarts the slides", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await page.mouse.move(0, 0);
  await live(page);
  await page.getByRole("button", { name: "Pause the slides" }).click();
  await page.locator("body").click({ position: { x: 2, y: 400 } }); // focus away
  await page.clock.runFor(13000);
  expect(await activeIndex(page)).toBe(0);
  await page.getByRole("button", { name: "Play the slides" }).click();
  await page.locator("body").click({ position: { x: 2, y: 400 } });
  await page.clock.runFor(6000);
  await expect.poll(() => activeIndex(page)).toBe(1);
});

test("with reduced motion the hero never advances", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await page.mouse.move(0, 0);
  await page.clock.runFor(20000);
  expect(await activeIndex(page)).toBe(0);
  // A dash still changes the slide, at once.
  await page.getByRole("button", { name: "Slide 3 of 3" }).click();
  await expect.poll(() => activeIndex(page)).toBe(2);
});

test("crossfade: the incoming slide fades in above the outgoing one (0 / 0.409 / 0.802 / 0.96 / 1)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await page.getByRole("button", { name: "Slide 2 of 3" }).click();
  const samples = await page.evaluate(() => {
    const all = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-hero-slider] [aria-roledescription='slide']",
      ),
    ];
    const incoming = all.find((el) => el.dataset.state === "active")!;
    const outgoing = all.find((el) => el.dataset.state === "leaving")!;
    const fade = incoming.getAnimations()[0];
    fade.pause();
    const out: number[] = [];
    for (const t of [0, 100, 200, 300, 399.999]) {
      fade.currentTime = t;
      out.push(Number(getComputedStyle(incoming).opacity));
    }
    return {
      out,
      above:
        Number(getComputedStyle(incoming).zIndex) >
        Number(getComputedStyle(outgoing).zIndex),
      outgoingOpacity: Number(getComputedStyle(outgoing).opacity),
      duration: fade.effect?.getTiming().duration,
    };
  });
  expect(samples.duration).toBe(400);
  expect(samples.above).toBe(true);
  expect(samples.outgoingOpacity).toBe(1);
  [0, 0.409, 0.802, 0.96, 1].forEach((v, i) =>
    expect(samples.out[i]).toBeCloseTo(v, 2),
  );
});

test("swipe changes the slide on touch screens", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "swipe is phone and tablet");
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await live(page);
  const box = (await page
    .locator("[data-hero-slider] > div")
    .first()
    .boundingBox())!;
  const y = box.y + box.height / 2;
  const swipe = async (from: number, to: number) => {
    await page.evaluate(
      ([x0, x1, yy]) => {
        const stage = document.querySelector("[data-hero-slider] > div")!;
        const ev = (type: string, x: number) =>
          stage.dispatchEvent(
            new PointerEvent(type, {
              pointerType: "touch",
              pointerId: 7,
              clientX: x,
              clientY: yy,
              bubbles: true,
            }),
          );
        ev("pointerdown", x0);
        ev("pointerup", x1);
      },
      [from, to, y],
    );
  };
  await swipe(box.x + box.width * 0.8, box.x + box.width * 0.2);
  await expect.poll(() => activeIndex(page)).toBe(1);
  await swipe(box.x + box.width * 0.2, box.x + box.width * 0.8);
  await expect.poll(() => activeIndex(page)).toBe(0);
});

test("fixed sections: town from Settings, the cake slot, the social band without an empty Facebook", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "We got you." }),
  ).toBeVisible();
  await expect(page.locator("[data-slot='fast changing cakes']")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Local, home baked." }),
  ).toBeVisible();
  await expect(
    page.getByText(`based in ${S.town}, West Lothian`),
  ).toBeVisible();
  const band = page.locator("section[aria-labelledby='social-media']");
  await expect(band.getByRole("link")).toHaveCount(1); // Facebook URL is empty in the seed
  await expect(band.getByRole("link")).toHaveAttribute("href", S.instagram.url);
  await expect(band.getByRole("link")).toHaveAttribute("target", "_blank");
});

test("no horizontal scroll and no axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

test("phone hero: the question stays two lines above the supporting line on narrower phones", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "phone layout");
  for (const width of [360, 375, 390, 402]) {
    await page.setViewportSize({ width, height: 902 });
    await page.goto("/?hero=live");
    await expect(page.getByTestId("hero")).toHaveCount(1); // the streamed hero has replaced the fallback
    await page.evaluate(() => document.fonts.ready);
    const q = (await page
      .getByRole("heading", { name: /What’s your/ })
      .boundingBox())!;
    const body = (await page.locator("[class*=bodyPhone]").boundingBox())!;
    const lineHeight = await page
      .getByRole("heading", { name: /What’s your/ })
      .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect(Math.round(q.height / lineHeight), `${width}px`).toBe(2);
    expect(q.y + q.height, `${width}px`).toBeLessThanOrEqual(body.y);
  }
});

test("tablet portrait: the hero is as tall as it is wide (Bohoka 2026-10-30)", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "tablet", "tablet portrait");
  for (const [width, height] of [
    [768, 1024],
    [820, 1180],
    [1024, 1366],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/?hero=live");
    await expect(page.getByTestId("hero")).toHaveCount(1);
    const box = (await page.locator("[class*=frame]").first().boundingBox())!;
    expect(Math.abs(box.width - box.height), `${width}px`).toBeLessThan(1.5);
  }
  // Landscape keeps the wide hero.
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const wide = (await page.locator("[class*=frame]").first().boundingBox())!;
  expect(wide.width / wide.height).toBeCloseTo(1202 / 492, 1);
});

test("the big Home titles stay on one line on iPad widths", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "tablet", "tablet widths");
  for (const [width, height] of [
    [768, 1024],
    [820, 1180],
    [1024, 1366],
    [1180, 820],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByTestId("hero")).toHaveCount(1);
    for (const name of ["We got you.", "Local, home baked."]) {
      const h = page.getByRole("heading", { name });
      const lines = await h.evaluate((el) => {
        const cs = getComputedStyle(el);
        const lh =
          cs.lineHeight === "normal"
            ? parseFloat(cs.fontSize) * 1.25
            : parseFloat(cs.lineHeight);
        return Math.round(el.getBoundingClientRect().height / lh);
      });
      expect(lines, `${name} at ${width}px`).toBe(1);
    }
  }
});

// Slice 2.3: the cake row and “Special idea?” (§4.1).
test("cake row: the first ten visible designs in Linda's order (Bohoka 2026-10-31), View opens the cake page", async ({
  page,
}) => {
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const cards = page.locator("[data-cake-card]");
  await expect(cards).toHaveCount(10);
  await expect(cards.locator("h3")).toHaveText([
    "The Lothian",
    "Bramble & Cream",
    "Wee Beastie",
    "Sugar Peony",
    "Confetti Drum",
    "Sample cake 6",
    "Sample cake 7",
    "Sample cake 8",
    "Sample cake 9",
    "Sample cake 10",
  ]);
  const first = cards.first();
  await expect(first).toContainText("Two tiers");
  await expect(first).toContainText("Serves 24");
  await expect(first).toContainText("From £185");
  await expect(
    page.getByRole("link", { name: "View the whole collection" }),
  ).toHaveAttribute("href", "/cakes");
  await first.getByRole("link", { name: "View The Lothian" }).click();
  await expect(page).toHaveURL(/\/cakes\/the-lothian$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "The Lothian" }),
  ).toBeVisible();
});

test("cake row: desktop arrows stop at the ends; phone and tablet swipe without arrows", async ({
  page,
}, info) => {
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const prev = page.getByRole("button", { name: "Previous cakes" });
  const next = page.getByRole("button", { name: "Next cakes" });
  if (info.project.name !== "desktop") {
    await expect(prev).toBeHidden();
    await expect(next).toBeHidden();
    const scrolls = await page
      .getByRole("list", { name: "Cakes" })
      .evaluate(
        (el) =>
          el.scrollWidth > el.clientWidth &&
          getComputedStyle(el).scrollSnapType.includes("x"),
      );
    expect(scrolls).toBe(true);
    return;
  }
  await expect(prev).toHaveAttribute("aria-disabled", "true");
  for (
    let i = 0;
    i < 9 && (await next.getAttribute("aria-disabled")) !== "true";
    i++
  ) {
    await next.click();
    await page.waitForTimeout(600);
  }
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await expect(prev).not.toHaveAttribute("aria-disabled", "true");
});

test("Special idea: four squares and the gallery link (the seed gallery has showing photos; empty: unit test)", async ({
  page,
}) => {
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const section = page.locator("section[aria-labelledby='special-idea']");
  await expect(
    section.getByRole("heading", { name: "Special idea?" }),
  ).toBeVisible();
  await expect(section.locator("li")).toHaveCount(4);
  await expect(
    section.getByRole("link", { name: /previous works gallery/ }),
  ).toHaveAttribute("href", "/gallery");
  await expect(
    section.getByRole("link", { name: "Start enquiry" }),
  ).toHaveAttribute("href", "/bespoke");
  // Squares are not links.
  await expect(section.locator("li a")).toHaveCount(0);
});

test("cake row: the slider indicator follows the row, a dash moves it (Bohoka 2026-10-31)", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const row = page.getByRole("list", { name: "Cakes" });
  await row.scrollIntoViewIfNeeded();
  const dash = (n: number) =>
    page.getByRole("button", {
      name: new RegExp(`^Cakes, position ${n} of \\d+$`),
    });
  await expect(dash(1)).toHaveAttribute("aria-current", "true");
  const before = await row.evaluate((el) => el.scrollLeft);
  await dash(2).click();
  await expect(dash(2)).toHaveAttribute("aria-current", "true");
  expect(await row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
  expect(
    await page
      .locator("[aria-label^='Cakes, position']:not([data-state='hidden'])")
      .count(),
  ).toBeLessThanOrEqual(5);
});
