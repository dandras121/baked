import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 1.1: desktop header and navigation, current item reloads, ANIM-24 shadow.
// No underline in the navigation (Bohoka 2026-10-29; DEVIATIONS).

const isDesktop = (name: string) => name === "desktop";

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const item = (page: Page, name: string) =>
  nav(page).getByRole("link", { name, exact: true });
const animationsInNav = (page: Page) =>
  nav(page).evaluate(
    (el) =>
      el.getAnimations({ subtree: true }).filter((a) => {
        const t = (a.effect as KeyframeEffect).target as Element;
        return !t.hasAttribute("data-pressable-content");
      }).length,
  );

test.describe("desktop navigation", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !isDesktop(testInfo.project.name),
      "desktop navigation is ≥ 1120 px",
    );
  });

  const routes: [string, string | null][] = [
    ["/", "Home"],
    ["/cakes", "Cakes"],
    ["/bespoke", "Bespoke"],
    ["/gallery", "Gallery"],
    ["/about", "About Linda"],
    ["/faq", "FAQ"],
    ["/contact", "Contact"],
    ["/terms", null],
  ];

  for (const [path, active] of routes) {
    test(`A§3.3 ${path}: ${active ?? "no"} item is SemiBold and aria-current, no underline`, async ({
      page,
    }) => {
      await page.goto(path);
      const current = nav(page).locator('[aria-current="page"]');
      expect(await nav(page).locator("span[aria-hidden]").count()).toBe(0);
      if (!active) {
        await expect(current).toHaveCount(0);
        await expect(nav(page).locator("[data-bold]")).toHaveCount(0);
        return;
      }
      await expect(current).toHaveText(active);
      await expect(item(page, active)).toHaveCSS("font-weight", "600");
      await expect(item(page, active)).toHaveCSS(
        "text-decoration-line",
        "none",
      );
    });
  }

  test("A§8 the group's right edge sits at x 1243, items 32 px apart, header 77 px", async ({
    page,
  }) => {
    await page.goto("/gallery");
    const box = (await nav(page).boundingBox())!;
    expect(box.x + box.width).toBeCloseTo(1243, 0);
    expect(box.width).toBeCloseTo(539, 0);
    expect(box.y).toBeCloseTo(30, 0);
    const header = (await page.getByTestId("site-header").boundingBox())!;
    expect(header.height).toBe(77);
    await expect(item(page, "Home")).toHaveCSS("font-weight", "500");
  });

  test("clicking another item opens its page; the weight moves with it and nothing shifts", async ({
    page,
  }) => {
    await page.goto("/cakes");
    const before = await nav(page)
      .locator("li")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
    await item(page, "About Linda").click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(item(page, "About Linda")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(item(page, "About Linda")).toHaveCSS("font-weight", "600");
    await expect(item(page, "Cakes")).toHaveCSS("font-weight", "500");
    const after = await nav(page)
      .locator("li")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
    expect(after).toEqual(before);
    expect(await animationsInNav(page)).toBe(0);
  });

  test("the selected state changes softly: the weight moves at the click over 200 ms ease-out", async ({
    page,
  }) => {
    await page.goto("/faq");
    await expect(item(page, "Home")).toHaveCSS(
      "transition",
      /font-weight 0\.2s cubic-bezier\(0\.33, 1, 0\.68, 1\)/,
    );
    await item(page, "Home").click();
    // The new item gets the selected state at once (no 210 ms wait any more) …
    await expect(item(page, "Home")).toHaveAttribute("data-bold", "", {
      timeout: 150,
    });
    await expect(item(page, "FAQ")).not.toHaveAttribute("data-bold");
    // … and its weight passes through values between 500 and 600 on the way.
    await expect(page).toHaveURL(/\/$/);
    await expect(item(page, "Home")).toHaveCSS("font-weight", "600");
  });

  test("A§7F the current item reloads the page: fresh and at the top", async ({
    page,
  }) => {
    await page.goto("/faq");
    await page.evaluate(() => {
      (window as unknown as { marker: number }).marker = 1;
      window.scrollTo(0, 400);
    });
    await item(page, "FAQ").click();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { marker?: number }).marker),
      )
      .toBeUndefined();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveURL(/\/faq$/);
  });

  test("A§7F the current item clears filters and search in the address (reload without the query)", async ({
    page,
  }) => {
    await page.goto("/cakes?filter=birthday&q=lemon");
    await item(page, "Cakes").click();
    await expect(page).toHaveURL(/\/cakes$/);
  });

  test("A§7F Back / forward: the SemiBold item follows the page", async ({
    page,
  }) => {
    await page.goto("/cakes");
    await item(page, "FAQ").click();
    await expect(page).toHaveURL(/\/faq$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/cakes$/);
    await expect(item(page, "Cakes")).toHaveAttribute("aria-current", "page");
    await expect(item(page, "Cakes")).toHaveCSS("font-weight", "600");
    await expect(item(page, "FAQ")).toHaveCSS("font-weight", "500");
  });

  test("A§1.4 reduced motion: the weight switches at once", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cakes");
    await item(page, "Contact").click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(item(page, "Contact")).toHaveCSS("font-weight", "600");
  });

  test("ANIM-07: hover grows the item's text 15 %", async ({ page }) => {
    await page.goto("/gallery");
    await item(page, "Gallery").hover();
    await expect
      .poll(() =>
        item(page, "Gallery")
          .locator("[data-pressable-content]")
          .evaluate((el) => getComputedStyle(el).transform),
      )
      .toBe("matrix(1.15, 0, 0, 1.15, 0, 0)");
  });

  test("§10.13 every item has a 44 × 44 hit area (FAQ, the narrowest)", async ({
    page,
  }) => {
    await page.goto("/gallery");
    const b = (await item(page, "FAQ").boundingBox())!;
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent,
      [b.x + b.width / 2 - 21, b.y + b.height / 2 + 20],
    );
    expect(hit).toBe("FAQ");
  });

  test("keyboard: skip link first, then the logo and the seven items with a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/gallery");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(
      page
        .getByTestId("site-header")
        .getByRole("link", { name: "Baked by Linda" }),
    ).toBeFocused();
    for (const name of [
      "Home",
      "Cakes",
      "Bespoke",
      "Gallery",
      "About Linda",
      "FAQ",
      "Contact",
    ]) {
      await page.keyboard.press("Tab");
      await expect(item(page, name)).toBeFocused();
      await expect(item(page, name)).toHaveCSS("outline-style", "solid");
    }
    // The skip link moves focus to the page content.
    await page.goto("/gallery");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});

