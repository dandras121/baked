import { expect, test } from "@playwright/test";

// Bohoka 2026-11-04: “sometimes the search does not show on /cakes and the menu does not open”. A page left open
// while a new version went live asks for script parts that are gone, and nothing on it reacts. When a script part
// fails to load, the page reloads once and works.
test("a script part that fails to load: the page reloads once and works", async ({
  page,
}) => {
  let broken = false;
  await page.route("**/_next/static/chunks/*.js", (route) => {
    if (broken) return route.continue();
    broken = true;
    return route.fulfill({
      status: 404,
      contentType: "text/html",
      body: "<html>gone</html>",
    });
  });
  await page.goto("/cakes");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            performance.getEntriesByType(
              "navigation",
            )[0] as PerformanceNavigationTiming
          ).type,
      ),
    )
    .toBe("reload");
  await expect(page.getByRole("searchbox").first()).toBeVisible();
});

test("touch screens: no ‹ › arrows under the Home sliders, the dashes stay", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 1024 },
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /^Review 1 of/ }).first(),
  ).toBeVisible();
  for (const name of [
    "Previous review",
    "Next review",
    "Previous cakes",
    "Next cakes",
  ])
    await expect(page.getByRole("button", { name })).toBeHidden();
  await ctx.close();
});
