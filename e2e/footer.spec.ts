import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 1.4: the footer (SITE-FLOWS §3.2) and its mascot (ANIM-06, A§7D).

const footer = (page: Page) => page.locator("footer");
const mascot = (page: Page) => page.locator(".footer-mascot");
/** The peek is a CSS animation with fill “both”: once finished it stays listed as “finished”. */
const playState = (page: Page) =>
  mascot(page).evaluate((el) =>
    el
      .getAnimations()
      .map((a) => a.playState)
      .join(","),
  );
const toBottom = (page: Page) =>
  page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

test("§3.2 business facts come from Settings (seeded with the real values, §11.1)", async ({
  page,
}) => {
  await page.goto("/terms");
  const f = footer(page);
  await expect(f).toContainText(S.addressLine);
  await expect(f).toContainText(S.postcode);
  await expect(f).toContainText(`Food business registered with ${S.council}`);
  await expect(f).toContainText(
    `Food Hygiene Information Scheme: ${S.hygieneRating}`,
  );
  await expect(f).toContainText(`delivered across ${S.deliveryArea}.`);
  await expect(f).toContainText(
    `${S.tradingName} is the trading name of ${S.legalName}, a sole trader based in Scotland.`,
  );
  await expect(f.getByRole("link", { name: S.email })).toHaveAttribute(
    "href",
    `mailto:${S.email}`,
  );
  await expect(f.getByRole("link", { name: S.phone })).toHaveAttribute(
    "href",
    "tel:+447884199103",
  );
  const year = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
  }).format(new Date());
  await expect(f).toContainText(
    `© ${year} ${S.tradingName}. All rights reserved.`,
  );
});

test("§3.2 LEGAL is one list in reading order (left column first), the right column right-aligned", async ({
  page,
}) => {
  await page.goto("/terms");
  const legal = footer(page).getByRole("navigation", { name: "LEGAL" });
  const links = legal.getByRole("link");
  await expect(links).toHaveText([
    "Privacy policy",
    "Cookie policy",
    "Terms & conditions",
    "Delivery & collection",
    "Cancellations & refunds",
    "Accessibility statement",
    "Complaints procedure",
    "Allergen information",
  ]);
  const hrefs = await links.evaluateAll((els) =>
    els.map((a) => a.getAttribute("href")),
  );
  expect(hrefs).toEqual([
    "/privacy",
    "/cookies",
    "/terms",
    "/delivery-and-collection",
    "/cancellations",
    "/accessibility",
    "/complaints",
    "/allergens",
  ]);
  const listBox = (await legal.locator("ul").boundingBox())!;
  const left = (await links.nth(0).boundingBox())!;
  const right = (await links.nth(4).boundingBox())!;
  expect(left.x).toBeCloseTo(listBox.x, 0);
  expect(right.x + right.width).toBeCloseTo(listBox.x + listBox.width, 0);
  expect(right.y).toBeCloseTo(left.y, 0);
});

test("§3.2 Find my order →, Cookie preferences, the small-print link and the logo", async ({
  page,
}) => {
  await page.goto("/terms");
  const f = footer(page);
  await expect(
    f.getByRole("link", { name: "Find my order →" }),
  ).toHaveAttribute("href", "/find-my-order");
  await expect(
    f.getByRole("button", { name: "Cookie preferences" }),
  ).toHaveAttribute("href", "/cookies#changing-your-mind");
  await expect(
    f.getByRole("link", { name: "Cancellations & refunds" }).last(),
  ).toHaveAttribute("href", "/cancellations");
  await expect(f.getByRole("link", { name: "Baked by Linda" })).toHaveAttribute(
    "href",
    "/",
  );
  // No navigation and no social links in the footer (§3.2).
  await expect(
    f.getByRole("link", {
      name: /^(Home|Cakes|Gallery|Instagram|@bakedbylinda)$/,
    }),
  ).toHaveCount(0);
});

test("§3.2 the footer has the drawn height on the reference widths (texts from Settings permitting)", async ({
  page,
}, testInfo) => {
  await page.goto("/terms");
  const h = (await footer(page).boundingBox())!.height;
  // Figma: phone 1132, tablet 560.4, desktop 594. The tagline is one line shorter here because
  // Settings say “Edinburgh & the Lothians” (Figma: “and”), which wraps one line earlier on desktop.
  const drawn = { phone: 1132, tablet: 560.4, desktop: 594 }[
    testInfo.project.name
  ]!;
  expect(Math.abs(h - drawn)).toBeLessThanOrEqual(23);
});

