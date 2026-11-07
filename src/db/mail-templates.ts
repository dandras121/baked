// Every e-mail template by name (§8.1), with what it needs from the database. /dev/emails renders each one with
// sample data ({ sample: true }); the queue renders it again at every attempt (§8.4 Failures).
import type { Email } from "@/lib/mail/layout";
import {
  collectionDayEmail,
  dailyListEmail,
  onTheDayEmail,
  SAMPLE_LIST,
  SAMPLE_TODAY,
  twoDaysBeforeEmail,
  type Today,
} from "@/lib/mail/day-emails";
import {
  orderConfirmedEmail,
  SAMPLE_ORDER,
  type OrderMailView,
} from "@/lib/mail/order-confirmed";
import { TEMPLATES as PLAIN } from "@/lib/mail/templates";
import type { connect } from "./client";
import { readLegalRevision } from "./legal-repo";
import { orderMailView, todayRows } from "./order-mail-repo";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Data = Record<string, unknown>;
export type Template = (
  data: Data,
  db: Db,
  origin: string,
) => Promise<Email | null>;

/** Linda's phone and collection address as they are now (§11.1). */
async function today(db: Db): Promise<Today> {
  const s = await readSettings(db);
  return { phone: s.phone, collectionAddress: s.addressLine };
}

/** An order e-mail from { orderId }, or the drawn sample from { sample: true }. */
const orderEmail =
  (build: (v: OrderMailView, t: Today, origin: string) => Email): Template =>
  async (d, db, origin) => {
    if (d.sample)
      return build(
        d.collection
          ? { ...SAMPLE_ORDER, handover: "collection", window: null }
          : SAMPLE_ORDER,
        SAMPLE_TODAY,
        origin,
      );
    const v = await orderMailView(db, Number(d.orderId));
    return v && build(v, await today(db), origin);
  };

export const TEMPLATES: Record<string, Template> = {
  sample: async (d) => PLAIN.sample(d),
  /** E-mail 2 · Two days before. */
  "two-days-before": orderEmail(twoDaysBeforeEmail),
  /** E-mail 3 · On the day — delivery. */
  "on-the-day": orderEmail(onTheDayEmail),
  /** E-mail 3b · On the day — collection. */
  "collection-day": orderEmail(collectionDayEmail),
  /** E-mail 4 · Your daily list: data { day } — the rows as they are when it is sent; nothing when Today is empty. */
  "daily-list": async (d, db, origin) => {
    if (d.sample) return dailyListEmail(SAMPLE_LIST, origin);
    const rows = await todayRows(db, String(d.day));
    return rows.handovers.length || rows.notCollected.length
      ? dailyListEmail(rows, origin)
      : null;
  },
  /** E-mail 1 · Order confirmed: data { orderId } (or { sample: true }). */
  "order-confirmed": async (d, db, origin) => {
    if (d.sample) {
      // The sample with the current Terms and Cancellations, so its PDFs can be opened in /dev/mail.
      const [t, c] = await Promise.all([
        readLegalRevision(db, "terms"),
        readLegalRevision(db, "cancellations"),
      ]);
      return orderConfirmedEmail(
        {
          ...SAMPLE_ORDER,
          terms: t && { id: t.id, updatedOn: t.updatedOn },
          cancellations: c && { id: c.id, updatedOn: c.updatedOn },
        },
        origin,
      );
    }
    const view = await orderMailView(db, Number(d.orderId));
    return view && orderConfirmedEmail(view, origin);
  },
};

export const SAMPLES: { template: string; title: string; data: Data }[] = [
  {
    template: "order-confirmed",
    title: "1 · Order confirmed (1800:13257)",
    data: { sample: true },
  },
  {
    template: "two-days-before",
    title: "2 · Two days before (1128:9160)",
    data: { sample: true },
  },
  {
    template: "on-the-day",
    title: "3 · On the day — delivery (1128:9206)",
    data: { sample: true },
  },
  {
    template: "collection-day",
    title: "3b · On the day — collection (1128:9249)",
    data: { sample: true, collection: true },
  },
  {
    template: "daily-list",
    title: "4 · Your daily list, to the team (1155:9360)",
    data: { sample: true },
  },
  {
    template: "sample",
    title:
      "Layout sample — every part of the frame (drawn as e-mail 2, 1128:9160)",
    data: {},
  },
];
