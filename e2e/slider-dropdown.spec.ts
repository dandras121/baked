import { expect, test, type Locator, type Page } from "@playwright/test";

// Slice 0.5c: slider indicator (ANIM-10) and drop-down rows (ANIM-09).
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
const visibleDashes = (slider: Locator) =>
  slider.locator('button[data-index]:not([data-state="hidden"])');
const widths = (slider: Locator) =>
  visibleDashes(slider).evaluateAll((els) =>
    els.map((el) => Math.round((el as HTMLElement).offsetWidth)),
  );
const activePosition = (slider: Locator) =>
  visibleDashes(slider).evaluateAll(
    (els) =>
      els.findIndex((el) => el.getAttribute("aria-current") === "true") + 1,
  );

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/components");
});

test("ANIM-10: at most five dashes; the window holds until item 3, then keeps the active 3rd, then moves on to 4th and 5th", async ({
  page,
}) => {
  const slider = page.getByTestId("slider-8");
  const expected = [1, 2, 3, 3, 3, 3, 4, 5];
  for (let i = 0; i < 8; i++) {
    if (i > 0) await slider.getByTestId("next").click();
    await expect(slider.getByText(`Slide ${i + 1} of 8`)).toBeVisible();
    await expect(visibleDashes(slider)).toHaveCount(5);
    expect(await activePosition(slider), `slide ${i + 1}`).toBe(
      Math.min(expected[i], 5),
    );
  }
  await settled(page);
  expect(await widths(slider)).toEqual([19, 19, 19, 25, 37]);
});

test("ANIM-10: sizes 37 / 25 / 19, a dash press jumps there; the change takes 360 ms", async ({
  page,
}) => {
  const slider = page.getByTestId("slider-8");
  await settled(page);
  expect(await widths(slider)).toEqual([37, 25, 19, 19, 19]);
  await slider.getByRole("button", { name: "Slide 4 of 8" }).click();
  await expect(slider.getByText("Slide 4 of 8")).toBeVisible();
  const durations = await slider
    .locator("button[data-index]")
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(durations.split(",")[0].trim()).toBe("0.36s");
  await page.waitForTimeout(450);
  expect(await widths(slider)).toEqual([19, 25, 37, 25, 19]);
  await expect(
    slider.getByRole("button", { name: "Slide 4 of 8" }),
  ).toHaveAttribute("aria-current", "true");
});

test("ANIM-10: three items show three dashes; arrow keys move along (one tab stop)", async ({
  page,
}) => {
  const slider = page.getByTestId("slider-3");
  await expect(visibleDashes(slider)).toHaveCount(3);
  await slider.getByRole("button", { name: "Testimonial 1 of 3" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    slider.getByRole("button", { name: "Testimonial 2 of 3" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    slider.getByRole("button", { name: "Testimonial 2 of 3" }),
  ).toBeFocused();
  expect(await slider.locator('button[tabindex="0"]').count()).toBe(1);
});

test("ANIM-10: dark surface (lightbox) — 30 photos, five dashes, photo 14 in the middle", async ({
  page,
}) => {
  const slider = page.getByTestId("slider-dark");
  await expect(visibleDashes(slider)).toHaveCount(5);
  expect(await activePosition(slider)).toBe(3);
  const colour = await slider
    .locator('[aria-current="true"]')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(colour).toBe("rgb(247, 244, 250)");
});

test("§10.13 every dash has a 44 × 44 hit area", async ({ page }) => {
  const dash = page
    .getByTestId("slider-8")
    .getByRole("button", { name: "Slide 3 of 8" });
  await dash.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const b = (await dash.boundingBox())!;
  const hit = await page.evaluate(
    ([x, y]) =>
      (document.elementFromPoint(x, y) as HTMLElement)?.getAttribute(
        "aria-label",
      ),
    [b.x + b.width / 2, b.y + b.height / 2 + 20],
  );
  expect(hit).toBe("Slide 3 of 8");
});

test("ANIM-09: the first row is open; opening another closes it at the same time; the chevron turns over", async ({
  page,
}) => {
  const faq = page.getByTestId("faq");
  const first = faq.getByRole("button", { name: "Where do you deliver?" });
  const third = faq.getByRole("button", { name: "What if I am not in?" });
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await third.click();
  await expect(third).toHaveAttribute("aria-expanded", "true");
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(450);
  await expect(faq.getByText("Someone needs to be in.")).toBeVisible();
  const rotation = await third
    .locator("svg")
    .evaluate((el) => getComputedStyle(el).transform);
  expect(rotation).toMatch(/matrix3d\(1, 0, 0, 0, 0, -1/); // rotateX(180deg)
  const closedPanel = faq.locator(
    `#${await first.getAttribute("aria-controls")}`.replace(/:/g, "\\:"),
  );
  await expect(closedPanel).toHaveAttribute("hidden", "until-found");
});

test("ANIM-09: keyboard Enter opens and closes; 360 ms each way; reduced motion is instant", async ({
  page,
}) => {
  const faq = page.getByTestId("faq");
  const row = faq.getByRole("button", { name: "Can I collect instead?" });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(row).toHaveAttribute("aria-expanded", "true");
  const panelId = (await row.getAttribute("aria-controls"))!;
  const duration = await page.evaluate(
    (id) => getComputedStyle(document.getElementById(id)!).transitionDuration,
    panelId,
  );
  expect(duration).toBe("0.36s");
  await page.keyboard.press("Enter");
  await expect(row).toHaveAttribute("aria-expanded", "false");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const again = page
    .getByTestId("faq")
    .getByRole("button", { name: "Can I collect instead?" });
  await again.click();
  const id = (await again.getAttribute("aria-controls"))!;
  expect(
    await page.evaluate(
      (i) => getComputedStyle(document.getElementById(i)!).transitionDuration,
      id,
    ),
  ).toBe("0s");
});

test("ANIM-09: a #question link opens that row (on the same page)", async ({
  page,
}) => {
  await page.goto("/dev/components#what-if-i-am-not-in");
  await expect(
    page.getByRole("button", { name: "What if I am not in?" }),
  ).toHaveAttribute("aria-expanded", "true");
});

test("ANIM-09: a #question link opens that row (arriving from another page)", async ({
  page,
}) => {
  await page.goto("/dev");
  await page.goto("/dev/components#can-i-collect-instead");
  await expect(
    page.getByRole("button", { name: "Can I collect instead?" }),
  ).toHaveAttribute("aria-expanded", "true");
});
