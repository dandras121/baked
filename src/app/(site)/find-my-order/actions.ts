"use server";

import { headers } from "next/headers";
import { SITE_URL } from "@/app/layout";
import type { ResendState } from "@/app/(site)/my-order/[token]/actions";
import { connect, databaseUrl } from "@/db/client";
import { connectionKey } from "@/db/contact-repo";
import { processMail } from "@/db/mail-repo";
import { sendOrderLinks } from "@/db/order-link-repo";
import { CONTACT, isEmail } from "@/lib/contact";
import { mailTransport } from "@/lib/mail/transport";

export type FindState = ResendState & { number: string };

/**
 * Send me the link (§6.7): a filled honeypot gets the normal answer and nothing else; then the shared Find my order
 * limits and e-mail 16 — for the order with that number, or every order of the address whose link still works.
 * Always the same answer F.
 */
export async function findOrder(
  _previous: FindState,
  form: FormData,
): Promise<FindState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .slice(0, 200);
  const number = String(form.get("number") ?? "")
    .trim()
    .slice(0, 40);
  if (String(form.get(CONTACT.honeypot) ?? "").trim())
    return { email, number, outcome: "sent" };
  if (!isEmail(email)) return { email, number, outcome: "invalid" };
  if (!databaseUrl()) return { email, number, outcome: "failed" };
  const h = await headers();
  const { db, close } = connect();
  try {
    const result = await sendOrderLinks(db, {
      email,
      number: number || null,
      connection: connectionKey(
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          h.get("x-real-ip") ||
          "unknown",
      ),
    });
    if (result === "sent")
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.error("find my order mail", e),
      );
    return { email, number, outcome: result };
  } catch (e) {
    console.error("find my order", e);
    return { email, number, outcome: "failed" };
  } finally {
    await close();
  }
}
