"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { SITE_URL } from "@/app/layout";
import { connect } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import {
  checkedDay,
  markHandedOver,
  nobodyWasIn,
  undoHandedOver,
} from "@/db/today-actions-repo";
import { saveCollectionTime } from "@/db/order-detail-repo";
import { requireMember } from "@/lib/admin/session";
import { mailTransport } from "@/lib/mail/transport";

/** Today's buttons (§9.3): both roles; each checks the session, saves, and draws Today again. */
async function act(
  run: (db: ReturnType<typeof connect>["db"], by: string) => Promise<boolean>,
) {
  const { member } = await requireMember();
  const { db, close } = connect();
  try {
    await run(db, member.name);
  } finally {
    await close();
  }
  // Today, Orders and Order detail all show the result.
  revalidatePath("/admin", "layout");
}

export async function handOver(orderId: number) {
  await act((db, by) => markHandedOver(db, orderId, by));
}

export async function undoHandOver(orderId: number) {
  await act((db, by) => undoHandedOver(db, orderId, by));
}

export async function checkDay(orderId: number) {
  await act((db, by) => checkedDay(db, orderId, by));
}

/** Send the email (Admin / 21): records Nobody was in and sends e-mail 13 right after the answer. */
export async function sendMissedEmail(orderId: number) {
  await act((db, by) => nobodyWasIn(db, orderId, by));
  after(async () => {
    const { db, close } = connect();
    try {
      await processMail(db, mailTransport(), SITE_URL);
    } catch (e) {
      console.error("missed-you mail", e);
    } finally {
      await close();
    }
  });
}

/** Collection time (§9.5): saved on blur, no version check (last save wins, §9.1). */
export async function setCollectionTime(orderId: number, value: string) {
  const { member } = await requireMember();
  const { db, close } = connect();
  try {
    const r = await saveCollectionTime(db, orderId, value, member.name);
    if (r.kind === "saved") revalidatePath("/admin", "layout");
    return r.kind === "not-collection" ? null : r.time;
  } finally {
    await close();
  }
}
