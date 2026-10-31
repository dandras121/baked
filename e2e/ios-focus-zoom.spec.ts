import { expect, test } from "@playwright/test";

// Bohoka 2026-10-31: on the iPad, tapping the search zoomed the page in and left it cut off. iOS only: the
// viewport gets maximum-scale=1 (iOS still allows pinch zoom); everywhere else the page stays freely zoomable.
test.describe("iOS", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  test("no focus zoom", async ({ page }) => {
    await page.goto("/cakes");
    // Next adds a second viewport tag on the client; every one must carry the limit.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll('meta[name="viewport"]')].every((m) =>
            (m as HTMLMetaElement).content.includes("maximum-scale=1"),
          ),
        ),
      )
      .toBe(true);
  });
});

test("other browsers keep zoom free", async ({ page }) => {
  await page.goto("/cakes");
  await page.waitForLoadState("networkidle");
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('meta[name="viewport"]')].some((m) =>
        (m as HTMLMetaElement).content.includes("maximum-scale"),
      ),
    ),
  ).toBe(false);
});
