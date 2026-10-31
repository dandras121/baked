import { expect, test, type Page } from "@playwright/test";
import fixture from "../src/db/fixtures/google-reviews.json";

// Slice 2.2: Home testimonials = Linda's Google reviews (§4.1, ANIM-10). The e2e database holds the fixture.
const withText = fixture.reviews
  .filter((r) => "comment" in r && r.comment)
  .sort((a, b) => b.createTime.localeCompare(a.createTime));

const section = (page: Page) =>
  page.locator("section[aria-labelledby='thoughts']");
const activeDash = (page: Page) =>
  section(page).locator("[aria-current='true']").getAttribute("aria-label");

async function open(page: Page) {
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  await section(page).scrollIntoViewIfNeeded();
}

test("the row: newest first, every review with text, the rating line with “Google”", async ({
  page,
}) => {
  await open(page);
  await expect(
    section(page).getByRole("heading", { name: "Thoughts on my work." }),
  ).toBeVisible();
  const rating = page.getByTestId("google-rating");
  await expect(rating).toContainText("Google reviews");
  // The visible text starts the accessible name (WCAG 2.5.3), the words follow.
  await expect(rating).toHaveAccessibleName(
    /^\d\.\d · 63 Google reviews \(Rated \d\.\d out of 5 from 63 Google reviews, opens in a new tab\)$/,
  );
  await expect(section(page).locator("[data-review-slot]")).toHaveCount(
    withText.length,
  );
  const first = section(page).locator("[data-review-card]").first();
  await expect(first).toContainText(withText[0].reviewer.displayName);
  await expect(
    section(page).getByRole("button", {
      name: `Review 1 of ${withText.length}`,
    }),
  ).toHaveAttribute("aria-current", "true");
});

test("a long text is cut and ends with “Read on Google →” (new tab)", async ({
  page,
}) => {
  await open(page);
  const cut = section(page).locator("[data-review-card][data-cut]").first();
  await expect(cut).toBeVisible();
  const link = cut.getByRole("link", { name: /Read on Google/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  // A short text is not cut.
  const short = section(page)
    .locator("[data-review-card]", { hasText: "Lovely cake, thank you!" })
    .first();
  await expect(short).not.toHaveAttribute("data-cut", "");
});

test("moving through the row: at most five dashes, cards load six at a time, one request at a time, no layout shift", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  const requests: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/reviews")) {
      requests.push(r.url());
      maxInFlight = Math.max(maxInFlight, ++inFlight);
    }
  });
  page.on(
    "requestfinished",
    (r) => r.url().includes("/api/reviews") && inFlight--,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[])
        if (!e.hadRecentInput)
          (window as unknown as { __cls: number }).__cls += e.value;
    }).observe({ type: "layout-shift", buffered: false });
  });
  const next = section(page).getByRole("button", { name: "Next review" });
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    // Desktop: the arrow; phone and tablet: the next dash.
    if (info.project.name === "desktop") await next.click();
    else
      await section(page)
        .getByRole("button", { name: `Review ${i + 1} of ${withText.length}` })
        .click();
    await expect
      .poll(() => activeDash(page))
      .toBe(`Review ${i + 1} of ${withText.length}`);
    await expect(section(page).locator("[aria-current='true']")).toHaveCount(1);
    expect(
      await section(page)
        .locator("button[data-state]:not([data-state='hidden'])")
        .count(),
    ).toBeLessThanOrEqual(5);
  }
  // 15th card reached: the page loaded beyond the first six, each call six at most.
  await expect(
    section(page)
      .locator("[data-review-card]", {
        hasText: withText[14].reviewer.displayName,
      })
      .first(),
  ).toBeVisible();
  expect(requests.length).toBeGreaterThanOrEqual(2);
  for (const u of requests)
    expect(new URL(u).searchParams.get("limit")).toBe("6");
  expect(maxInFlight).toBe(1);
  const cls = await page.evaluate(
    () => (window as unknown as { __cls: number }).__cls,
  );
  expect(cls).toBeLessThan(0.01);
});

test("a failed request retries once after 3 s; while it fails the arrows stop at the last loaded card", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "arrows are desktop only");
  test.setTimeout(60_000);
  let calls = 0;
  await page.route("**/api/reviews**", (route) => {
    calls++;
    return route.fulfill({ status: 503, body: "" });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const next = section(page).getByRole("button", { name: "Next review" });
  for (let i = 0; i < 3; i++) await next.click();
  await expect.poll(() => calls, { timeout: 10_000 }).toBe(2);
  // The first six are loaded: the arrow stops at card 6.
  // A disabled arrow does nothing when pressed (force: aria-disabled is not the disabled attribute).
  for (let i = 0; i < 4; i++) await next.click({ force: true });
  await expect(next).toHaveAttribute("aria-disabled", "true");
  expect(await activeDash(page)).toBe(`Review 6 of ${withText.length}`);
  // An empty slot keeps the card's size (no jump).
  const [a, b] = await Promise.all([
    section(page).locator("[data-review-slot='0'] > *").boundingBox(),
    section(page).locator("[data-review-slot='20'] > *").boundingBox(),
  ]);
  expect(b!.width).toBeCloseTo(a!.width, 0);
  expect(b!.height).toBeCloseTo(a!.height, 0);
});

test("clicking a card centres it and the dashes follow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const second = section(page).locator(
    "[data-review-slot='1'] [data-review-card]",
  );
  await second.click({ position: { x: 20, y: 20 } });
  await expect
    .poll(() => activeDash(page))
    .toBe(`Review 2 of ${withText.length}`);
  const [box, row] = await Promise.all([
    second.boundingBox(),
    section(page).boundingBox(),
  ]);
  expect(
    Math.abs(box!.x + box!.width / 2 - (row!.x + row!.width / 2)),
  ).toBeLessThan(3);
});

test("/api/reviews returns six text-only cards and the next cursor", async ({
  request,
}) => {
  const res = await request.get("/api/reviews?after=6&limit=6");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.reviews).toHaveLength(6);
  expect(Object.keys(body.reviews[0]).sort()).toEqual([
    "id",
    "month",
    "name",
    "stars",
    "text",
  ]);
  expect(body.reviews[0].id).toBe(withText[6].reviewId);
  expect(body.next).toBe("12");
});

test("a text of exactly four lines is not cut", async ({ page }) => {
  await page.goto("/?hero=live");
  await expect(page.getByTestId("hero")).toHaveCount(1);
  const card = section(page)
    .locator("[data-review-card]", {
      hasText: "Linda listened to every detail",
    })
    .first();
  await card.scrollIntoViewIfNeeded();
  const lines = await card
    .locator("p")
    .first()
    .evaluate((el) => {
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      el.style.webkitLineClamp = "unset";
      const n = Math.round(el.scrollHeight / lh);
      el.style.webkitLineClamp = "";
      return n;
    });
  if (lines <= 4) await expect(card).not.toHaveAttribute("data-cut", "");
  else await expect(card).toHaveAttribute("data-cut", "");
});
