import { expect, test, type Locator, type Page } from "@playwright/test";

// Slice 0.4: ANIM-07 / ANIM-05 by input, the input lock, reduced motion. Values: ANIMATIONS §7C, §7E.
const scaleOf = (l: Locator) =>
  l.evaluate((el) => {
    const m = getComputedStyle(el).transform;
    return m === "none" ? 1 : parseFloat(/matrix\(([^,]+)/.exec(m)![1]);
  });
const settle = (page: Page, ms = 450) => page.waitForTimeout(ms);
const centre = async (l: Locator) => {
  await l.scrollIntoViewIfNeeded();
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test.describe("with a mouse (desktop)", () => {
  test.beforeEach(({}, testInfo) =>
    test.skip(testInfo.project.name !== "desktop"),
  );

  test("ANIM-07 hover 110 %, press 100 %, release springs to 110 % and acts on release, leave 100 %", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const button = page.getByTestId("button");
    const { x, y } = await centre(button);
    await page.mouse.move(x, y);
    await settle(page);
    expect(await scaleOf(button)).toBeCloseTo(1.1, 2);

    await page.mouse.down();
    await settle(page, 250);
    expect(await scaleOf(button)).toBeCloseTo(1.0, 2);
    await expect(page.getByTestId("clicks")).toContainText("Clicked 0 times");

    const peak = button.evaluate(
      (el) =>
        new Promise<number>((resolve) => {
          let max = 0;
          const start = performance.now();
          const tick = () => {
            const m = getComputedStyle(el).transform;
            max = Math.max(
              max,
              m === "none" ? 1 : parseFloat(/matrix\(([^,]+)/.exec(m)![1]),
            );
            if (performance.now() - start < 400) requestAnimationFrame(tick);
            else resolve(max);
          };
          tick();
        }),
    );
    await page.mouse.up();
    await expect(page.getByTestId("clicks")).toContainText("Clicked 1 times");
    expect(await peak).toBeGreaterThan(1.105); // spring overshoot (1.115 at 150 ms)
    expect(await scaleOf(button)).toBeCloseTo(1.1, 2);

    await page.mouse.move(5, 5);
    await settle(page);
    expect(await scaleOf(button)).toBeCloseTo(1, 2);
  });

  test("ANIM-07 cancel: pressing, then releasing outside does nothing", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const button = page.getByTestId("button");
    const { x, y } = await centre(button);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await settle(page);
    await expect(page.getByTestId("clicks")).toContainText("Clicked 0 times");
    expect(await scaleOf(button)).toBeCloseTo(1, 2);
  });

  test("ANIM-07 desktop navigation items grow 15 %, only the label", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const nav = page.getByTestId("nav");
    await nav.hover();
    await settle(page);
    expect(await scaleOf(nav.locator("[data-pressable-content]"))).toBeCloseTo(
      1.15,
      2,
    );
    expect(await scaleOf(nav)).toBe(1);
  });

  test("ANIM-07 row-shaped: the row box stays, its content grows", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const row = page.getByTestId("row");
    await row.hover();
    await settle(page);
    expect(await scaleOf(row)).toBe(1);
    expect(await scaleOf(row.locator("[data-pressable-content]"))).toBeCloseTo(
      1.1,
      2,
    );
  });

  test("ANIM-05 field: hover 110 %, press back to 100 % and it stays 100 % while typing", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const field = page.getByTestId("field");
    const { x, y } = await centre(field);
    await page.mouse.move(x, y);
    await settle(page);
    expect(await scaleOf(field)).toBeCloseTo(1.1, 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.type("Mairi");
    await settle(page);
    expect(await scaleOf(field)).toBeCloseTo(1, 2);
    await expect(page.locator("#demo-field")).toBeFocused();
    await expect(page.locator("#demo-field")).toHaveValue("Mairi");
  });

  test("A§1.9 keyboard: Tab focus = hover on pressables, no scaling on fields", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const button = page.getByTestId("button");
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    await settle(page);
    expect(await scaleOf(button)).toBeCloseTo(1.1, 2);

    await page.locator("#demo-field").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await settle(page);
    expect(await scaleOf(page.getByTestId("field"))).toBe(1);
  });

  test("A§1.5 a fast double click runs the action once", async ({ page }) => {
    await page.goto("/dev/motion");
    await page.getByTestId("locked").dblclick();
    await expect(page.getByTestId("locked-count")).toContainText("ran 1 times");
    await page.waitForTimeout(700);
    await page.getByTestId("locked").click();
    await expect(page.getByTestId("locked-count")).toContainText("ran 2 times");
  });

  test("A§1.4 reduced motion: nothing scales", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/motion");
    const button = page.getByTestId("button");
    await button.hover();
    await settle(page);
    expect(await scaleOf(button)).toBe(1);
    await page.mouse.down();
    await settle(page, 200);
    expect(await scaleOf(button)).toBe(1);
    await page.mouse.up();
    await expect(page.getByTestId("clicks")).toContainText("Clicked 1 times");
  });
});

test.describe("with touch (phone)", () => {
  test.beforeEach(({}, testInfo) =>
    test.skip(testInfo.project.name !== "phone"),
  );

  const touch = async (page: Page) => {
    const cdp = await page.context().newCDPSession(page);
    return (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });
  };

  test("ANIM-07 press shrinks to 90 %, release springs back to 100 % and acts; no hover", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const button = page.getByTestId("button");
    const { x, y } = await centre(button);
    const send = await touch(page);
    await send("touchStart", x, y);
    await settle(page, 250);
    expect(await scaleOf(button)).toBeCloseTo(0.9, 2);
    await expect(page.getByTestId("clicks")).toContainText("Clicked 0 times");
    await send("touchEnd");
    await expect(page.getByTestId("clicks")).toContainText("Clicked 1 times");
    await settle(page);
    expect(await scaleOf(button)).toBeCloseTo(1, 2);
  });

  test("ANIM-07 moving the finger more than 10 px cancels: no action", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const button = page.getByTestId("button");
    const { x, y } = await centre(button);
    const send = await touch(page);
    await send("touchStart", x, y);
    await settle(page, 150);
    await send("touchMove", x + 30, y);
    await send("touchEnd");
    await settle(page);
    expect(await scaleOf(button)).toBeCloseTo(1, 2);
    await expect(page.getByTestId("clicks")).toContainText("Clicked 0 times");
  });

  test("ANIM-05 field: press 90 %, release focuses it and springs back to 100 %", async ({
    page,
  }) => {
    await page.goto("/dev/motion");
    const field = page.getByTestId("field");
    const { x, y } = await centre(field);
    const send = await touch(page);
    await send("touchStart", x, y);
    await settle(page, 250);
    expect(await scaleOf(field)).toBeCloseTo(0.9, 2);
    await send("touchEnd");
    await settle(page);
    expect(await scaleOf(field)).toBeCloseTo(1, 2);
    await expect(page.locator("#demo-field")).toBeFocused();
  });
});