test("ANIM-06: hidden until the corner is 80 % in view, then it peeks in (150 ms delay, 450 ms) and sits as drawn", async ({
  page,
}, testInfo) => {
  await page.goto("/terms");
  await expect(page.locator("html")).toHaveClass(/(^|\s)js(\s|$)/);
  await expect(mascot(page)).not.toHaveClass(/is-in/);
  const hiddenT = await mascot(page).evaluate(
    (el) => getComputedStyle(el).transform,
  );
  expect(hiddenT).not.toBe("none");
  await toBottom(page);
  await expect(mascot(page)).toHaveClass(/is-in/);
  const timing = await mascot(page).evaluate((el) => {
    const a = el.getAnimations()[0];
    const t = a.effect!.getComputedTiming();
    return [t.delay, t.duration, getComputedStyle(el).animationTimingFunction];
  });
  expect(timing).toEqual([150, 450, "cubic-bezier(0.5, 1, 0.89, 1)"]);
  await expect.poll(() => playState(page)).toBe("finished");
  // Resting box from the bottom-right corner (A§7D table).
  const rest = {
    phone: ["312.55px", "336.6px", "-153.24px", "-60.39px", -30],
    tablet: ["270.98px", "291.82px", "-94.3px", "-46.69px", -17.55],
    desktop: ["338.72px", "364.77px", "-117.87px", "-58.36px", -17.55],
  }[testInfo.project.name]!;
  const got = await mascot(page).evaluate((el) => {
    const s = getComputedStyle(el);
    const [a, b] = /matrix\(([^)]+)\)/
      .exec(s.transform)![1]
      .split(",")
      .map(Number);
    return [
      s.width,
      s.height,
      s.right,
      s.bottom,
      (Math.atan2(b, a) * 180) / Math.PI,
    ];
  });
  for (let i = 0; i < 4; i++)
    expect(parseFloat(got[i] as string)).toBeCloseTo(
      parseFloat(rest[i] as string),
      1,
    );
  expect(got[4] as number).toBeCloseTo(rest[4] as number, 1);
});

test("ANIM-06: the start state follows the A§7D t 0 row", async ({
  page,
}, testInfo) => {
  await page.goto("/terms");
  const row = {
    phone: [150.5, 260.7, -40],
    tablet: [83.8, 265.1, -27.55],
    desktop: [104.6, 330.9, -27.55],
  }[testInfo.project.name]!;
  const m = await mascot(page).evaluate((el) => {
    const [a, b, , , e, f] = /matrix\(([^)]+)\)/
      .exec(getComputedStyle(el).transform)![1]
      .split(",")
      .map(Number);
    return [e, f, (Math.atan2(b, a) * 180) / Math.PI];
  });
  expect(m[0]).toBeCloseTo(row[0], 0);
  expect(m[1]).toBeCloseTo(row[1], 0);
  expect(m[2]).toBeCloseTo(row[2], 1);
});

test("ANIM-06: once per page — scrolling away and back does not replay it; another page does", async ({
  page,
}) => {
  await page.goto("/terms");
  await toBottom(page);
  await expect(mascot(page)).toHaveClass(/is-in/);
  await expect.poll(() => playState(page)).toBe("finished");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await toBottom(page);
  await page.waitForTimeout(200);
  expect(await playState(page)).toBe("finished");
  // A new page (client-side navigation keeps the footer) gets its own peek.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.goto("/faq");
  await expect(mascot(page)).not.toHaveClass(/is-in/);
  await toBottom(page);
  await expect(mascot(page)).toHaveClass(/is-in/);
});

test("A§1.4 reduced motion: the mascot is never hidden", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/terms");
  const t = await mascot(page).evaluate((el) => getComputedStyle(el).transform);
  const [a, b, , , e, f] = /matrix\(([^)]+)\)/
    .exec(t)![1]
    .split(",")
    .map(Number);
  expect([Math.round(e), Math.round(f)]).toEqual([0, 0]);
  expect(Math.atan2(b, a)).toBeLessThan(0);
  await toBottom(page);
  expect(await mascot(page).evaluate((el) => el.getAnimations().length)).toBe(
    0,
  );
});

test("axe: no violations on a page with the footer", async ({
  page,
}, testInfo) => {
  await page.goto("/terms");
  await toBottom(page);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await footer(page).screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_footer.png`),
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("A§7D the mascot simply sits in place", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)js(\s|$)/);
    await expect(mascot(page)).toBeVisible();
  });
});

test("§3.2 at the iPad landscape width (1180) the mascot never covers the columns", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "sets its own viewport");
  for (const width of [1120, 1180, 1280, 1600]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto("/terms");
    await toBottom(page);
    await expect.poll(() => playState(page)).toBe("finished");
    const food = (await footer(page)
      .getByRole("region", { name: "FOOD & COMPLIANCE" })
      .boundingBox())!;
    const legal = (await footer(page)
      .getByRole("navigation", { name: "LEGAL" })
      .boundingBox())!;
    const m = (await mascot(page).boundingBox())!;
    // The rotated box reaches a little higher than its artwork; the hearts start about 10 % below its top.
    expect(m.y + m.height * 0.1, `${width} px`).toBeGreaterThan(
      Math.max(food.y + food.height, legal.y + legal.height),
    );
  }
});
