"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import { orderLines, orders } from "@/db/schema";
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
    }[] = [
      {
        date: addDays(today, 10),
        handover: "delivery",
        name: "Mairi Sinclair",
      },
      { date: addDays(today, 10), handover: "collection", name: "Callum Reid" },
      { date: addDays(today, -40), handover: "delivery", name: "Shona Baird" },
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
          earliestDate: s.date,
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
          totalPence: 18500,
          amountReceivedPence: 18500,
          snapshot: {},
          confirmedAt: new Date(),
        })
        .returning({ id: orders.id });
      await db.insert(orderLines).values({
        orderId: o.id,
        position: 1,
        slug: s.kind === "manual" ? "" : "the-lothian",
        name:
          s.kind === "manual"
            ? "Two-tier wedding cake, white roses"
            : "The Lothian",
        sizeLine: "Two tiers · serves 24",
        flavour:
          s.kind === "manual" ? "" : "Vanilla sponge, raspberry conserve",
        message: s.kind === "manual" ? null : "Happy 30th, Mairi",
        pricePence: 18500,
        allergenText: "Contains gluten (wheat), eggs and milk.",
        allergenKeys: [],
      });
    }
  } finally {
    await close();
  }
  redirect("/dev/orders");
}
