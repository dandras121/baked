import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signIn } from "./admin-helpers";

// Slice 8.2: the admin frame (§9.1), More, the home-screen prompt and offline line (§9.17).
const DESKTOP = { width: 1280, height: 820 };
const PHONE = { width: 402, height: 874 };

test("desktop: the sidebar with every place, the active one marked, the footer with sign out", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await signIn(page, "Linda");
  const side = page.getByRole("complementary", { name: "Admin" });
  await expect(side.getByRole("navigation").getByRole("link")).toHaveText([
    "Today",
    "Orders",
    "Money",
    "Enquiries",
    "Cakes",
    "Availability",
    "Content",
    "Gallery",
    "Google reviews",
    "Emails",
    "Settings",
    "Team",
  ]);
  await expect(
    side.getByRole("link", { name: "Today", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await side.getByRole("link", { name: "Cakes", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/cakes$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cakes" }),
  ).toBeVisible();
  await expect(
    side.getByRole("link", { name: "Cakes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(side.getByText("Owner ·")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.2/desktop-1280.png" });
  await side.getByRole("button", { name: "sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
});

test("a Helper sees Today and Orders only; an owner-only place sends them to Today", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await signIn(page, "Fiona", "helper");
  const side = page.getByRole("complementary", { name: "Admin" });
  await expect(side.getByRole("navigation").getByRole("link")).toHaveText([
    "Today",
    "Orders",
  ]);
  await expect(side.getByText("Helper ·")).toBeVisible();
  await page.goto("/admin/cakes");
  await expect(page).toHaveURL(/\/admin\/today\?for=owner$/);
  await expect(page.getByText("That page is for the owner.")).toBeVisible();
  await page.setViewportSize(PHONE);
  await page.goto("/admin/more");
  await expect(
    page.getByRole("navigation", { name: "Admin" }).getByRole("link"),
  ).toHaveText(["Today", "Orders", "More"]);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Money/ })).toHaveCount(0);
});

test("phone: top bar, tab bar, More with its numbers; the home-screen prompt once; offline line", async ({
  page,
  context,
}) => {
  await page.setViewportSize(PHONE);
  await signIn(page, "Linda", "owner", true);
  // The prompt shows once on a phone that has not installed the admin.
  const prompt = page.getByRole("dialog", {
    name: "Put it on your home screen",
  });
  await expect(prompt).toBeVisible();
  await page.screenshot({ path: ".shots/8.2/prompt-402.png" });
  await prompt.getByRole("button", { name: "Show me how" }).click();
  await expect(
    prompt.getByText(/After thirty days the site asks you to sign in again/),
  ).toBeVisible();
  await prompt.getByRole("button", { name: "Not now" }).click();
  await expect(prompt).toHaveCount(0);
  await page.reload();
  await expect(prompt).toHaveCount(0);

  const tabs = page.getByRole("navigation", { name: "Admin" });
  await expect(tabs.getByRole("link")).toHaveText([
    "Today",
    "Orders",
    "Cakes",
    "More",
  ]);
  await expect(tabs.getByRole("link", { name: "Today" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await tabs.getByRole("link", { name: "More" }).click();
  await expect(page.getByRole("heading", { name: "More" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "More" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("link", { name: /^Enquiries \d+ waiting/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Team \d+ (person|people)/ }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.2/more-402.png", fullPage: true });
  await page.getByRole("link", { name: /^Money/ }).click();
  await expect(tabs.getByRole("link", { name: "More" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await context.setOffline(true);
  await expect(
    page.getByText("You’re offline — nothing can be saved until you’re back."),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("You’re offline")).toHaveCount(0);
});

test("the home-screen app manifest", async ({ request }) => {
  const r = await request.get("/admin/manifest.webmanifest");
  expect(await r.json()).toMatchObject({
    name: "Baked by Linda admin",
    start_url: "/admin/today",
    display: "standalone",
  });
});
