"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import { eq } from "drizzle-orm";
import { readOptions } from "@/db/cake-page-repo";
import { cakes, closedDays, orderLines, orders, settings } from "@/db/schema";
import { readSettings } from "@/db/settings-repo";
import { SETTINGS_TAG } from "@/db/site-settings";
import { updateTag } from "next/cache";
import { allergenLine, type Answers } from "@/lib/cake-config";
import type { AllergenSet } from "@/lib/cakes";
import { optionsLine } from "@/lib/order-line";
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
    const samples: {
      date: string;
      handover: string;
      name: string;
      kind?: string;
      status?: string;
      /** The Lothian's size: 24 (£185) unless given; 32 (£240) can be made smaller (6.2b). */
      serves?: number;
      /** Another cake with options (6.2d): Bramble & Cream with a vanilla sponge. */
      cake?: string;
      /** Moved later (6.3): the earliest date it has had, when it differs. */
      earliest?: string;
      /** Nothing paid yet (6.6): £380 to pay through payment links. */
      unpaid?: boolean;
    }[] = [
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
    for (const [i, s] of samples.entries()) {
      const [o] = await db
        .insert(orders)
        .values({
          number: `BBL-DEV-${stamp}${i}`,
          kind: s.kind ?? "catalogue",
          status: s.status ?? "confirmed",
          token: randomBytes(24).toString("base64url"),
          date: s.date,
          earliestDate: s.earliest ?? s.date,
          handover: s.handover,
          deliveryWindow: s.handover === "delivery" ? "morning" : null,
          address: s.handover === "delivery" ? "48 Preston Road" : null,
          town: s.handover === "delivery" ? "Linlithgow" : null,
          postcode: s.handover === "delivery" ? "EH49 6HH" : null,
          customerName: s.name,
          email: "sample@example.com",
          phone: "07700 900 358",
          phoneE164: "+447700900358",
          allergyNote: "No nuts",
          consents: {},
          totalPence: s.unpaid ? 38000 : s.serves === 32 ? 24000 : 18500,
          amountReceivedPence: s.unpaid ? 0 : s.serves === 32 ? 24000 : 18500,
          // A sample has no Stripe payment: on a preview with real test keys its refund fails and Linda is told.
          paymentIntentId: s.unpaid ? null : `pi_dev_${stamp}${i}`,
          snapshot: {},
          confirmedAt: new Date(),
        })
        .returning({ id: orders.id });
      if (s.cake) {
        const [cake] = await db
          .select()
          .from(cakes)
          .where(eq(cakes.slug, s.cake));
        const opts = cake ? await readOptions(db, cake.id) : [];
        const sponge = opts.find((x) => x.label === "Sponge");
        const answers: Answers = {
          picks: sponge ? { [sponge.id]: [sponge.choices[0].id] } : {},
          texts: {},
        };
        const own = cake && {
          allergens: cake.allergens as AllergenSet["allergens"],
          glutenKinds: cake.glutenKinds,
          nutKinds: cake.nutKinds,
          alsoContains: cake.alsoContains,
        };
        await db.insert(orderLines).values({
          orderId: o.id,
          position: 1,
          slug: s.cake,
          name: cake?.name ?? "Bramble & Cream",
          sizeLine: "Two tiers · serves 24",
          flavour: cake?.flavour ?? "",
          options: optionsLine(opts, answers),
          answers,
          message: "",
          pricePence: 18500,
          sizePricePence: 18500,
          allergenText: own ? allergenLine(own, opts, answers, []) : "",
          allergenKeys: [],
        });
        continue;
      }
      await db.insert(orderLines).values({
        orderId: o.id,
        position: 1,
        slug: s.kind === "manual" ? "" : "the-lothian",
        name:
          s.kind === "manual"
            ? "Two-tier wedding cake, white roses"
            : "The Lothian",
        sizeLine: `Two tiers · serves ${s.serves ?? 24}`,
        flavour:
          s.kind === "manual" ? "" : "Vanilla sponge, raspberry conserve",
        message: s.kind === "manual" ? null : "Happy 30th, Mairi",
        pricePence: s.unpaid ? 38000 : s.serves === 32 ? 24000 : 18500,
        allergenText: "Contains gluten (wheat), eggs and milk.",
        allergenKeys: [],
      });
    }
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
