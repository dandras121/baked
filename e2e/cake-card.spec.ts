import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 3.4a: the cake card opens in place and closes (ANIM-11). The seed gives the synthetic test clip to The
// Lothian, Bramble & Cream, Sugar Peony, Almond & Rose and Midnight Berry.
const card = (page: Page, name: string) =>
  page
    .locator("[data-cake-card]")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
const corner = (page: Page, name: string) =>
  card(page, name).locator("button[aria-expanded]");

const box = async (page: Page, name: string, selector: string) =>
  (await card(page, name).locator(selector).first().boundingBox())!;

test("a card with a card video has the corner button; one without has none", async ({
  page,
}) => {
  await page.goto("/cakes");
  await expect(corner(page, "The Lothian")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(corner(page, "The Lothian")).toHaveAccessibleName(
    "Show the The Lothian video",
  );
  await expect(corner(page, "Wee Beastie")).toHaveCount(0);
  const b = (await corner(page, "The Lothian").boundingBox())!;
  expect(b.width).toBeGreaterThanOrEqual(44);
  expect(b.height).toBeGreaterThanOrEqual(44);
});

test("opening: the card keeps its size, price and View stay put, the title moves into the bottom row", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await card(page, "The Lothian").scrollIntoViewIfNeeded();
  const measure = async () => {
    const c = await box(page, "The Lothian", ":scope");
    const v = await box(
      page,
      "The Lothian",
      "a[href='/cakes/the-lothian'][data-pressable]",
    );
    const p = await box(page, "The Lothian", "p:has-text('From £185')");
    return {
      size: [c.width, c.height],
      view: [v.x - c.x, v.y - c.y],
      price: [p.x - c.x, p.y - c.y],
    };
  };
  const before = await measure();
  await corner(page, "The Lothian").click();
  await expect(card(page, "The Lothian")).toHaveAttribute("data-open", "");
  await expect(corner(page, "The Lothian")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(corner(page, "The Lothian")).toHaveAccessibleName(
    "Close the The Lothian video",
  );
  expect(await measure()).toEqual(before);
  // The description and the tiers are gone; the title's open place sits under the grown picture.
  await expect(
    card(page, "The Lothian").locator("[data-fade]").first(),
  ).toHaveCSS("opacity", "0");
  const media = await box(page, "The Lothian", "[data-media]");
  const title = await box(page, "The Lothian", "[data-open-title]");
  expect(title.y).toBeGreaterThanOrEqual(media.y + media.height - 1);
  // The heading itself stays for screen readers.
  await expect(
    card(page, "The Lothian").getByRole("heading", { name: "The Lothian" }),
  ).toBeAttached();
});

test("the picture zooms to the open crop of the square video (bottom-anchored)", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await corner(page, "The Lothian").click();
  const t = await card(page, "The Lothian")
    .locator("[data-frame]")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));
  const w = testInfo.project.name;
  // Desktop / tablet open crop 0.1136, 0.36 – 0.8864, 1 → scale 1 / 0.7728; phone catalogue → 1 / 0.64.
  expect(t.a).toBeCloseTo(w === "phone" ? 1.5625 : 1.29399, 3);
  const frame = await box(page, "The Lothian", "[data-frame]");
  const media = await box(page, "The Lothian", "[data-media]");
  // The video's bottom edge is the picture's bottom edge.
  expect(
    Math.abs(frame.y + frame.height - (media.y + media.height)),
  ).toBeLessThan(1.5);
});

test("ANIM-11 timings: picture and positions 500 ms (p), size on the gentle curve, fades 250 ms, chevrons linear", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  // Every animate() call is written down as it starts, so a busy machine cannot make the test miss one.
  await page.addInitScript(() => {
    const w = window as unknown as { __anims: string[] };
    w.__anims = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const o = (options ?? {}) as KeyframeAnimationOptions;
      w.__anims.push(`${o.delay ?? 0}+${o.duration} ${o.easing ?? "linear"}`);
      return original.call(this, frames, options);
    };
  });
  await page.goto("/cakes");
  const taken = async () => {
    const list = await page.evaluate(() =>
      (window as unknown as { __anims: string[] }).__anims.splice(0),
    );
    return list;
  };
  await taken();
  await corner(page, "The Lothian").click();
  await expect(card(page, "The Lothian")).toHaveAttribute("data-open", "");
  const list = await taken();
  expect(list).toContain("0+500 cubic-bezier(0.65, 0, 0.35, 1)");
  expect(list).toContain("0+500 cubic-bezier(0.37, 0, 0.63, 1)");
  expect(list).toContain("0+250 cubic-bezier(0.37, 0, 0.63, 1)");
  expect(list).toContain("0+500 linear");
  await page.waitForTimeout(700);
  // Closing: everything waits 120 ms (the video's cross-fade), the fades come back in the last 250 ms.
  await corner(page, "The Lothian").click();
  await expect(card(page, "The Lothian")).not.toHaveAttribute("data-open");
  const back = (await taken()).map((x) => x.split(" ")[0]);
  expect(back).toContain("120+500");
  expect(back).toContain("370+250");
});

