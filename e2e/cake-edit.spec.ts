import { eq } from "drizzle-orm";
import { expect, test, type Page } from "@playwright/test";
import { connect } from "../src/db/client";
import { drafts } from "../src/db/schema";

// Slice 3.6c: edit mode (§5.1) and the cleared draft (§10.2).
const field = (page: Page) =>
  page.getByRole("textbox", { name: /Inscription/ });

/** Adds The Lothian with a message and returns the new line's id. */
async function addLothian(page: Page, text: string) {
  await page.goto("/cakes/the-lothian");
  await field(page).fill(text);
  await page.getByRole("button", { name: "Add to your order" }).click();
  const item = page.locator("[data-line]").last();
  await expect(item).toContainText(text);
  return Number(await item.getAttribute("data-line"));
}

test("edit mode loads the line, says Save this cake, saves in place and returns to the step", async ({
  page,
}) => {
  const first = await addLothian(page, "First");
  await addLothian(page, "Second");
  await page.goto(`/cakes/the-lothian?line=${first}&from=when`);
  await expect(field(page)).toHaveValue("First");
  const save = page.getByRole("button", { name: "Save this cake" });
  await expect(save).toBeVisible();
  await page.getByText("Serves 40").click();
  await field(page).fill("First, changed");
  await save.click();
  await expect(page).toHaveURL(/\/order\/when$/);
  // The order still has two cakes, the edited one in its place.
  const third = await addLothian(page, "Third");
  expect(third).toBeGreaterThan(first);
  await expect(page.locator("[data-line]")).toHaveText([
    /The Lothian · serves 40 · “First, changed”/,
    /The Lothian · serves 24 · “Second”/,
    /The Lothian · serves 24 · “Third”/,
  ]);
});

test("leaving edit mode without saving changes nothing", async ({ page }) => {
  const line = await addLothian(page, "Keep me");
  await page.goto(`/cakes/the-lothian?line=${line}`);
  await expect(field(page)).toHaveValue("Keep me");
  await field(page).fill("Not saved");
  await page.goto("/cakes/sugar-peony");
  await field(page).fill("Peony");
  await page.getByRole("button", { name: "Add to your order" }).click();
  await expect(page.locator("[data-line]").first()).toContainText("“Keep me”");
});

test("a line that is not in this visitor's order: the page is the normal Add page", async ({
  page,
}) => {
  await page.goto("/cakes/the-lothian?line=999999");
  await expect(
    page.getByRole("button", { name: "Add to your order" }),
  ).toBeVisible();
  await expect(field(page)).toHaveValue("");
});

test("a draft left for a day: a checkout step goes to /cakes with “Your order was cleared…”", async ({
  page,
  context,
}) => {
  await addLothian(page, "Old");
  const id = (await context.cookies()).find(
    (c) => c.name === "bbl_session",
  )!.value;
  process.loadEnvFile?.(".env.local");
  const { db, close } = connect();
  try {
    await db
      .update(drafts)
      .set({ lastActivityAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })
      .where(eq(drafts.id, id));
  } finally {
    await close();
  }
  await page.goto("/order/when");
  await expect(page).toHaveURL(/\/cakes$/);
  await expect(
    page.getByText("Your order was cleared after a day without changes."),
  ).toBeVisible();
  // A refresh does not show it again.
  await page.reload();
  await expect(page.getByText("Your order was cleared")).toHaveCount(0);
});
