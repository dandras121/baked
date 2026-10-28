import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Slice 0.1 smoke test: the app starts and its first pages render without accessibility violations.
const pages = [
  { path: "/", heading: "Home" },
  { path: "/dev", heading: "Developer pages" },
  { path: "/dev/tokens", heading: "Design tokens" },
  { path: "/dev/layout", heading: "Layout and breakpoints" },
  { path: "/dev/motion", heading: "Interaction and motion" },
  { path: "/dev/components", heading: "Base components" },
];

for (const { path, heading } of pages) {
  test(`${path} renders`, async ({ page }, testInfo) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath(
        `${testInfo.project.name}${path.replaceAll("/", "_")}.png`,
      ),
      fullPage: true,
    });
  });
}

test("/dev is not indexed", async ({ page }) => {
  await page.goto("/dev");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
