import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { mailSends, orderLines, orders } from "../src/db/schema";
import { addDays, londonDate } from "../src/lib/london-time";
import { settled, signIn } from "./admin-helpers";

// Slice 8.6a: Change the order (§9.7) — the order's own fields; Owner and Helper.
const today = londonDate(new Date());
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const num = (first: string) => `BBL-E2G-${tag}-${first}`;
const day = addDays(today, 50);

async function addOrder(first: string, received = 18500) {
  const { db, close } = connect();
  try {
    const [o] = await db
      .insert(orders)
      .values({
        number: num(first),
        token: `e2e-change-${tag}-${first}-padding`,
        date: day,
        earliestDate: day,
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        town: "Linlithgow",
        postcode: "EH49 6HH",
        customerName: `${first} Sinclair`,
        email: `${first.toLowerCase()}@example.co.uk`,
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: received,
        paymentIntentId: `pi_e2g_${tag}_${first}`,
        snapshot: {},
        confirmedAt: new Date(),
      })
      .returning();
    await db.insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "Two tiers · serves 24",
      message: "Happy 30th",
      pricePence: 18500,
      sizePricePence: 18500,
      allergenText: "Contains: wheat, egg, milk",
      allergenKeys: [],
    });
  } finally {
    await close();
  }
}

test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, `BBL-E2G-${tag}-%`));
  } finally {
    await close();
  }
});
test.beforeAll(async () => {
  for (const f of ["Mairi", "Ewan", "Shona"]) await addOrder(f);
  await addOrder("Kirsty", 8000);
});

test("an Owner moves the date and window: the tick box appears, Save → Order detail, HISTORY, e-mail 12", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Mairi")}`);
  await page.getByRole("link", { name: "Change the order" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Change the order" }),
  ).toBeVisible();
  await expect(
    page.getByText(`${num("Mairi")} · Mairi Sinclair`),
  ).toBeVisible();
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  const region = page.getByRole("region", { name: "Price impact" });
  await expect(region).toContainText("Current total£185.00");
  await page.getByLabel("Date", { exact: true }).fill(addDays(day, 7));
  await expect(
    page.getByLabel("The customer asked for this"),
  ).not.toBeChecked();
  await expect(page.getByText(/That day: \d+ of \d+ booked/)).toBeVisible();
  await page
    .getByLabel("Window", { exact: true })
    .selectOption({ label: "Evening 4–7pm" });
  await expect(save).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: ".shots/8.6a/change-1280.png",
    fullPage: true,
  });
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Mairi")}$`));
  await expect(
    page.getByRole("region", { name: "Where and when" }),
  ).toContainText("Evening · 4 – 7pm");
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Linda · Changed the order · Date:",
  );
  const { db, close } = connect();
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.number, num("Mairi")));
    expect(String(o.earliestDate)).toBe(addDays(day, 7));
    const m = (await db.select().from(mailSends)).filter((x) =>
      x.key.startsWith(`order:${o.id}:12:`),
    );
    expect(m).toHaveLength(1);
  } finally {
    await close();
  }
});

