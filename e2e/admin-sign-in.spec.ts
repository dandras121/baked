import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { desc, eq, like } from "drizzle-orm";
import { ensureFirstOwner } from "../src/db/admin-auth-repo";
import { connect } from "../src/db/client";
import { formSends, mailSends, teamMembers } from "../src/db/schema";

// Slice 8.1: sign in, sessions, roles (§9.2, §9.15).
const OWNER = "info@bakedbylinda.co.uk";
const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  // The code limits (10 an hour per address) are tested in the unit tests; here every test starts afresh.
  const { db, close } = connect();
  try {
    await db.delete(formSends).where(like(formSends.form, "code:%"));
  } finally {
    await close();
  }
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
});

async function codeFor(email: string) {
  const { db, close } = connect();
  try {
    const [m] = await db
      .select()
      .from(mailSends)
      .where(eq(mailSends.to, email))
      .orderBy(desc(mailSends.id))
      .limit(1);
    return (m.data as { view: { code: string } }).view.code.replace(" ", "");
  } finally {
    await close();
  }
}

async function askCode(page: Page, email: string) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `I have sent a six-digit code to ${email}. It works for ten minutes.`,
    ),
  ).toBeVisible();
}

async function typeCode(page: Page, code: string) {
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(code);
}

/** A team member of this test alone: tests run side by side, and a new code ends the earlier one (§9.2). */
async function member(name: string, role: "owner" | "helper") {
  const email = `${name.toLowerCase()}-${Date.now()}-${octet()}@example.com`;
  const { db, close } = connect();
  try {
    await ensureFirstOwner(db, { email: OWNER, name: "Linda" });
    await db.insert(teamMembers).values({ name, email, role });
  } finally {
    await close();
  }
  return email;
}

test("an Owner signs in with the code from the e-mail; pasting signs in; Sign out ends it", async ({
  page,
  context,
}) => {
  const owner = await member("Linda", "owner");
  await askCode(page, owner);
  expect(
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze(),
  ).toHaveProperty("violations", []);
  const code = await codeFor(owner);
  const wrong = code === "000000" ? "111111" : "000000";
  await typeCode(page, wrong);
  await expect(
    page.getByText("That code is not right — 4 tries left."),
  ).toBeVisible();
  // Pasting fills all six boxes and signs in.
  await page.getByLabel("Digit 1 of 6").click();
  await page.evaluate(
    (c) => {
      const box = document.activeElement as HTMLInputElement;
      const data = new DataTransfer();
      data.setData("text", c);
      box.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true }),
      );
    },
    `${code.slice(0, 3)} ${code.slice(3)}`,
  );
  await expect(page).toHaveURL(/\/admin\/today$/);
  await expect(page.getByText("Linda · Owner")).toBeVisible();

  const cookie = (await context.cookies()).find(
    (c) => c.name === "__Host-bbl_admin",
  )!;
  expect(cookie).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });
  expect(cookie.expires * 1000 - Date.now()).toBeGreaterThan(
    29.9 * 24 * 3600 * 1000,
  );

  await page.goto("/admin/money");
  await expect(page.getByRole("heading", { name: "Money" })).toBeVisible();
  await page.goto("/admin/sign-in");
  await expect(page).toHaveURL(/\/admin\/today$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  // The old id no longer works anywhere.
  await context.addCookies([{ ...cookie }]);
  await page.goto("/admin/today");
  await expect(page).toHaveURL(/\/admin\/sign-in\?again=1$/);
  await expect(
    page.getByText("For safety, please sign in again."),
  ).toBeVisible();
});

test("a Helper sees Today; an owner-only page sends them back with “That page is for the owner.”", async ({
  page,
}) => {
  const fiona = await member("Fiona", "helper");
  await askCode(page, fiona);
  await typeCode(page, await codeFor(fiona));
  await expect(page).toHaveURL(/\/admin\/today$/);
  await expect(page.getByText("Fiona · Helper")).toBeVisible();
  await page.goto("/admin/money");
  await expect(page).toHaveURL(/\/admin\/today\?for=owner$/);
  await expect(page.getByText("That page is for the owner.")).toBeVisible();
});

test("the first Owner is Linda, from the deploy settings", async () => {
  const { db, close } = connect();
  try {
    await ensureFirstOwner(db, { email: OWNER, name: "Linda" });
    const [linda] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.email, OWNER));
    expect(linda).toMatchObject({
      name: "Linda",
      role: "owner",
      status: "active",
    });
  } finally {
    await close();
  }
});

test("a stranger gets the same code step and no code; Wrong address? Start again", async ({
  page,
}) => {
  const stranger = `nobody-${Date.now()}@example.com`;
  await askCode(page, stranger);
  const { db, close } = connect();
  try {
    expect(
      await db.select().from(mailSends).where(eq(mailSends.to, stranger)),
    ).toHaveLength(0);
  } finally {
    await close();
  }
  await page
    .getByRole("button", { name: "Wrong address? Start again" })
    .click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(stranger);
});

for (const [w, h] of [
  [402, 902],
  [1280, 800],
] as const)
  test(`screenshots at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email").fill(await member("Linda", "owner"));
    await page.screenshot({ path: `.shots/8.1/sign-in-${w}.png` });
    await page.getByRole("button", { name: "Send me a code" }).click();
    await page.getByRole("heading", { name: "Check your email" }).waitFor();
    await page.getByLabel("Digit 1 of 6").click();
    await page.keyboard.type("419");
    await page.screenshot({ path: `.shots/8.1/code-${w}.png` });
  });
