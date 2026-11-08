"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import { eq } from "drizzle-orm";
import { closedDays, settings } from "@/db/schema";
import { insertSample, type Sample } from "./samples";
import { resetCheckOrders } from "./check-pack";
import { readSettings } from "@/db/settings-repo";
import { SETTINGS_TAG } from "@/db/site-settings";
import { updateTag } from "next/cache";
import { addDays, londonDate } from "@/lib/london-time";
import { SITE_URL } from "@/app/layout";
import { recordNobodyIn } from "@/db/delivery-repo";
import {
  createPayLink,
  withdrawPayLink,
  type PayPurpose,
} from "@/db/pay-link-repo";
import { gateway } from "@/lib/payments";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";

/**
 * Sample orders for trying the status link (phase 6, Bohoka 2026-11-07): one for each state of the status page —
 * A booked (delivery, collection, a manual order), B tomorrow, B2 today, C after the date (and handed over today) —
 * and one whose link has expired (its date 40 days ago). Development and previews only.
 */
export async function makeSamples() {
  if (!databaseUrl()) return;
  const today = londonDate(new Date());
  const { db, close } = connect();
  try {
    const stamp = Date.now().toString().slice(-4);
    const samples: Sample[] = [
      {
        date: addDays(today, 10),
        handover: "delivery",
        name: "Mairi Sinclair",
      },
      { date: addDays(today, 10), handover: "collection", name: "Callum Reid" },
      { date: addDays(today, -40), handover: "delivery", name: "Shona Baird" },
      {
        date: addDays(today, 12),
        handover: "collection",
        name: "Rory Fraser",
        cake: "bramble-and-cream",
      },
      // Cancelling inside seven days: half back (6.3); and one moved later, counted from its earliest date.
      { date: addDays(today, 6), handover: "delivery", name: "Iona Grant" },
      {
        date: addDays(today, 13),
        earliest: addDays(today, 6),
        handover: "delivery",
        name: "Euan Murray",
      },
      // B tomorrow, C after the date (handed over), a serves-32 cake to make smaller (6.2b), a paid bespoke order.
      { date: addDays(today, 1), handover: "delivery", name: "Fiona Clark" },
      {
        date: addDays(today, -5),
        handover: "delivery",
        name: "Graeme Hay",
        status: "completed",
      },
      {
        date: addDays(today, 11),
        handover: "delivery",
        name: "Kirsty Lamb",
        serves: 32,
      },
      {
        date: addDays(today, 15),
        handover: "collection",
        name: "Morven Bell",
        kind: "manual",
      },
      // Delivery day (6.5): today, for Linda's Nobody was in.
      { date: today, handover: "delivery", name: "Ailsa Ross" },
      // A bespoke order with nothing paid yet (6.6): Linda sends a deposit and the rest as payment links.
      {
        date: addDays(today, 20),
        handover: "collection",
        name: "Isla Morrison",
        kind: "manual",
        unpaid: true,
      },
    ];
    for (const [i, s] of samples.entries())
      await insertSample(db, s, {
        number: `BBL-DEV-${stamp}${i}`,
        token: randomBytes(24).toString("base64url"),
        paymentIntentId: `pi_dev_${stamp}${i}`,
        email: "sample@example.com",
      });
  } finally {
    await close();
  }
  redirect("/dev/orders");
}

/**
 * Linda's Nobody was in (§6.8, Admin / 21) until the admin exists: records it on the order's latest attempt and sends
 * e-mail 13 to the outbox.
 */
export async function nobodyWasIn(orderId: number) {
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    await recordNobodyIn(db, orderId);
    await processMail(db, mailTransport(), SITE_URL).catch((e) =>
      console.error("missed-you mail", e),
    );
  } finally {
    await close();
  }
  redirect("/dev/orders");
}

/** Linda's Send a payment link (§9.8) until the admin exists: e-mail 15 to the outbox with the link. */
export async function sendPayLink(orderId: number, form: FormData) {
  if (!databaseUrl()) return;
  const purpose = String(form.get("purpose") ?? "rest") as PayPurpose;
  const pounds = Number(
    String(form.get("amount") ?? "").replace(/[£,\s]/g, ""),
  );
  const { db, close } = connect();
  try {
    await createPayLink(db, {
      orderId,
      purpose,
      amountPence: Math.round(pounds * 100),
    });
    await processMail(db, mailTransport(), SITE_URL).catch((e) =>
      console.error("pay-link mail", e),
    );
  } finally {
    await close();
  }
  redirect("/dev/orders");
}

/** Linda's Cancel this link (§9.5). */
export async function withdrawLink(linkId: number) {
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    await withdrawPayLink(db, gateway(), linkId);
  } finally {
    await close();
  }
  redirect("/dev/orders");
}

/**
 * Settings Linda changes in the admin (§11.1, §11.2) that the phase 6 checks need (Bohoka's list 6.5): the redelivery
 * fee £15 or free, and tomorrow closed or open.
 */
export async function toggleRedeliveryFee() {
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    const s = await readSettings(db);
    await db
      .update(settings)
      .set({ secondAttemptFeePence: s.secondAttemptFeePence > 0 ? 0 : 1500 });
  } finally {
    await close();
  }
  // The public pages read Settings through a cache; saving them refreshes it, as the admin will (9.x).
  updateTag(SETTINGS_TAG);
  redirect("/dev/orders");
}

export async function toggleTomorrowClosed() {
  if (!databaseUrl()) return;
  const tomorrow = addDays(londonDate(new Date()), 1);
  const { db, close } = connect();
  try {
    const gone = await db
      .delete(closedDays)
      .where(eq(closedDays.day, tomorrow))
      .returning();
    if (!gone.length)
      await db
        .insert(closedDays)
        .values({ day: tomorrow, note: "Closed from /dev/orders" });
  } finally {
    await close();
  }
  redirect("/dev/orders");
}

/** Reset the check orders (Bohoka's phase 6 document): the same links, dates from today. */
export async function resetChecks() {
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    const now = new Date();
    await resetCheckOrders(db, londonDate(now), now);
  } finally {
    await close();
  }
  redirect("/dev/orders");
}