test.describe("every width", () => {
  test("§3.1 the header is sticky; the logo goes Home", async ({ page }) => {
    await page.goto("/gallery");
    await page.evaluate(() => window.scrollTo(0, 600));
    const box = (await page.getByTestId("site-header").boundingBox())!;
    expect(box.y).toBe(0);
    await page
      .getByTestId("site-header")
      .getByRole("link", { name: "Baked by Linda" })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("ANIM-24: the shadow shows only past scroll 0 (200 ms fade), size and colour never change", async ({
    page,
  }) => {
    await page.goto("/gallery");
    const header = page.getByTestId("site-header");
    const shadow = header.locator("span[aria-hidden]").first();
    const size0 = await header.boundingBox();
    await expect(header).not.toHaveAttribute("data-scrolled");
    await expect(shadow).toHaveCSS("opacity", "0");
    await expect(shadow).toHaveCSS("transition-duration", "0.2s");
    await expect(shadow).toHaveCSS(
      "box-shadow",
      "rgba(36, 27, 51, 0.1) 0px 4px 16px 0px",
    );
    await page.evaluate(() => window.scrollTo(0, 1));
    await expect(header).toHaveAttribute("data-scrolled", "");
    await expect(shadow).toHaveCSS("opacity", "1");
    expect(await header.boundingBox()).toEqual(size0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).not.toHaveAttribute("data-scrolled");
    await expect(shadow).toHaveCSS("opacity", "0");
  });

  test("R§1 below 1120 px the desktop navigation is not shown; header 55 px", async ({
    page,
  }, testInfo) => {
    test.skip(isDesktop(testInfo.project.name), "phone and tablet only");
    await page.goto("/gallery");
    await expect(nav(page)).toBeHidden();
    const header = (await page.getByTestId("site-header").boundingBox())!;
    expect(header.height).toBe(55);
  });

  test("axe: no violations on a page with the header (and the 404-free favicon)", async ({
    page,
    request,
  }, testInfo) => {
    await page.goto("/gallery");
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    expect((await request.get("/favicon.ico")).status()).toBe(200);
    await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}_header.png`),
      clip: { x: 0, y: 0, width: page.viewportSize()!.width, height: 120 },
    });
  });
});

test("narrow phones: the wordmark keeps clear of “menu ›”", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "phone header");
  for (const width of [360, 375, 390, 402]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const mark = (await page
      .getByTestId("site-header")
      .getByRole("link", { name: "Baked by Linda" })
      .boundingBox())!;
    const menu = (await page
      .getByRole("button", { name: /menu/i })
      .boundingBox())!;
    expect(mark.x + mark.width, `${width}px`).toBeLessThanOrEqual(menu.x - 8);
  }
});