test("one card open at a time: opening another closes the first", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await corner(page, "The Lothian").click();
  await corner(page, "Bramble & Cream").click();
  await expect(card(page, "Bramble & Cream")).toHaveAttribute("data-open", "");
  await expect(card(page, "The Lothian")).not.toHaveAttribute("data-open");
  await expect(corner(page, "The Lothian")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("reduced motion: opens and closes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await corner(page, "Sugar Peony").click();
  expect(
    await card(page, "Sugar Peony").evaluate(
      (el) => el.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await corner(page, "Sugar Peony").click();
  await expect(card(page, "Sugar Peony")).not.toHaveAttribute("data-open");
});

test("the Home row cards open too", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?hero=live");
  const first = page.locator("[data-cake-card]").first();
  await first.scrollIntoViewIfNeeded();
  await first.locator("button[aria-expanded]").click();
  await expect(first).toHaveAttribute("data-open", "");
});

test("axe: no violations with a card open", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await corner(page, "Almond & Rose").click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await card(page, "Almond & Rose").screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_card-open.png`),
  });
});

// Slice 3.4b: the card video (ANIM-11 Video, Video playback).
const video = (page: Page, name: string) => card(page, name).locator("video");

test("the video is not fetched before the first open; it plays from frame 0 when fully open, looping, muted, no controls", async ({
  page,
}, testInfo) => {
  const mp4: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".mp4")) mp4.push(r.url());
  });
  await page.goto("/cakes");
  await page.waitForTimeout(500);
  expect(mp4).toEqual([]);
  await expect(video(page, "The Lothian")).toHaveAttribute("preload", "none");
  await corner(page, "The Lothian").click();
  // Not before the card is fully open (500 ms).
  await page.waitForTimeout(250);
  expect(
    await video(page, "The Lothian").evaluate(
      (v: HTMLVideoElement) => v.paused,
    ),
  ).toBe(true);
  await expect
    .poll(
      () =>
        video(page, "The Lothian").evaluate(
          (v: HTMLVideoElement) => !v.paused && v.currentTime > 0,
        ),
      {
        timeout: 5000,
      },
    )
    .toBe(true);
  const v = await video(page, "The Lothian").evaluate(
    (el: HTMLVideoElement) => ({
      loop: el.loop,
      muted: el.muted,
      controls: el.controls,
      inline: el.playsInline,
      src: el.currentSrc,
      duration: Math.round(el.duration * 10) / 10,
    }),
  );
  expect(v).toMatchObject({
    loop: true,
    muted: true,
    controls: false,
    inline: true,
    duration: 5,
  });
  expect(v.src).toMatch(
    testInfo.project.name === "desktop" ? /card-1440\.mp4$/ : /card-1080\.mp4$/,
  );
  await expect(video(page, "The Lothian")).toHaveAttribute("data-playing", "");
});

test("closing stops the video and returns to the still first frame", async ({
  page,
}) => {
  await page.goto("/cakes");
  await corner(page, "The Lothian").click();
  await expect(video(page, "The Lothian")).toHaveAttribute("data-playing", "", {
    timeout: 5000,
  });
  await corner(page, "The Lothian").click();
  await expect(video(page, "The Lothian")).not.toHaveAttribute("data-playing", {
    timeout: 2000,
  });
  const v = await video(page, "The Lothian").evaluate(
    (el: HTMLVideoElement) => [el.paused, el.currentTime],
  );
  expect(v).toEqual([true, 0]);
});

test("off screen it pauses; back on screen it carries on", async ({ page }) => {
  await page.goto("/cakes");
  await corner(page, "The Lothian").click();
  await expect(video(page, "The Lothian")).toHaveAttribute("data-playing", "", {
    timeout: 5000,
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() =>
      video(page, "The Lothian").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(true);
  await card(page, "The Lothian").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      video(page, "The Lothian").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(false);
});

test("reduced motion: the open card shows the still; the video never starts or loads", async ({
  page,
}) => {
  const mp4: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".mp4")) mp4.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await corner(page, "The Lothian").click();
  await page.waitForTimeout(1200);
  expect(
    await video(page, "The Lothian").evaluate(
      (v: HTMLVideoElement) => v.paused,
    ),
  ).toBe(true);
  expect(mp4).toEqual([]);
});
