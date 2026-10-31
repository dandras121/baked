import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Slice 3.6a: sizes, options, the live price (ANIM-20) and the allergen line (§5.1, §5.8). Sample data: Bramble &
// Cream has Sponge (required: Vanilla, Chocolate +£5 with soya), Toppings (Fresh berries +£6, Gold leaf +£10) and
// a Gift box (+£8); every cake has The Lothian's sizes 24 / 32 / 40 at £185 / £240 / £305.
const price = (page: Page) => page.locator("[class*=amount] [aria-live]");
const allergens = (page: Page) =>
  page.getByRole("region", { name: "Allergens in this cake" }).locator("p");

test("the smallest size is pre-selected; another size moves the tier line and the price, not From", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/the-lothian");
  const sizes = page.getByRole("group", { name: "01 · Size" });
  await expect(sizes.getByRole("radio")).toHaveCount(3);
  await expect(
    sizes.getByRole("radio", { name: /^Serves 24/ }),
  ).toBeChecked();
  await expect(price(page)).toHaveText("£185");
  await expect(page.getByText("Serves 24 · plain")).toBeVisible();
  await sizes.getByText("Serves 40").click();
  await expect(price(page)).toHaveText("£305");
  await expect(page.getByText("THREE TIERS · SERVES 40")).toBeVisible();
  await expect(page.getByText("From £185")).toBeVisible();
  await expect(sizes.getByText("+£120")).toBeVisible();
});

test("options add to the price and list what they add; the allergen line follows them", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/bramble-and-cream");
  await expect(allergens(page)).toHaveText(
    "Contains gluten (wheat), eggs and milk. Made in a kitchen that also handles tree nuts, soya and sesame, so I cannot rule out traces of those.",
  );
  // Nothing is chosen at the start (§0.6).
  await expect(
    page.getByRole("radio", { name: /Chocolate/ }),
  ).not.toBeChecked();
  await page.getByText("Chocolate", { exact: true }).click();
  await page.getByText("Fresh berries").click();
  await page.getByText("Add a gift box").click();
  await expect(price(page)).toHaveText("£204");
  await expect(
    page.getByText(
      "Includes Chocolate +£5, Fresh berries +£6 and Gift box +£8.",
    ),
  ).toBeVisible();
  await expect(allergens(page)).toHaveText(
    "Contains gluten (wheat), eggs, milk and soya — the soya comes with the chocolate sponge. Made in a kitchen that also handles tree nuts and sesame, so I cannot rule out traces of those.",
  );
  // A required Choice keeps its pick; another pill moves it.
  await page.getByText("Vanilla", { exact: true }).click();
  await expect(price(page)).toHaveText("£199");
  await expect(allergens(page)).toContainText(
    "Contains gluten (wheat), eggs and milk.",
  );
  // Unticking takes the add-on away again.
  await page.getByText("Add a gift box").click();
  await expect(price(page)).toHaveText("£191");
});

test("options are numbered on from the size, in Linda's order", async ({
  page,
}) => {
  await page.goto("/cakes/bramble-and-cream");
  await expect(page.locator("legend")).toHaveText([
    "01 · Size",
    "02 · Sponge",
    "03 · Toppings",
    "04 · Gift box",
  ]);
});

test("a Text option has a live counter at Linda's limit", async ({ page }) => {
  await page.goto("/cakes/wee-beastie");
  const field = page.getByRole("textbox", { name: /Name on the topper/ });
  await field.fill("Isla");
  await expect(page.getByText(/^4 \/ \d+$/)).toBeVisible();
});

test("ANIM-20: the old figure leaves in 120 ms, the new one arrives 80–240 ms", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  await page.addInitScript(() => {
    const w = window as unknown as { __anims: string[] };
    w.__anims = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const o = (options ?? {}) as KeyframeAnimationOptions;
      w.__anims.push(`${o.delay ?? 0}+${o.duration} ${o.easing ?? "linear"}`);
      return original.call(this, frames, options);
    };
  });
  await page.goto("/cakes/the-lothian");
  await page.getByText("Serves 32").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __anims: string[] }).__anims),
    )
    .toEqual(
      expect.arrayContaining([
        "0+120 cubic-bezier(0.32, 0, 0.67, 0)",
        "80+160 cubic-bezier(0.33, 1, 0.68, 1)",
      ]),
    );
  await expect(price(page)).toHaveText("£240");
  // Afterwards only one figure is left.
  await expect(page.locator("[data-old]")).toHaveCount(0);
});

test("reduced motion: the price swaps at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/the-lothian");
  await page.getByText("Serves 32").click();
  await expect(page.locator("[data-old]")).toHaveCount(0);
  await expect(price(page)).toHaveText("£240");
});

test("pills and boxes have 44 px hit areas; axe passes; screenshots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cakes/bramble-and-cream");
  await page.getByText("Chocolate", { exact: true }).click();
  for (const pill of await page
    .locator("label[data-pressable][class*=pill]")
    .all()) {
    const b = (await pill.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_cake-options.png`),
    fullPage: true,
  });
});
