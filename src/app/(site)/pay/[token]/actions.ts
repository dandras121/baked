"use server";

import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { finishPayLink, preparePayLink } from "@/db/pay-link-repo";
import { mailTransport } from "@/lib/mail/transport";
import { gateway } from "@/lib/payments";

/** Pay £… (§6.9): the link is checked again and its PaymentIntent made (once, then reused). */
export async function payLinkAction(token: string) {
  const gw = gateway();
  if (!gw || !databaseUrl()) return { kind: "failed" as const };
  const { db, close } = connect();
  try {
    return await preparePayLink(db, gw, token);
  } catch (e) {
    console.error("pay link", e);
    return { kind: "failed" as const };
  } finally {
    await close();
  }
}

/** After Stripe answered on the page: paid (with Linda's alert), still processing, or not taken. */
export async function finishPayLinkAction(token: string) {
  const gw = gateway();
  if (!gw || !databaseUrl()) return "failed" as const;
  const { db, close } = connect();
  try {
    const r = await finishPayLink(db, gw, token);
    if (r === "paid")
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.error("pay link mail", e),
      );
    return r;
  } finally {
    await close();
  }
}
