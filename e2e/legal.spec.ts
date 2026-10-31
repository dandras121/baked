import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LEGAL_SEED } from "../src/lib/legal-seed";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 2.6: the seven legal pages (§4.5).
const route = (slug: string) => `/${slug}`;

for (const page of LEGAL_SEED) {
  test(`${route(page.slug)}: title, last updated, numbered sections, Settings values, contact line`, async ({
    page: p,
  }) => {
    await p.goto(route(page.slug));
    await expect(p.getByRole("heading", { level: 1 })).toHaveText(page.title);
    await expect(p).toHaveTitle(`${page.title} — Baked by Linda`);
    await expect(
      p.getByText(/^Last updated \d{1,2} [A-Z][a-z]+ \d{4}$/),
    ).toBeVisible();
    const sections = p.locator("article section h2");
    const n = (page.body.match(/^## /gm) ?? []).length;
    await expect(sections).toHaveCount(n);
    await expect(sections.first()).toHaveText(/^1 · /);
    await expect(
      p.getByRole("navigation", { name: "On this page" }).getByRole("link"),
    ).toHaveCount(n);
    expect(await p.locator("article").innerText()).not.toMatch(/\{[a-z_]+\}/);
    await expect(
      p.locator("article").getByRole("link", { name: S.email }).last(),
    ).toHaveAttribute("href", `mailto:${S.email}`);
    await expect(
      p.locator("article").getByRole("link", { name: S.phone }).last(),
    ).toHaveAttribute("href", `tel:${S.phone.replace(/\s/g, "")}`);
  });
}

test("“On this page”: a jump scrolls to the section, updates the address and moves the focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/terms");
  await page
    .getByRole("link", { name: "10 · If something goes wrong" })
    .click();
  await expect(page).toHaveURL(/#if-something-goes-wrong$/);
  const heading = page.getByRole("heading", {
    name: "10 · If something goes wrong",
  });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
});

test("Cookie policy: the fixed #changing-your-mind and the preferences link opens the cookie panel", async ({
  page,
}) => {
  await page.goto("/cookies#changing-your-mind");
  await expect(page.locator("#changing-your-mind")).toHaveText(
    "5 · Changing your mind",
  );
  await page
    .locator("article")
    .getByRole("button", { name: "cookie preferences" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cookie settings" }),
  ).toBeVisible();
});

test("Privacy: ico.org.uk opens in a new tab, its number is a phone link", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("link", { name: /ico\.org\.uk/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.getByRole("link", { name: "0303 123 1113" }),
  ).toHaveAttribute("href", "tel:+443031231113");
});

test("legal pages: axe, no horizontal scroll", async ({ page }) => {
  for (const slug of ["terms", "cookies"]) {
    await page.goto(route(slug));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations, slug).toEqual([]);
  }
});
