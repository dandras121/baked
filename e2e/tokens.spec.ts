import { expect, test } from "@playwright/test";

// Slice 0.2: fonts are self-hosted and load; the token page lists every token.
test("fonts load from this site only, never from Google Fonts", async ({
  page,
  baseURL,
}) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.resourceType() === "font" ||
      /fonts\.(googleapis|gstatic)\.com/.test(request.url())
    ) {
      fontRequests.push(request.url());
    }
  });
  await page.goto("/dev/tokens");
  await page.evaluate(() => document.fonts.ready);

  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests)
    expect(url.startsWith(`${baseURL}/fonts/`)).toBe(true);

  const loaded = await page.evaluate(async () => {
    const faces = [
      "300 16px Fraunces",
      "italic 300 21px Fraunces",
      "500 14px Quicksand",
      "600 14px Quicksand",
      "300 13px Manrope",
    ];
    await Promise.all(faces.map((f) => document.fonts.load(f)));
    return faces.map((f) => [f, document.fonts.check(f)]);
  });
  for (const [face, ok] of loaded) expect(ok, String(face)).toBe(true);
});

test("the token page shows every token of tokens.css", async ({ page }) => {
  await page.goto("/dev/tokens");
  const summary = await page.getByText(/\(\d+ tokens\)/).textContent();
  const count = Number(/\((\d+) tokens\)/.exec(summary ?? "")?.[1]);
  expect(count).toBeGreaterThan(100);
  await expect(
    page.locator("main code").filter({ hasText: /^--/ }),
  ).toHaveCount(count);
});

test("body text uses Quicksand and headings use Fraunces", async ({ page }) => {
  await page.goto("/dev/tokens");
  const body = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  const heading = await page
    .locator("h1")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(body).toMatch(/^"?Quicksand/);
  expect(heading).toMatch(/^"?Fraunces/);
});
