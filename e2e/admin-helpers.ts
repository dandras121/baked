import { expect, type Page } from "@playwright/test";
import { desc, eq, like } from "drizzle-orm";
import { connect } from "../src/db/client";
import { formSends, mailSends, teamMembers } from "../src/db/schema";

const octet = () => Math.floor(Math.random() * 254) + 1;

/** A team member of this test alone (tests run side by side; a new code ends the earlier one). */
export async function newMember(name: string, role: "owner" | "helper") {
  const email = `${name.toLowerCase()}-${Date.now()}-${octet()}@example.com`;
  const { db, close } = connect();
  try {
    await db.insert(teamMembers).values({ name, email, role });
    await db.delete(formSends).where(like(formSends.form, "code:%"));
  } finally {
    await close();
  }
  return email;
}

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

/** Signs in through the real form with the code from the outbox; ends on Today. */
export async function signIn(
  page: Page,
  name: string,
  role: "owner" | "helper" = "owner",
) {
  const email = await newMember(name, role);
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
  });
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await page.getByRole("heading", { name: "Check your email" }).waitFor();
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(await codeFor(email));
  await expect(page).toHaveURL(/\/admin\/today$/);
  return email;
}
