import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import data from "../src/motion/keyframes.json";

// Slice 1.1: desktop header, navigation (STYLE-01, ANIM-08), current item reloads, ANIM-24 shadow.

const isDesktop = (name: string) => name === "desktop";

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const item = (page: Page, name: string) =>
  nav(page).getByRole("link", { name, exact: true });
const underline = (page: Page) => page.getByTestId("nav-underline");

/** The underline's edges and the item's box, both relative to the navigation. */
async function edges(page: Page, name?: string) {
  return page.evaluate((label) => {
    const navEl = document.querySelector('nav[aria-label="Main"]')!;
    const n = navEl.getBoundingClientRect();
    const u = document
      .querySelector('[data-testid="nav-underline"]')!
      .getBoundingClientRect();
    const link = label
      ? [...navEl.querySelectorAll("a")].find((a) => a.textContent === label)!
      : null;
    const li = link?.parentElement?.getBoundingClientRect();
    return {
      line: { left: u.left - n.left, right: u.right - n.left, top: u.top },
      item: li ? { left: li.left - n.left, right: li.right - n.left } : null,
    };
  }, name);
}

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
    test(`A§3.3 ${path}: ${active ?? "no"} item is underlined and aria-current`, async ({
      page,
    }) => {
      await page.goto(path);
      const current = nav(page).locator('[aria-current="page"]');
      if (!active) {
        await expect(current).toHaveCount(0);
        await expect(underline(page)).toBeHidden();
        return;
      }
      await expect(current).toHaveText(active);
      const e = await edges(page, active);
      expect(e.line.left).toBeCloseTo(e.item!.left, 0);
      expect(e.line.right).toBeCloseTo(e.item!.right, 0);
      // STYLE-01: 2 px high, 2 px below the 18 px text box, accent with the lilac glow, SemiBold.
      const style = await underline(page).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.height, s.top, s.backgroundColor, s.boxShadow];
      });
      expect(style).toEqual([
        "2px",
        "20px",
        "rgb(122, 87, 194)",
        "rgb(201, 167, 232) 0px 0px 5.7px 0px",
      ]);
      await expect(item(page, active)).toHaveCSS("font-weight", "600");
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

  test("ANIM-08: clicking another item slides the underline along the A§12 rows, then the page changes", async ({
    page,
  }) => {
    await page.goto("/cakes");
    await item(page, "About Linda").click();
    // Freeze the running slide and read the edges at each sampled row.
    const samples = await underline(page).evaluate((el) => {
      const anim = el.getAnimations()[0];
      anim.pause();
      const nav = el.parentElement!.getBoundingClientRect();
      const out: [number, number, number][] = [];
      for (const t of [0, 60, 120, 180, 240, 300, 360, 419.9]) {
        anim.currentTime = t;
        const r = el.getBoundingClientRect();
        out.push([t, r.left - nav.left, r.right - nav.left]);
      }
      const duration = anim.effect!.getComputedTiming().duration;
      anim.play();
      return { out, duration };
    });
    expect(samples.duration).toBe(data.navUnderlineSlide.durationMs);
    // Cakes 72–112 → About Linda 313–394 inside the group (A§7F example minus x 704).
    const from = { left: 72, right: 112 };
    const to = { left: 313, right: 394 };
    data.navUnderlineSlide.rows.forEach(([, lead, trail], i) => {
      const [, left, right] = samples.out[i];
      expect(left).toBeCloseTo(from.left + (to.left - from.left) * trail, 0);
      expect(right).toBeCloseTo(from.right + (to.right - from.right) * lead, 0);
    });
    await expect(page).toHaveURL(/\/about$/);
    await expect(item(page, "About Linda")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(item(page, "About Linda")).toHaveCSS("font-weight", "600");
    await expect(item(page, "Cakes")).toHaveCSS("font-weight", "500");
    await expect
      .poll(() => underline(page).evaluate((el) => el.getAnimations().length))
      .toBe(0);
    const e = await edges(page, "About Linda");
    expect(e.line.left).toBeCloseTo(e.item!.left, 0);
    expect(e.line.right).toBeCloseTo(e.item!.right, 0);
  });

  test("ANIM-08: the weight switches at 210 ms, not before", async ({
    page,
  }) => {
    await page.goto("/faq");
    await page.evaluate(() => {
      const w = window as unknown as { up?: number; bold?: number };
      const home = [
        ...document.querySelectorAll('nav[aria-label="Main"] a'),
      ].find((x) => x.textContent === "Home")!;
      document.addEventListener(
        "click",
        () => (w.up = performance.now()),
        true,
      );
      new MutationObserver(() => {
        if (home.hasAttribute("data-bold") && w.bold === undefined)
          w.bold = performance.now();
      }).observe(home, { attributes: true });
    });
    await item(page, "Home").click();
    const delta = await page.waitForFunction(() => {
      const w = window as unknown as { up?: number; bold?: number };
      return w.bold !== undefined && w.up !== undefined ? w.bold - w.up : null;
    });
    const ms = (await delta.jsonValue()) as number;
    expect(ms).toBeGreaterThan(190);
    expect(ms).toBeLessThan(400);
  });

  test("ANIM-08: from a page with no active item the line draws at the new item, 2 px → full in 200 ms", async ({
    page,
  }) => {
    await page.goto("/terms");
    await item(page, "FAQ").click();
    const timing = await underline(page).evaluate((el) => {
      const a = el.getAnimations()[0];
      a.pause();
      a.currentTime = 0;
      const w0 = el.getBoundingClientRect().width;
      return { w0, duration: a.effect!.getComputedTiming().duration };
    });
    expect(timing.w0).toBeCloseTo(2, 0);
    expect(timing.duration).toBe(200);
    await expect(page).toHaveURL(/\/faq$/);
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
    expect(
      await underline(page).evaluate((el) => el.getAnimations().length),
    ).toBe(0);
  });

  test("A§7F the current item clears filters and search in the address (reload without the query)", async ({
    page,
  }) => {
    await page.goto("/cakes?filter=birthday&q=lemon");
    await item(page, "Cakes").click();
    await expect(page).toHaveURL(/\/cakes$/);
  });

  test("A§7F Back / forward: no slide, the underline is simply at the page's item", async ({
    page,
  }) => {
    await page.goto("/cakes");
    await item(page, "FAQ").click();
    await expect(page).toHaveURL(/\/faq$/);
    await expect
      .poll(() => underline(page).evaluate((el) => el.getAnimations().length))
      .toBe(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/cakes$/);
    expect(
      await underline(page).evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    const e = await edges(page, "Cakes");
    expect(e.line.left).toBeCloseTo(e.item!.left, 0);
    await expect(item(page, "Cakes")).toHaveAttribute("aria-current", "page");
  });

  test("A§1.4 reduced motion: the underline jumps to the new item", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cakes");
    await item(page, "Contact").click();
    expect(
      await underline(page).evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    await expect(page).toHaveURL(/\/contact$/);
    await expect(item(page, "Contact")).toHaveCSS("font-weight", "600");
  });

  test("ANIM-07: hover grows the item's text 15 %, the underline stays", async ({
    page,
  }) => {
    await page.goto("/gallery");
    const before = await edges(page, "Gallery");
    await item(page, "Gallery").hover();
    await expect
      .poll(() =>
        item(page, "Gallery")
          .locator("[data-pressable-content]")
          .evaluate((el) => getComputedStyle(el).transform),
      )
      .toBe("matrix(1.15, 0, 0, 1.15, 0, 0)");
    const after = await edges(page, "Gallery");
    expect(after.line).toEqual(before.line);
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
      page.getByRole("link", { name: "Baked by Linda" }),
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
    await page.getByRole("link", { name: "Baked by Linda" }).click();
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
