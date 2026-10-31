import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { CONTACT_COPY } from "../src/lib/contact";
import { INITIAL_SETTINGS as S } from "../src/lib/settings";

// Slice 2.7: Contact and Message sent (§7.4, §10.8, §10.9, ANIM-19).
const dbUrl = process.env.DATABASE_URL;

/** Each test sends from its own connection, so the send limit (§10.9) of one test never touches another. */
async function ownConnection(page: Page) {
  const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomUUID()}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
}

const field = (page: Page, label: RegExp) => page.getByLabel(label);
const send = (page: Page) => page.getByRole("button", { name: "Send message" });

async function fill(page: Page, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values))
    await field(page, new RegExp(`^${label}`, "i")).fill(value);
}

async function storedWith(text: string) {
  if (!dbUrl) return null;
  const sql = postgres(dbUrl, { max: 1 });
  try {
    const rows =
      await sql`select name, email, phone, message, page from contact_messages where message = ${text}`;
    return rows;
  } finally {
    await sql.end();
  }
}

test.beforeEach(async ({ page }) => ownConnection(page));

test("the page: “Tell me about it.”, the form, and the details from Settings", async ({
  page,
}) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tell me about it.",
  );
  for (const label of [
    /^your name/i,
    /^email/i,
    /^phone \(optional\)/i,
    /^what can i help with/i,
  ])
    await expect(field(page, label)).toBeVisible();
  await expect(field(page, /^your name/i)).toHaveValue("");
  const details = page.getByRole("region", { name: "The details" });
  await expect(details.getByRole("link", { name: S.email })).toHaveAttribute(
    "href",
    `mailto:${S.email}`,
  );
  await expect(details.getByRole("link", { name: S.phone })).toHaveAttribute(
    "href",
    "tel:+447884199103",
  );
  await expect(details).toContainText(S.addressLine);
  await expect(details).toContainText(S.postcode);
  await expect(details).toContainText(S.deliveryArea);
  await expect(details).toContainText("Most days, including evenings");
  await expect(page.getByText("0 / 400")).toBeVisible();
});

test("§10.8 an empty send: every required field says what to do, focus on the first, nothing is sent", async ({
  page,
}) => {
  await page.goto("/contact");
  await send(page).click();
  await expect(page.getByText(CONTACT_COPY.nameMissing)).toBeVisible();
  await expect(page.getByText(CONTACT_COPY.emailMissing)).toBeVisible();
  await expect(page.getByText(CONTACT_COPY.messageMissing)).toBeVisible();
  await expect(field(page, /^your name/i)).toBeFocused();
  await expect(field(page, /^your name/i)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(field(page, /^your name/i)).toHaveAttribute(
    "aria-describedby",
    /contact-name-error/,
  );
  // The optional phone has no error.
  await expect(field(page, /^phone/i)).not.toHaveAttribute("aria-invalid");
  await expect(page).toHaveURL(/\/contact$/);
});

test("§10.8 a wrong e-mail, a wrong phone and a long message: each says so; correcting clears it as you type", async ({
  page,
}) => {
  await page.goto("/contact");
  await fill(page, {
    "your name": "Mairi Sinclair",
    email: "mairi@example",
    phone: "12345",
    "what can i help with": "a".repeat(401),
  });
  await expect(page.getByText("401 / 400")).toBeVisible();
  await send(page).click();
  await expect(page.getByText(CONTACT_COPY.emailInvalid)).toBeVisible();
  await expect(page.getByText(CONTACT_COPY.phoneInvalid)).toBeVisible();
  await expect(page.getByText(CONTACT_COPY.messageLong(401))).toBeVisible();
  await expect(field(page, /^email/i)).toBeFocused();
  await field(page, /^email/i).fill("mairi@example.co.uk");
  await expect(page.getByText(CONTACT_COPY.emailInvalid)).toBeHidden();
  await expect(field(page, /^email/i)).not.toHaveAttribute("aria-invalid");
});

test("§7.4 a correct send: stored, Message sent, the phone line and Back to the designs", async ({
  page,
}) => {
  const text = `A christening cake for March — ${randomUUID()}`;
  await page.goto("/contact");
  await fill(page, {
    "your name": "Mairi Sinclair",
    email: "mairi@example.co.uk",
    phone: "07700 900 000",
    "what can i help with": text,
  });
  await send(page).click();
  await expect(page).toHaveURL(/\/contact\/sent\?t=/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Thank you\s*for sharing it\./,
  );
  await expect(
    page.locator("main").getByRole("link", { name: S.phone }),
  ).toHaveAttribute("href", "tel:+447884199103");
  await expect(
    page.getByRole("link", { name: "Back to the designs" }),
  ).toHaveAttribute("href", "/cakes");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  const rows = await storedWith(text);
  if (rows)
    expect(rows).toEqual([
      {
        name: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "+447700900000",
        message: text,
        page: "/contact",
      },
    ]);
});

test("§10.8 a lost connection: “Nothing was sent — please try again.” under the button, every input kept", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.route("**/contact", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await fill(page, {
    "your name": "Mairi Sinclair",
    email: "mairi@example.co.uk",
    "what can i help with": "A christening cake.",
  });
  await send(page).click();
  await expect(page.getByText(CONTACT_COPY.failed)).toBeVisible();
  await expect(send(page)).toBeEnabled();
  await expect(field(page, /^what can i help with/i)).toHaveValue(
    "A christening cake.",
  );
});

test("§7.4 Message sent opened directly goes to the form", async ({ page }) => {
  await page.goto("/contact/sent");
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tell me about it.",
  );
});

