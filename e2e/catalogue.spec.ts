import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 3.2: the full range (§4.2). The seed holds the 14 cakes of the sample catalogue (3.1).
const cards = (page: Page) =>
  page.locator(
    "[role=list][aria-label=Designs] > [role=listitem]:not([data-hidden])",
  );
const names = (page: Page) => cards(page).locator("h3");
const pill = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Occasion" })
    .getByRole("button", { name, exact: true });
const more = (page: Page) =>
  page.getByRole("link", { name: /^Show the next \d+$/ });

test("title, the pills that have cakes, 12 cards in Linda's order, Showing 12 of 14", async ({
  page,
}) => {
  await page.goto("/cakes");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Browse\s*my recipes\./,
  );
  await expect(page).toHaveTitle(/^The full range — Baked by Linda$/);
  await expect(
    page.getByRole("group", { name: "Occasion" }).getByRole("button"),
  ).toHaveText([
    "All designs",
    "Birthdays",
    "Kids’ parties",
    "Weddings",
    "Corporate",
  ]);
  await expect(pill(page, "All designs")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(cards(page)).toHaveCount(12);
  await expect(names(page).first()).toHaveText("The Lothian");
  await expect(names(page).nth(11)).toHaveText("Midnight Berry");
  await expect(page.getByText("Showing 12 of 14")).toBeVisible();
  await expect(cards(page).first()).toContainText("From £185");
  // The six (desktop / tablet) or three (phone) placeholder slots are decorative.
  expect(
    await page.locator("header [aria-hidden][data-slot]:visible").count(),
  ).toBe(page.viewportSize()!.width < 768 ? 3 : 6);
});

