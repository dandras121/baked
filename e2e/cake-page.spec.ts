import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 3.5: the cake page media (§5.1, UI-08, ANIM-22). The seed gives The Lothian 3 sample photos and the
// synthetic video as item 3; Bramble & Cream one photo; the other cakes none.
const isPhone = (name: string) => name === "phone";
const stage = (page: Page) => page.locator("[data-item]:not([hidden])");

test("the cake's own lines: back link, name, description, From", async ({
  page,
}) => {
  await page.goto("/cakes/the-lothian");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Lothian",
  );
  await expect(page.getByText("From £185")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "← Back to the range" }),
  ).toHaveAttribute("href", "/cakes");
});

test("desktop and tablet: arrows stop at the ends, thumbnails choose, the strip marks the active one", async ({
  page,
}, testInfo) => {
  test.skip(isPhone(testInfo.project.name), "phone swipes");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/the-lothian");
  const prev = page.getByRole("button", { name: "Previous photo or video" });
  const next = page.getByRole("button", { name: "Next photo or video" });
  await expect(prev).toBeDisabled();
  await expect(stage(page).locator("img")).toHaveAttribute(
    "alt",
    "Sample photo 1 of The Lothian",
  );
  await next.click();
  await expect(stage(page).locator("img")).toHaveAttribute(
    "alt",
    "Sample photo 2 of The Lothian",
  );
  const thumbs = page.getByRole("group", { name: "Choose a photo or video" });
  await thumbs.getByRole("button", { name: "Photo or video 4 of 4" }).click();
  await expect(next).toBeDisabled();
  await expect(
    thumbs.getByRole("button", { name: "Photo or video 4 of 4" }),
  ).toHaveAttribute("aria-current", "true");
  for (const b of [prev, next]) {
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("ANIM-22: a change cross-fades in 240 ms", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  await page.addInitScript(() => {
    const w = window as unknown as { __anims: string[] };
    w.__anims = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const o = (options ?? {}) as KeyframeAnimationOptions;
      w.__anims.push(`${o.duration} ${o.easing ?? "linear"}`);
      return original.call(this, frames, options);
    };
  });
  await page.goto("/cakes/the-lothian");
  await page.getByRole("button", { name: "Next photo or video" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __anims: string[] }).__anims),
    )
    .toContain("240 cubic-bezier(0.65, 0, 0.35, 1)");
});

test("the video plays muted and looping while active; a tap unmutes; moving on stops it", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes/the-lothian");
  const phone = isPhone(testInfo.project.name);
  if (phone)
    await page.getByRole("button", { name: "Photo or video 3 of 4" }).click();
  else
    await page
      .getByRole("group", { name: "Choose a photo or video" })
      .getByRole("button", { name: "Photo or video 3 of 4" })
      .click();
  const scope = phone ? page.locator("[data-slide]:not([inert])") : stage(page);
  const video = scope.locator("video").first();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), {
      timeout: 5000,
    })
    .toBe(true);
  expect(
    await video.evaluate((v: HTMLVideoElement) => [
      v.muted,
      v.loop,
      v.controls,
    ]),
  ).toEqual([true, true, false]);
  await scope.getByRole("button", { name: /^Unmute/ }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
  await scope.getByRole("button", { name: /^Mute/ }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  // Moving on stops it.
  if (phone)
    await page.getByRole("button", { name: "Photo or video 4 of 4" }).click();
  else await page.getByRole("button", { name: "Next photo or video" }).click();
  // Moving on stops it: no video plays anywhere on the page.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll("video")].filter((v) => !v.paused)
            .length,
      ),
    )
    .toBe(0);
});

test("reduced motion: the video shows a play button and does not autoplay", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/the-lothian");
  const phone = isPhone(testInfo.project.name);
  if (phone)
    await page.getByRole("button", { name: "Photo or video 3 of 4" }).click();
  else
    await page.getByRole("button", { name: "Next photo or video" }).click({
      clickCount: 1,
    });
  if (!phone)
    await page.getByRole("button", { name: "Next photo or video" }).click();
  const scope = phone ? page.locator("[data-slide]:not([inert])") : stage(page);
  const play = scope.getByRole("button", { name: /^Play/ });
  await expect(play).toBeVisible();
  await page.waitForTimeout(600);
  expect(
    await scope
      .locator("video")
      .first()
      .evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
  await play.click();
  await expect
    .poll(() =>
      scope
        .locator("video")
        .first()
        .evaluate((v: HTMLVideoElement) => !v.paused),
    )
    .toBe(true);
});

test("phone: swipe row with dashes and the hint; a swipe moves the dashes", async ({
  page,
}, testInfo) => {
  test.skip(!isPhone(testInfo.project.name), "phone only");
  await page.goto("/cakes/the-lothian");
  await expect(
    page.getByText("Swipe left or right for more photos and videos"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Photo or video 1 of 4" }),
  ).toHaveAttribute("aria-current", /true|step/);
  await page.locator("[data-row]").evaluate((r) => {
    r.scrollTo({ left: r.clientWidth, behavior: "instant" });
  });
  await expect(
    page.getByRole("button", { name: "Photo or video 2 of 4" }),
  ).toHaveAttribute("aria-current", /true|step/);
});

test("a one-photo cake has no arrows, thumbnails, dashes or hint", async ({
  page,
}) => {
  await page.goto("/cakes/bramble-and-cream");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bramble & Cream",
  );
  await expect(
    page.getByRole("button", { name: /photo or video/i }),
  ).toHaveCount(0);
  await expect(page.getByText("Swipe left or right")).toHaveCount(0);
  await expect(
    page.locator("img[alt='Sample photo of Bramble & Cream']").first(),
  ).toBeAttached();
});

test("a cake without photos shows the placeholder and no controls", async ({
  page,
}) => {
  await page.goto("/cakes/wee-beastie");
  await expect(
    page.getByRole("button", { name: /photo or video/i }),
  ).toHaveCount(0);
  await expect(page.locator("[class*=placeholder]").first()).toBeAttached();
});

test("axe: no violations; screenshots", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/the-lothian");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_cake-page.png`),
    fullPage: true,
  });
});