test("§7.1 a filled honeypot looks sent, and nothing is stored", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  const text = `Spam ${randomUUID()}`;
  await page.goto("/contact");
  await fill(page, {
    "your name": "Spam Bot",
    email: "bot@example.com",
    "what can i help with": text,
  });
  await page.locator('input[name="bbl_ref_2"]').fill("http://spam.example", {
    force: true,
  });
  await send(page).click();
  await expect(page).toHaveURL(/\/contact\/sent\?t=/);
  const rows = await storedWith(text);
  if (rows) expect(rows).toEqual([]);
});

test("§10.9 five sends an hour from one connection; the sixth says why, under the button", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one browser is enough");
  test.setTimeout(90_000);
  for (let i = 0; i < 6; i++) {
    await page.goto("/contact");
    await fill(page, {
      "your name": "Mairi Sinclair",
      email: "mairi@example.co.uk",
      "what can i help with": `Message ${i} ${randomUUID()}`,
    });
    await send(page).click();
    if (i < 5) await expect(page).toHaveURL(/\/contact\/sent\?t=/);
  }
  await expect(page.getByText(CONTACT_COPY.tooMany(S.email))).toBeVisible();
  await expect(page).toHaveURL(/\/contact$/);
  // Everything typed is kept.
  await expect(field(page, /^your name/i)).toHaveValue("Mairi Sinclair");
});

test("ANIM-19 reduced motion: the errors appear at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/contact");
  await send(page).click();
  const error = page.getByText(CONTACT_COPY.nameMissing);
  await expect(error).toBeVisible();
  expect(
    await error.evaluate(
      (el) =>
        el.getAnimations({ subtree: true }).length +
        el.closest("div")!.getAnimations().length,
    ),
  ).toBe(0);
});

test("axe: no violations on Contact (with errors) and Message sent", async ({
  page,
}, testInfo) => {
  await page.goto("/contact");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await send(page).click();
  await expect(page.getByText(CONTACT_COPY.nameMissing)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}_contact.png`),
    fullPage: true,
  });
  await fill(page, {
    "your name": "Mairi Sinclair",
    email: "mairi@example.co.uk",
    "what can i help with": `axe ${randomUUID()}`,
  });
  await send(page).click();
  await expect(page).toHaveURL(/\/contact\/sent\?t=/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("§10.8 the form still checks on the server and keeps what was typed", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one browser is enough");
    await page.goto("/contact");
    await fill(page, { "your name": "Mairi Sinclair", email: "mairi@example" });
    await send(page).click();
    await expect(page.getByText(CONTACT_COPY.emailInvalid)).toBeVisible();
    await expect(page.getByText(CONTACT_COPY.messageMissing)).toBeVisible();
    await expect(field(page, /^your name/i)).toHaveValue("Mairi Sinclair");
  });
});
