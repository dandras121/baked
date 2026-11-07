import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connect } from "../src/db/client";
import { emailHash, listState, tokenFor } from "../src/db/consent-repo";

// Slice 5.3: /unsubscribe/[token] (§6.10, §8.4 Unsubscribe). Opening changes nothing; every change is a POST.
async function freshToken() {
  process.loadEnvFile?.(".env.local");
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { db, close } = connect();
  try {
    return { email, token: await tokenFor(db, email) };
  } finally {
    await close();
  }
}
async function state(email: string, list: "yearly" | "thanks" = "yearly") {
  const { db, close } = connect();
  try {
    return await listState(db, emailHash(email), list);
  } finally {
    await close();
  }
}

test("opening the link changes nothing; Stop these emails shows J; Turn emails back on; opening again shows J", async ({
  page,
}) => {
  const { email, token } = await freshToken();
  const res = await page.goto(`/unsubscribe/${token}`);
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { name: "Stop the once-a-year e-mail?" }),
  ).toBeVisible();
  expect(await state(email)).toBe("in");
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);

  await page.getByRole("button", { name: "Stop these emails" }).click();
  await expect(page.getByText("You’re off the list")).toBeVisible();
  await expect(
    page.getByText("I’ve taken this address off the once-a-year e-mail."),
  ).toBeVisible();
  expect(await state(email)).toBe("out");

  await page.getByRole("button", { name: "Turn emails back on" }).click();
  await expect(page.getByText("You’re back on the list.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Stop these emails" }),
  ).toBeVisible();
  expect(await state(email)).toBe("in");

  await page.getByRole("button", { name: "Stop these emails" }).click();
  await page.goto(`/unsubscribe/${token}`);
  await expect(page.getByText("You’re off the list")).toBeVisible();
});

test("the mail app's one-click POST records it with no page; an unknown token says what to do", async ({
  page,
}) => {
  const { email, token } = await freshToken();
  const res = await page.request.post(`/unsubscribe/${token}`, {
    form: { "List-Unsubscribe": "One-Click" },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe("");
  expect(await state(email)).toBe("out");
  await page.goto("/unsubscribe/not-a-real-token-at-all-0000");
  await expect(page.getByText("This link didn’t work.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /@/ })).toHaveAttribute(
    "href",
    /^mailto:/,
  );
});

test("No more thank-you e-mails: its own list, the yearly one untouched", async ({
  page,
}) => {
  const { email, token } = await freshToken();
  await page.goto(`/unsubscribe/${token}?list=thanks`);
  await expect(
    page.getByRole("heading", { name: "Stop the thank-you e-mails?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop these emails" }).click();
  await expect(page.getByText("I won’t send thank-you e-mails")).toBeVisible();
  expect(await state(email, "thanks")).toBe("out");
  expect(await state(email, "yearly")).toBe("in");
});
