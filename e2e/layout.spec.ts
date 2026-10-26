import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Slice 0.3: the bands switch exactly at 768 and 1120; widths follow RESPONSIVE §2–4.
// These tests set their own window sizes, so they run once (desktop project).
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "sets its own viewport");
});

const bands: [width: number, band: "Phone" | "Tablet" | "Desktop"][] = [
  [360, "Phone"],
  [402, "Phone"],
  [767, "Phone"],
  [768, "Tablet"],
  [820, "Tablet"],
  [1024, "Tablet"],
  [1119, "Tablet"],
  [1120, "Desktop"],
  [1200, "Desktop"],
  [1280, "Desktop"],
  [1600, "Desktop"],
];

for (const [width, band] of bands) {
  test(`R§1 at ${width} px the ${band} layout shows, with no sideways scroll`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/layout");
    await expect(page.getByTestId("band").locator("span:visible")).toHaveText(
      new RegExp(`^${band}`),
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}

const fontSize = (page: import("@playwright/test").Page, id: string) =>
  page.getByTestId(id).evaluate((el) => getComputedStyle(el).fontSize);

test("R§3.2 tablet type = max(0.8 × desktop, min(desktop, 14)); fixed at every tablet width (R§3.3)", async ({
  page,
}) => {
  const expected: Record<number, [string, string, string]> = {
    402: ["155px", "16px", "11px"],
    768: ["124px", "14px", "11px"],
    820: ["124px", "14px", "11px"],
    1024: ["124px", "14px", "11px"],
    1119: ["124px", "14px", "11px"],
    1120: ["155px", "16px", "11px"],
    1280: ["155px", "16px", "11px"],
  };
  for (const [width, [section, body, label]] of Object.entries(expected)) {
    await page.setViewportSize({ width: Number(width), height: 900 });
    await page.goto("/dev/layout");
    expect(await fontSize(page, "type-section"), `${width}`).toBe(section);
    expect(await fontSize(page, "type-body"), `${width}`).toBe(body);
    expect(await fontSize(page, "type-label"), `${width}`).toBe(label);
  }
});

test("R§2–4 horizontal sizes: 355 design px = 284 at 1024, fluid between, 355 from 1280", async ({
  page,
}) => {
  const cases: [number, number][] = [
    [768, 355 * (768 / 1280)],
    [1024, 284],
    [1200, 355 * (1200 / 1280)],
    [1280, 355],
    [1600, 355],
  ];
  for (const [width, expected] of cases) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/layout");
    const box = await page.getByTestId("ruler").boundingBox();
    expect(box!.width, `${width}`).toBeCloseTo(expected, 0);
  }
  await page.setViewportSize({ width: 402, height: 900 });
  await page.goto("/dev/layout");
  expect(
    (await page.getByTestId("ruler-phone").boundingBox())!.width,
  ).toBeCloseTo(274, 0);
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/dev/layout");
  expect(
    (await page.getByTestId("ruler-phone").boundingBox())!.width,
  ).toBeCloseTo((274 * 360) / 402, 0);
});

test("R§4 above 1280 the content stays 1280 and centred, the band runs edge to edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/dev/layout");
  const content = await page.locator("h1").locator("..").boundingBox();
  const band = await page.locator("h1").locator("../..").boundingBox();
  expect(content!.width).toBe(1280);
  expect(content!.x).toBe(160);
  expect(band!.width).toBe(1600);
});

test("R§1 the header slot is sticky on every band", async ({ page }) => {
  for (const width of [402, 1024, 1280]) {
    await page.setViewportSize({ width, height: 600 });
    await page.goto("/dev/layout");
    await page.mouse.wheel(0, 800);
    await expect
      .poll(() =>
        page
          .locator("header")
          .first()
          .boundingBox()
          .then((b) => b!.y),
      )
      .toBe(0);
    const height = await page
      .locator("header")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
    expect(height).toBe(width >= 1120 ? 77 : 55);
  }
});

test("screenshots at the seven widths, no accessibility violations", async ({
  page,
}, testInfo) => {
  for (const width of [402, 768, 1024, 1119, 1120, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/layout");
    await page.evaluate(() => document.fonts.ready);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations, `${width}`).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`layout-${width}.png`),
      fullPage: true,
    });
  }
});
