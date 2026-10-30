import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 1.6: 404, 500, titles, robots.txt, sitemap, noindex (SITE-FLOWS §2, §4.6, §4.7, §10.12).

test("§4.6 an unknown address returns HTTP 404 with the 404 page, the header and the footer", async ({
  page,
}) => {
  const response = await page.goto("/this-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found — Baked by Linda");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /This page\s*has been eaten\./,
  );
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.getByTestId("site-header")).toBeVisible();
  await expect(page.locator("footer")).toContainText(S.addressLine);
  const main = page.locator("main");
  await expect(main).toContainText("your answers are kept for a day.");
  await expect(
    main.getByRole("link", { name: "Back to home" }),
  ).toHaveAttribute("href", "/");
  await expect(
    main.getByRole("link", { name: "Browse the designs" }).first(),
  ).toHaveAttribute("href", "/cakes");
  await expect(main.getByRole("link", { name: S.email })).toHaveAttribute(
    "href",
    `mailto:${S.email}`,
  );
});

test("§4.6 deeper unknown addresses are 404 too (a cake that does not exist, a token page)", async ({
  page,
}) => {
  for (const path of [
    "/cakes/not-a-cake",
    "/my-order/unknown-token",
    "/order/when",
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("§4.7 the 500 page (preview): Back to home, Call {phone}, Email {e-mail} from Settings", async ({
  page,
}, testInfo) => {
  await page.goto("/dev/error-500");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Something\s*went wrong\./,
  );
  const main = page.locator("main");
  await expect(main).toContainText("nothing was sent or charged");
  const call = main.getByRole("link", { name: `Call ${S.phone}` });
  await expect(call.first()).toHaveAttribute("href", "tel:+447884199103");
  // Desktop / tablet: an outlined button; phone: a text link (1608:10885).
  await expect(call.locator("visible=true")).toHaveCount(1);
  await expect(main.getByRole("link", { name: S.email })).toHaveAttribute(
    "href",
    `mailto:${S.email}`,
  );
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_500.png`),
  });
});

test("§4.7 the 500 page needs no database: phone and e-mail are written at build time", async ({
  request,
}) => {
  const facts = await (await request.get("/site-facts.json")).json();
  expect(facts).toEqual({ email: S.email, phone: S.phone });
});

test("§10.12 titles: “{Page} — Baked by Linda”; Home its own title and the tagline as description", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(
    "Baked by Linda — Celebration cakes in West Lothian",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    `Bespoke celebration cakes, made by hand in West Lothian and delivered across ${S.deliveryArea}.`,
  );
  for (const [path, title] of [
    ["/cakes", "The full range"],
    ["/gallery", "Gallery"],
    ["/about", "About Linda"],
    ["/faq", "FAQ"],
    ["/contact", "Contact"],
    ["/bespoke", "Bespoke enquiry"],
    ["/terms", "Terms and conditions"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} — Baked by Linda`);
  }
});

test("§10.12 robots.txt and the sitemap skeleton (§2 Index = yes only)", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of [
    "/cakes",
    "/bespoke",
    "/gallery",
    "/about",
    "/faq",
    "/contact",
    "/terms",
    "/allergens",
  ])
    expect(sitemap).toContain(`${path}</loc>`);
  for (const path of [
    "/order",
    "/my-order",
    "/bespoke/sent",
    "/contact/sent",
    "/admin",
    "/dev",
  ])
    expect(sitemap).not.toContain(`${path}</loc>`);
});

test("§2 / §10.5 private pages send noindex; token pages also no referrer", async ({
  request,
}) => {
  for (const path of [
    "/order/when",
    "/bespoke/sent",
    "/contact/sent",
    "/admin",
    "/dev",
  ]) {
    const r = await request.get(path);
    expect(r.headers()["x-robots-tag"], path).toContain("noindex");
  }
  for (const path of [
    "/my-order/abc",
    "/pay/abc",
    "/delivery/abc",
    "/unsubscribe/abc",
    "/my-enquiry/abc",
  ]) {
    const r = await request.get(path);
    expect(r.headers()["x-robots-tag"], path).toContain("noindex");
    expect(r.headers()["referrer-policy"], path).toBe("no-referrer");
  }
  const home = await request.get("/");
  expect(home.headers()["x-robots-tag"]).toBeUndefined();
});

test("axe: the 404 page has no violations", async ({ page }) => {
  await page.goto("/this-does-not-exist");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
