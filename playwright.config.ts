import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

// The three reference viewports (CLAUDE.md §3, RESPONSIVE.md §1).
export const viewports = {
  phone: { width: 402, height: 902 },
  tablet: { width: 1024, height: 1366 },
  desktop: { width: 1280, height: 800 },
} as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        browserName: "chromium",
        viewport: viewports.phone,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "tablet",
      use: {
        browserName: "chromium",
        viewport: viewports.tablet,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: viewports.desktop },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
