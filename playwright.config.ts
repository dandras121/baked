import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

// The three reference viewports (CLAUDE.md §3, RESPONSIVE.md §1).
export const viewports = {
  phone: { width: 402, height: 902 },
  tablet: { width: 1024, height: 1366 },
  desktop: { width: 1280, height: 800 },
} as const;

// Every test starts with the cookie choice already made, so the bar (slice 1.5) does not cover what a
// test clicks. e2e/cookies.spec.ts starts empty to test the bar itself.
const consentGiven = {
  cookies: [
    {
      name: "bbl_consent",
      value: encodeURIComponent(
        JSON.stringify({
          v: 1,
          analytics: false,
          ts: new Date().toISOString(),
        }),
      ),
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 30 * 86_400,
      httpOnly: false,
      secure: true,
      sameSite: "Lax" as const,
    },
  ],
  origins: [],
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    storageState: consentGiven,
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
    // The hero's development-only placeholder slides, so the slider can be tested (slice 2.1).
    env: { BBL_HERO_PLACEHOLDERS: "1" },
  },
});
