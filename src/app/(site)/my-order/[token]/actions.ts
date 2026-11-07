"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { connectionKey } from "@/db/contact-repo";
import { processMail } from "@/db/mail-repo";
import {
  checkLocked,
  orderForToken,
  recordCheck,
  sendOrderLinks,
} from "@/db/order-link-repo";
import { isEmail } from "@/lib/contact";
import { mailTransport } from "@/lib/mail/transport";
import {
  answerMatches,
  CHECK,
  UNLOCK_COOKIE,
  unlockValue,
} from "@/lib/order-link";

async function connection(): Promise<string> {
  const h = await headers();
  return connectionKey(
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown",
  );
}

export type OpenState = {
  answer: string;
  outcome: null | "empty" | "wrong" | "locked" | "failed";
};

/**
 * Open my order (§6.1): the answer is checked on the server; right → the unlock cookie (24 hours, httpOnly, only for
 * this link's pages) and the page asked for; wrong → “Nothing has opened yet”, the typed value kept; 5 wrong on the
 * link in 15 minutes, or 20 from one connection in an hour → locked.
 */
export async function openOrder(
  token: string,
  next: string,
  _previous: OpenState,
  form: FormData,
): Promise<OpenState> {
  const answer = String(form.get("answer") ?? "").slice(0, 20);
  if (!answer.trim()) return { answer, outcome: "empty" };
  if (!databaseUrl()) return { answer, outcome: "failed" };
  const { db, close } = connect();
  let ok = false;
  try {
    const found = await orderForToken(db, token);
    if (!found || !found.valid) redirect(`/my-order/${token}`);
    const who = await connection();
    if (await checkLocked(db, found.order.id, who))
      return { answer, outcome: "locked" };
    ok = answerMatches(found.order, answer);
    await recordCheck(db, found.order.id, who, ok);
    if (!ok)
      return {
        answer,
        outcome: (await checkLocked(db, found.order.id, who))
          ? "locked"
          : "wrong",
      };
  } finally {
    await close();
  }
  (await cookies()).set(UNLOCK_COOKIE, unlockValue(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/my-order/${token}`,
    maxAge: CHECK.cookieMs / 1000,
  });
  // Only this link's own pages (the e-mail 2 deep link to /change, later sub-pages).
  const safe = /^(\/[a-z-]+)?$/.test(next) ? next : "";
  redirect(`/my-order/${token}${safe}`);
}

export type ResendState = {
  email: string;
  outcome:
    null | "invalid" | "sent" | "limit-address" | "limit-connection" | "failed";
};

/** Send me a new link (§6.1 D): the Find my order limits, then e-mail 16; always the same answer F. */
export async function resendLink(
  _previous: ResendState,
  form: FormData,
): Promise<ResendState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .slice(0, 200);
  if (!isEmail(email)) return { email, outcome: "invalid" };
  if (!databaseUrl()) return { email, outcome: "failed" };
  const { db, close } = connect();
  try {
    const result = await sendOrderLinks(db, {
      email,
      connection: await connection(),
    });
    if (result === "sent")
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.error("order link mail", e),
      );
    return { email, outcome: result };
  } catch (e) {
    console.error("resend link", e);
    return { email, outcome: "failed" };
  } finally {
    await close();
  }
}
