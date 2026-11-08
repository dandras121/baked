// The check orders of Bohoka's phase 6 document (2026-11-08: “every step should open the page it is about”): fixed
// numbers and fixed links, so the document's links always work. Resetting removes them and makes them again with
// dates counted from today; a step that changes an order (cancel, pay, collect) can then be done again.
import { eq, like } from "drizzle-orm";
import type { connect } from "@/db/client";
import { emailHash } from "@/db/consent-repo";
import {
  consentEvents,
  deliveryAttempts,
  mailAddresses,
  orders,
  paymentLinks,
} from "@/db/schema";
import { addDays, type CalendarDate } from "@/lib/london-time";
import { insertSample, type Sample } from "./samples";

type Db = ReturnType<typeof connect>["db"];

export const CHECK_EMAIL = "check@example.com";
/** The unsubscribe link of CHECK_EMAIL (one per address, §6.10). */
export const CHECK_UNSUBSCRIBE = "chk6-unsubscribe-check-address";

/** A fixed status token: “chk6-” + the key, padded to the 20 characters a token needs at least. */
const token = (key: string) => `chk6-${key}`.padEnd(24, "0");

type Check = Sample & {
  key: string;
  /** What it is for in the document. */
  use: string;
  /** Delivery attempts to make (§6.8), each with a fixed delivery token. */
  attempts?: {
    attempt: number;
    dayOffset: number;
    outcome: "none" | "nobody-in";
    recordedOffset?: number;
    choice?: "none" | "redeliver";
    deliveryKey?: string;
  }[];
  /** Payment links to make (§6.9), each with a fixed token. */
  links?: {
    key: string;
    purpose: "deposit" | "rest";
    pence: number;
    status: "open" | "paid" | "withdrawn";
  }[];
};

const d = (today: CalendarDate, n: number) => addDays(today, n);

/** The check orders, in the document's order; dates from `today`. */
export function checkOrders(today: CalendarDate): Check[] {
  return [
    {
      key: "a-delivery",
      use: "6.1 A booked, wrong postcode, Message Linda",
      date: d(today, 10),
      handover: "delivery",
      name: "Mairi Sinclair",
    },
    {
      key: "a-collection",
      use: "6.1 A booked, collection (phone digits)",
      date: d(today, 10),
      handover: "collection",
      name: "Callum Reid",
    },
    {
      key: "b-tomorrow",
      use: "6.1 B, 6.2 A2, 6.3 too late",
      date: d(today, 1),
      handover: "delivery",
      name: "Fiona Clark",
    },
    {
      key: "b2-today",
      use: "6.1 B2",
      date: today,
      handover: "delivery",
      name: "Ailsa Ross",
    },
    {
      key: "c-after",
      use: "6.1 C, 6.6 unsubscribe",
      date: d(today, -5),
      handover: "delivery",
      name: "Graeme Hay",
      status: "completed",
      marketing: true,
    },
    {
      key: "bespoke",
      use: "6.1 bespoke rules",
      date: d(today, 15),
      handover: "collection",
      name: "Morven Bell",
      kind: "manual",
    },
    {
      key: "expired",
      use: "6.1 expired link (D)",
      date: d(today, -40),
      handover: "delivery",
      name: "Shona Baird",
    },
    {
      key: "change-message",
      use: "6.2 message, date and window, two tabs",
      date: d(today, 10),
      handover: "delivery",
      name: "Eilidh Grant",
    },
    {
      key: "size-down",
      use: "6.2 smaller size",
      date: d(today, 11),
      handover: "delivery",
      name: "Kirsty Lamb",
      serves: 32,
    },
    {
      key: "size-up",
      use: "6.2 bigger size (pay)",
      date: d(today, 10),
      handover: "collection",
      name: "Hamish Reid",
    },
    {
      key: "options",
      use: "6.2 options",
      date: d(today, 12),
      handover: "collection",
      name: "Rory Fraser",
      cake: "bramble-and-cream",
    },
    {
      key: "cancel-full",
      use: "6.3 full refund, then E",
      date: d(today, 10),
      handover: "delivery",
      name: "Catriona Wood",
    },
    {
      key: "cancel-half",
      use: "6.3 half refund",
      date: d(today, 6),
      handover: "delivery",
      name: "Iona Grant",
    },
    {
      key: "cancel-moved",
      use: "6.3 counted from the earliest date",
      date: d(today, 13),
      earliest: d(today, 6),
      handover: "delivery",
      name: "Euan Murray",
    },
    {
      key: "nobody-press",
      use: "6.5 Linda presses Nobody was in",
      date: today,
      handover: "delivery",
      name: "Lewis Murray",
    },
    {
      key: "nobody-collect",
      use: "6.5 Collect → G",
      date: today,
      handover: "delivery",
      name: "Skye Paterson",
      attempts: [
        {
          attempt: 1,
          dayOffset: 0,
          outcome: "nobody-in",
          recordedOffset: 0,
          deliveryKey: "collect",
        },
      ],
    },
    {
      key: "nobody-redeliver",
      use: "6.5 Redeliver £15 → H",
      date: today,
      handover: "delivery",
      name: "Ross Campbell",
      attempts: [
        {
          attempt: 1,
          dayOffset: 0,
          outcome: "nobody-in",
          recordedOffset: 0,
          deliveryKey: "redeliver",
        },
      ],
    },
    {
      key: "nobody-free",
      use: "6.5 Redeliver free (fee switch)",
      date: today,
      handover: "delivery",
      name: "Isla Ross",
      attempts: [
        {
          attempt: 1,
          dayOffset: 0,
          outcome: "nobody-in",
          recordedOffset: 0,
          deliveryKey: "free",
        },
      ],
    },
    {
      key: "nobody-closed-tomorrow",
      use: "6.5 Tomorrow closed (switch)",
      date: today,
      handover: "delivery",
      name: "Calum Hay",
      attempts: [
        {
          attempt: 1,
          dayOffset: 0,
          outcome: "nobody-in",
          recordedOffset: 0,
          deliveryKey: "tomorrow-closed",
        },
      ],
    },
    {
      key: "nobody-expired",
      use: "6.5 choices closed after 23:59",
      date: d(today, -1),
      handover: "delivery",
      name: "Morag Kerr",
      attempts: [
        {
          attempt: 1,
          dayOffset: -1,
          outcome: "nobody-in",
          recordedOffset: -1,
          deliveryKey: "choices-closed",
        },
      ],
    },
    {
      key: "nobody-second",
      use: "6.5 second failed attempt",
      date: d(today, -1),
      handover: "delivery",
      name: "Fraser Bell",
      attempts: [
        {
          attempt: 1,
          dayOffset: -1,
          outcome: "nobody-in",
          recordedOffset: -1,
          choice: "redeliver",
          deliveryKey: "first-attempt",
        },
        { attempt: 2, dayOffset: 0, outcome: "none" },
      ],
    },
    {
      key: "pay-deposit",
      use: "6.6 pay a deposit link",
      date: d(today, 20),
      handover: "collection",
      name: "Isla Morrison",
      kind: "manual",
      unpaid: true,
      links: [
        { key: "deposit", purpose: "deposit", pence: 12000, status: "open" },
      ],
    },
    {
      key: "pay-withdrawn",
      use: "6.6 a withdrawn link",
      date: d(today, 20),
      handover: "collection",
      name: "Kenneth Ross",
      kind: "manual",
      unpaid: true,
      links: [
        {
          key: "withdrawn",
          purpose: "rest",
          pence: 38000,
          status: "withdrawn",
        },
      ],
    },
    {
      key: "pay-paid",
      use: "6.6 already paid",
      date: d(today, 20),
      handover: "collection",
      name: "Ailsa Grant",
      kind: "manual",
      unpaid: true,
      links: [
        { key: "paid", purpose: "deposit", pence: 12000, status: "paid" },
      ],
    },
  ];
}

