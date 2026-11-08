"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import {
  chooseCollect,
  finishRedelivery,
  prepareRedelivery,
  type RedeliverResult,
} from "@/db/delivery-repo";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";
import { gateway } from "@/lib/payments";

const sendMail = (db: ReturnType<typeof connect>["db"]) =>
  processMail(db, mailTransport(), SITE_URL).catch((e) =>
    console.error("delivery choice mail", e),
  );

/** Yes, I will collect it (§6.8): recorded once; the page then shows G (or the closed line). */
export async function collectAction(token: string) {
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const r = await chooseCollect(db, token, new Date(), gateway());
      if (r.kind === "chosen") await sendMail(db);
    } finally {
      await close();
    }
  }
  redirect(`/delivery/${token}`);
}

/**
 * Pay £15 / Book the redelivery (§6.8): the window is checked and the fee's PaymentIntent made on the server; with no
 * fee the redelivery is booked at once.
 */
export async function redeliverAction(
  token: string,
  window: string,
): Promise<RedeliverResult | { kind: "failed" }> {
  if (!databaseUrl()) return { kind: "failed" };
  const { db, close } = connect();
  try {
    const r = await prepareRedelivery(db, gateway(), { token, window });
    if (r.kind === "booked") await sendMail(db);
    return r;
  } catch (e) {
    console.error("redeliver", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** After Stripe answered on the page: booked (with Linda's alert), still processing, or not taken. */
export async function finishRedeliveryAction(token: string) {
  const gw = gateway();
  if (!gw || !databaseUrl()) return "failed" as const;
  const { db, close } = connect();
  try {
    const r = await finishRedelivery(db, gw, token);
    if (r === "booked") await sendMail(db);
    return r;
  } finally {
    await close();
  }
}