test("columns: 2 on the phone, 3 on tablet and desktop; no sideways scroll", async ({
  page,
}) => {
  await page.goto("/cakes");
  const ys = await cards(page).evaluateAll((els) =>
    els.slice(0, 3).map((el) => Math.round(el.getBoundingClientRect().top)),
  );
  expect(ys.filter((y) => y === ys[0]).length).toBe(
    page.viewportSize()!.width < 768 ? 2 : 3,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("a pill filters in place and keeps ?occasion=; the count follows; All designs resets", async ({
  page,
}) => {
  await page.goto("/cakes");
  await pill(page, "Weddings").click();
  await expect(page).toHaveURL(/\/cakes\?occasion=weddings$/);
  await expect(pill(page, "Weddings")).toHaveAttribute("aria-pressed", "true");
  await expect(names(page)).toHaveText([
    "The Lothian",
    "Sugar Peony",
    "Almond & Rose",
    "Buttercream Bloom",
    "Tartan Ribbon",
    "Lemon & Elderflower",
    "Highland Heather",
  ]);
  await expect(page.getByText("Seven designs")).toBeVisible();
  await expect(more(page)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Or start a bespoke enquiry →" }),
  ).toHaveAttribute("href", "/bespoke");
  await pill(page, "All designs").click();
  await expect(page).toHaveURL(/\/cakes$/);
  await expect(cards(page)).toHaveCount(12);
});

test("Show the next 2: the rest rise in, focus on the first new card, ?shown=24, then the button goes", async ({
  page,
}) => {
  await page.goto("/cakes");
  await more(page).scrollIntoViewIfNeeded();
  await expect(more(page)).toHaveText("Show the next 2");
  await more(page).click();
  await expect(cards(page)).toHaveCount(14);
  await expect(page).toHaveURL(/\/cakes\?shown=24$/);
  await expect(page.getByText("Showing 14 of 14")).toBeVisible();
  await expect(more(page)).toHaveCount(0);
  await expect(
    cards(page)
      .nth(12)
      .getByRole("link", { name: "Highland Heather", exact: true }),
  ).toBeFocused();
  const anim = await cards(page)
    .nth(13)
    .evaluate((el) => {
      const t = el.getAnimations()[0]?.effect?.getComputedTiming();
      return [t?.duration, t?.delay];
    });
  expect(anim).toEqual([240, 40]);
});

test("a shared address opens with its occasion and pages; Back from a cake page returns to it", async ({
  page,
}) => {
  await page.goto("/cakes?occasion=birthdays&shown=24");
  await expect(pill(page, "Birthdays")).toHaveAttribute("aria-pressed", "true");
  const count = await cards(page).count();
  expect(count).toBeGreaterThan(0);
  await cards(page).first().getByRole("link", { name: /^View/ }).click();
  await expect(page).toHaveURL(/\/cakes\/the-lothian$/);
  await page.goBack();
  await expect(page).toHaveURL(/occasion=birthdays/);
  await expect(pill(page, "Birthdays")).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(count);
});

test("§4.2 an unknown ?occasion= shows All designs", async ({ page }) => {
  await page.goto("/cakes?occasion=nonsense");
  await expect(pill(page, "All designs")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(cards(page)).toHaveCount(12);
});

test("Texture band: the image at its drawn height on top, its last row below — never rescaled", async ({
  page,
}) => {
  await page.goto("/cakes");
  const band = page.locator("[role=list][aria-label=Designs]").locator("..");
  const before = await band.evaluate((el) => {
    const cs = getComputedStyle(el);
    return [cs.backgroundSize, cs.backgroundRepeat, cs.backgroundImage];
  });
  expect(before[1]).toBe("no-repeat, repeat-y");
  expect(before[2]).toMatch(
    /band-(desktop|phone)\.webp.*band-(desktop|phone)-row\.png/,
  );
  await more(page).click();
  await expect(cards(page)).toHaveCount(14);
  const after = await band.evaluate(
    (el) => getComputedStyle(el).backgroundSize,
  );
  expect(after).toBe(before[0]);
});

test("axe: no violations, with every card shown", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes?shown=24");
  await expect(cards(page)).toHaveCount(14);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_catalogue.png`),
    fullPage: true,
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every design shows; no pills or paging", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one browser is enough");
    await page.goto("/cakes");
    await expect(
      page.locator("[role=list][aria-label=Designs] > [role=listitem]"),
    ).toHaveCount(14);
    await expect(page.locator("[role=listitem]").last()).toBeVisible();
    await expect(page.getByRole("group", { name: "Occasion" })).toBeHidden();
  });
});

// Slice 3.3: the search field and the result motion (§4.2, ANIM-05, ANIM-16).
const field = (page: Page) =>
  page.getByRole("searchbox", { name: "Search the cakes" });

test("search: live from 2 characters, after 250 ms, ?q= kept, the count names the word", async ({
  page,
}) => {
  await page.goto("/cakes");
  await expect(page.getByRole("search")).toBeVisible();
  await expect(field(page)).toHaveAttribute(
    "placeholder",
    "Search by name or flavour",
  );
  await field(page).fill("r");
  await page.waitForTimeout(400);
  await expect(cards(page)).toHaveCount(12);
  await field(page).fill("rose");
  await expect(names(page)).toHaveText(["Almond & Rose"]);
  await expect(page).toHaveURL(/\/cakes\?q=rose$/);
  await expect(page.getByText("1 design for “rose”")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Or start a bespoke enquiry →" }),
  ).toBeVisible();
});

test("search: name matches first, then the rest; every word must match; accents ignored", async ({
  page,
}) => {
  await page.goto("/cakes");
  await field(page).fill("SEA salt");
  await expect(names(page)).toHaveText(["Cocoa & Sea Salt"]);
  await field(page).fill("raspberry lothian");
  await expect(names(page)).toHaveText(["The Lothian"]);
});

test("search inside the pill; changing the pill keeps the text; × clears and keeps focus", async ({
  page,
}) => {
  await page.goto("/cakes");
  await pill(page, "Corporate").click();
  await field(page).fill("ribbon");
  await expect(names(page)).toHaveText(["Tartan Ribbon"]);
  await expect(page).toHaveURL(/occasion=corporate&q=ribbon/);
  await pill(page, "Kids’ parties").click();
  await expect(field(page)).toHaveValue("ribbon");
  await expect(
    page.getByRole("heading", { name: "No designs match “ribbon”" }),
  ).toBeVisible();
  // Search all designs switches to All designs and keeps the text.
  await page.getByRole("button", { name: "Search all designs" }).click();
  await expect(pill(page, "All designs")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(names(page)).toHaveText(["Tartan Ribbon"]);
  await page.getByRole("button", { name: "Clear the search" }).click();
  await expect(field(page)).toHaveValue("");
  await expect(field(page)).toBeFocused();
  await expect(cards(page)).toHaveCount(12);
});

test("nothing found: the heading, the advice, no “Search all designs” under All designs, bespoke link; Esc clears", async ({
  page,
}) => {
  await page.goto("/cakes");
  await field(page).fill("zzz");
  await expect(
    page.getByRole("heading", { name: "No designs match “zzz”" }),
  ).toBeVisible();
  await expect(
    page.getByText("Try another word, or ask me for it as a bespoke cake."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search all designs" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Start a bespoke enquiry" }).last(),
  ).toHaveAttribute("href", "/bespoke");
  await expect(
    page.getByRole("status").filter({ hasText: "No designs match" }),
  ).toHaveCount(1);
  await field(page).press("Escape");
  await expect(field(page)).toHaveValue("");
  await expect(field(page)).toBeFocused();
  await expect(cards(page)).toHaveCount(12);
});

test("a shared ?q= address opens with the result", async ({ page }) => {
  await page.goto("/cakes?q=peony");
  await expect(field(page)).toHaveValue("peony");
  await expect(names(page)).toHaveText(["Sugar Peony"]);
});

test("ANIM-16: leaving cards fade 0–120, staying move 80–320, new fade in 160–320", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  await page.goto("/cakes");
  await pill(page, "Weddings").click();
  const timings = await page.evaluate(() =>
    document
      .querySelector("[role=list][aria-label=Designs]")!
      .getAnimations({ subtree: true })
      .map((a) => {
        const t = a.effect!.getComputedTiming();
        return `${t.delay}+${t.duration}`;
      }),
  );
  expect(timings).toContain("0+120"); // leaving
  expect(timings).toContain("80+240"); // staying, moved
  await pill(page, "All designs").click();
  const back = await page.evaluate(() =>
    document
      .querySelector("[role=list][aria-label=Designs]")!
      .getAnimations({ subtree: true })
      .map(
        (a) =>
          `${a.effect!.getComputedTiming().delay}+${a.effect!.getComputedTiming().duration}`,
      ),
  );
  expect(back).toContain("160+160"); // entering
});

test("ANIM-16 reduced motion: the result changes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes");
  await pill(page, "Weddings").click();
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[role=list][aria-label=Designs]")!
          .getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await expect(cards(page)).toHaveCount(7);
});

test("axe: no violations while searching and when nothing is found", async ({
  page,
}, testInfo) => {
  await page.goto("/cakes");
  await field(page).fill("choc");
  await page.waitForTimeout(800);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_search.png`),
  });
  await field(page).fill("zzz");
  await page.waitForTimeout(800);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_none.png`),
  });
});