/** The fixed links of a check order (status page and its sub-pages; delivery and payment links). */
export const checkLinks = {
  status: (key: string) => `/my-order/${token(key)}`,
  delivery: (key: string) => `/delivery/${token(`d-${key}`)}`,
  pay: (key: string) => `/pay/${token(`p-${key}`)}`,
  unsubscribe: `/unsubscribe/${CHECK_UNSUBSCRIBE}`,
};

/** Removes the check orders and makes them again, counted from `today`; the check address is subscribed again. */
export async function resetCheckOrders(db: Db, today: CalendarDate, now: Date) {
  await db.delete(orders).where(like(orders.number, "BBL-CHK-%"));
  const hash = emailHash(CHECK_EMAIL);
  await db.delete(consentEvents).where(eq(consentEvents.emailHash, hash));
  await db
    .delete(mailAddresses)
    .where(eq(mailAddresses.token, CHECK_UNSUBSCRIBE));
  await db.delete(mailAddresses).where(eq(mailAddresses.emailHash, hash));
  await db
    .insert(mailAddresses)
    .values({ emailHash: hash, token: CHECK_UNSUBSCRIBE });
  for (const [i, c] of checkOrders(today).entries()) {
    const number = `BBL-CHK-${String(i + 1).padStart(2, "0")}`;
    const o = await insertSample(db, c, {
      number,
      token: token(c.key),
      paymentIntentId: `pi_dev_chk_${c.key}`,
      email: CHECK_EMAIL,
    });
    for (const a of c.attempts ?? [])
      await db.insert(deliveryAttempts).values({
        orderId: o.id,
        attempt: a.attempt,
        day: d(today, a.dayOffset),
        deliveryWindow: "morning",
        outcome: a.outcome,
        recordedOn:
          a.recordedOffset === undefined ? null : d(today, a.recordedOffset),
        recordedAt: a.recordedOffset === undefined ? null : now,
        token: a.deliveryKey ? token(`d-${a.deliveryKey}`) : null,
        choice: a.choice ?? "none",
        chosenAt: a.choice ? now : null,
        feePence: a.choice === "redeliver" ? 1500 : null,
      });
    for (const l of c.links ?? [])
      await db.insert(paymentLinks).values({
        orderId: o.id,
        token: token(`p-${l.key}`),
        purpose: l.purpose,
        amountPence: l.pence,
        status: l.status,
        paidPence: l.status === "paid" ? l.pence : 0,
        paidAt: l.status === "paid" ? now : null,
        sentOn: today,
        createdAt: now,
      });
  }
}
