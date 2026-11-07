"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import { eq } from "drizzle-orm";
import { readOptions } from "@/db/cake-page-repo";
import { cakes, orderLines, orders } from "@/db/schema";
import { allergenLine, type Answers } from "@/lib/cake-config";
import type { AllergenSet } from "@/lib/cakes";
import { optionsLine } from "@/lib/order-line";
import { addDays, londonDate } from "@/lib/london-time";

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
          totalPence: s.serves === 32 ? 24000 : 18500,
          amountReceivedPence: s.serves === 32 ? 24000 : 18500,
          // A sample has no Stripe payment: on a preview with real test keys its refund fails and Linda is told.
          paymentIntentId: `pi_dev_${stamp}${i}`,
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
        pricePence: s.serves === 32 ? 24000 : 18500,
        allergenText: "Contains gluten (wheat), eggs and milk.",
        allergenKeys: [],
      });
    }
  } finally {
    await close();
  }
  redirect("/dev/orders");
}