test("a Helper: no money panel, the footnote without money; Discard changes goes back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders/${num("Ewan")}/change`);
  await expect(page.getByRole("region", { name: "Price impact" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Saving sends Ewan e-mail 12 with old → new.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Ewan")}$`));
});

test("phone: back to the order, one column", async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Ewan")}/change`);
  await expect(
    page.getByRole("link", { name: "‹ Back to order" }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.6a/change-402.png", fullPage: true });
});

test("the cakes: a bigger size on a paid order waits for its link; Cancel this change; a new message saves at once", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Shona")}/change`);
  const block = page.getByRole("group", { name: "The Lothian" });
  await expect(block.getByLabel("Size")).toBeVisible();
  const big = await block
    .getByLabel("Size")
    .locator("option", { hasText: "32" })
    .getAttribute("value");
  await block.getByLabel("Size").selectOption(big!);
  const impact = page.getByRole("region", { name: "Price impact" });
  await expect(impact).toContainText("New total£240.00");
  await expect(impact).toContainText("+£55");
  await page.screenshot({ path: ".shots/8.6b/size-1280.png", fullPage: true });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Shona")}$`));
  await expect(
    page.getByText(/^Change waiting for £55\.00 — link sent \d+ \w{3}$/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Change the order" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Money" })).toContainText(
    "£185.00",
  );
  await page.screenshot({
    path: ".shots/8.6b/waiting-1280.png",
    fullPage: true,
  });
  const { db, close } = connect();
  try {
    const [o] = await db
      .select()
      .from(orders)
      .where(eq(orders.number, num("Shona")));
    expect(
      (await db.select().from(mailSends)).filter(
        (m) =>
          m.template === "pay-link" &&
          (m.data as { view: { number: string } }).view.number === num("Shona"),
      ),
    ).toHaveLength(1);
    void o;
  } finally {
    await close();
  }
  await page.getByRole("button", { name: "Cancel this change" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this change?" });
  await dialog.getByRole("button", { name: "Cancel the change" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/^Change waiting for/)).toHaveCount(0);
  await page.getByRole("link", { name: "Change the order" }).click();
  await page
    .getByRole("group", { name: "The Lothian" })
    .getByLabel("Inscription")
    .fill("Happy 31st, Shona");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Shona")}$`));
  await expect(page.getByRole("region", { name: "The cakes" })).toContainText(
    "“Happy 31st, Shona”",
  );
});

test("a Helper sees the message, not the size", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Fiona", "helper");
  await page.goto(`/admin/orders/${num("Ewan")}/change`);
  const block = page.getByRole("group", { name: "The Lothian" });
  await expect(block.getByLabel("Inscription")).toBeVisible();
  await expect(block.getByLabel("Size")).toHaveCount(0);
});

test("reopening Change the order after leaving without saving starts from the order again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Ewan")}`);
  await page.getByRole("link", { name: "Change the order" }).click();
  const msg = page
    .getByRole("group", { name: "The Lothian" })
    .getByLabel("Inscription");
  await msg.fill("Not saved");
  await page.getByRole("link", { name: "Discard changes" }).click();
  await page
    .getByRole("dialog", { name: "Leave without saving?" })
    .getByRole("button", { name: "Leave" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Ewan")}$`));
  await page.getByRole("link", { name: "Change the order" }).click();
  await expect(
    page.getByRole("group", { name: "The Lothian" }).getByLabel("Inscription"),
  ).toHaveValue("Happy 30th");
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
});

test("Add a cake from its dialog, Remove with Undo; saved at once on an order not fully paid", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, "Linda");
  await page.goto(`/admin/orders/${num("Kirsty")}/change`);
  // The only cake has no Remove.
  await expect(
    page.getByRole("button", { name: "Remove The Lothian" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add a cake" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a cake to this order" });
  await expect(dialog).toContainText(`Change the order · ${num("Kirsty")}`);
  await dialog.getByLabel("Design").selectOption({ label: "The Lothian" });
  await dialog
    .locator("label")
    .filter({ hasText: /^Serves 24 · £185$/ })
    .click();
  const msg = dialog.getByLabel("Message on the cake");
  if (await msg.count()) await msg.fill("Well done, Ewan");
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: ".shots/8.6c/add-cake-1280.png" });
  await dialog.getByRole("button", { name: "Add it" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/^New · serves 24/)).toBeVisible();
  const impact = page.getByRole("region", { name: "Price impact" });
  await expect(impact).toContainText("New total£370.00");
  // Now there are two: the first can be removed, and put back.
  await page.getByRole("button", { name: "Remove The Lothian" }).click();
  await expect(page.getByText("Removed when you save")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(impact).toContainText("New total£370.00");
  await page.screenshot({
    path: ".shots/8.6c/change-1280.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${num("Kirsty")}$`));
  const cakes = page.getByRole("region", { name: "The cakes" });
  await expect(cakes.getByRole("heading", { level: 3 })).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Money" })).toContainText(
    "Still to pay£290.00",
  );
  await expect(page.getByRole("region", { name: "History" })).toContainText(
    "Added: — → The Lothian · serves 24",
  );
});
