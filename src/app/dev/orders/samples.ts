// Sample orders for /dev/orders (phase 6): the random ones of Make sample orders and the fixed-link check orders of
// Bohoka's document. Development and previews only.
import { eq } from "drizzle-orm";
import { readOptions } from "@/db/cake-page-repo";
import type { connect } from "@/db/client";
import { cakes, orderLines, orders } from "@/db/schema";
import { allergenLine, type Answers } from "@/lib/cake-config";
import type { AllergenSet } from "@/lib/cakes";
import { optionsLine } from "@/lib/order-line";

type Db = ReturnType<typeof connect>["db"];

export type Sample = {
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
  /** Ticked “once a year” at the order (the unsubscribe check). */
  marketing?: boolean;
};

/** One sample order with its cake line; returns its id. */
export async function insertSample(
  db: Db,
  s: Sample,
  ids: {
    number: string;
    token: string;
    paymentIntentId: string;
    email: string;
  },
) {
  const [o] = await db
    .insert(orders)
    .values({
      number: ids.number,
      kind: s.kind ?? "catalogue",
      status: s.status ?? "confirmed",
      token: ids.token,
      date: s.date,
      earliestDate: s.earliest ?? s.date,
      handover: s.handover,
      deliveryWindow: s.handover === "delivery" ? "morning" : null,
      address: s.handover === "delivery" ? "48 Preston Road" : null,
      town: s.handover === "delivery" ? "Linlithgow" : null,
      postcode: s.handover === "delivery" ? "EH49 6HH" : null,
      customerName: s.name,
      email: ids.email,
      phone: "07700 900 358",
      phoneE164: "+447700900358",
      allergyNote: "No nuts",
      consents: {},
      totalPence: s.unpaid ? 38000 : s.serves === 32 ? 24000 : 18500,
      amountReceivedPence: s.unpaid ? 0 : s.serves === 32 ? 24000 : 18500,
      // A sample has no Stripe payment: on a preview with real test keys its refund fails and Linda is told.
      paymentIntentId: s.unpaid ? null : ids.paymentIntentId,
      marketingOptIn: !!s.marketing,
      snapshot: {},
      confirmedAt: new Date(),
    })
    .returning({ id: orders.id });
  if (s.cake) {
    const [cake] = await db.select().from(cakes).where(eq(cakes.slug, s.cake));
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
    return o;
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
    flavour: s.kind === "manual" ? "" : "Vanilla sponge, raspberry conserve",
    message: s.kind === "manual" ? null : "Happy 30th, Mairi",
    pricePence: s.unpaid ? 38000 : s.serves === 32 ? 24000 : 18500,
    allergenText: "Contains gluten (wheat), eggs and milk.",
    allergenKeys: [],
  });
  return o;
}
