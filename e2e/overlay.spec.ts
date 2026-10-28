import { expect, test, type Page } from "@playwright/test";

// Slice 0.5b: notices (ANIM-19), dialog (ANIM-12), bottom sheet (ANIM-13), SITE-FLOWS §0.6.
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Leave the cake plain?" });
const kindOf = (page: Page) =>
  dialog(page).evaluate((el) =>
    el.className.includes("sheet") ? "sheet" : "dialog",
  );
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );

test.describe("with a mouse and keyboard", () => {
  test.beforeEach(({}, testInfo) =>
    test.skip(testInfo.project.name !== "desktop"),
  );

  test("opens as a centred dialog; focus inside; Tab stays inside; Esc closes and focus returns", async ({
    page,
  }) => {
    await page.goto("/dev/components");
    const opener = page.getByTestId("open-auto");
    await opener.click();
    await expect(dialog(page)).toBeVisible();
    expect(await kindOf(page)).toBe("dialog");
    await settled(page);
    await expect(
      page.getByRole("button", { name: "Yes, keep it plain" }),
    ).toBeFocused();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest("dialog"),
      );
      const onPage = await page.evaluate(
        () =>
          !!document.activeElement?.closest("main") &&
          !document.activeElement?.closest("dialog"),
      );
      expect(inside || !onPage).toBe(true); // never on the page behind
    }
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("§0.6 opens over the page at the current scroll position, the page does not scroll, and it comes back the same", async ({
    page,
  }) => {
    await page.goto("/dev/components");
    const opener = page.getByTestId("open-auto");
    await opener.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await opener.click();
    await settled(page);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await page.mouse.click(5, 5); // the scrim
    await expect(dialog(page)).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("ANIM-12: the dialog animates in (240 ms) and out (160 ms); an action closes it", async ({
    page,
  }) => {
    await page.goto("/dev/components");
    await page.getByTestId("open-auto").click();
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .map((a) => (a.effect as KeyframeEffect).getTiming().duration),
    );
    expect(running).toContain(240);
    await settled(page);
    await page.getByRole("button", { name: "Add a message" }).click();
    const closing = await page.evaluate(() =>
      document
        .getAnimations()
        .map((a) => (a.effect as KeyframeEffect).getTiming().duration),
    );
    expect(closing).toContain(160);
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByTestId("answer")).toHaveText(
      "You chose: Add a message",
    );
  });

  test("A§1.4 reduced motion: it appears and goes at once", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/components");
    await page.getByTestId("open-auto").click();
    await expect(dialog(page)).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
  });

  test("ANIM-19 notice: appears as an alert in words, and goes", async ({
    page,
  }) => {
    await page.goto("/dev/components");
    const box = page.getByTestId("declined");
    await expect(box.getByRole("alert")).toHaveCount(0);
    await page.getByTestId("toggle-notice").click();
    await expect(box.getByRole("alert")).toContainText(
      "Your bank declined the payment",
    );
    await page.getByTestId("toggle-notice").click();
    await expect(box.getByRole("alert")).toHaveCount(0);
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

  const openByTouch = async (page: Page) => {
    await page.goto("/dev/components");
    const opener = page.getByTestId("open-auto");
    await opener.scrollIntoViewIfNeeded();
    await opener.tap();
    await expect(dialog(page)).toBeVisible();
    await settled(page);
  };

  test("opens as a full-width bottom sheet", async ({ page }) => {
    await openByTouch(page);
    expect(await kindOf(page)).toBe("sheet");
    const panel = (await dialog(page)
      .locator("h2")
      .locator("..")
      .boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(panel.width).toBe(viewport.width);
    expect(Math.round(panel.y + panel.height)).toBe(viewport.height);
  });

  test("ANIM-13: a short drag springs back; a drag past a third closes", async ({
    page,
  }) => {
    await openByTouch(page);
    const panel = (await dialog(page)
      .locator("h2")
      .locator("..")
      .boundingBox())!;
    const send = await touch(page);
    const x = panel.x + panel.width / 2;
    const y = panel.y + 12;
    await send("touchStart", x, y);
    for (let dy = 4; dy <= 20; dy += 4) await send("touchMove", x, y + dy);
    await page.waitForTimeout(100);
    await send("touchEnd");
    await settled(page);
    await expect(dialog(page)).toBeVisible();

    await send("touchStart", x, y);
    for (let dy = 10; dy <= panel.height * 0.6; dy += 10) {
      await send("touchMove", x, y + dy);
      await page.waitForTimeout(16);
    }
    await send("touchEnd");
    await expect(dialog(page)).toBeHidden();
  });
});
