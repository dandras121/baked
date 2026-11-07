// Every e-mail template by name (§8.1), with what it needs from the database. /dev/emails renders each one with
// sample data ({ sample: true }); the queue renders it again at every attempt (§8.4 Failures).
import {
  cancelledEmail,
  changeSavedEmail,
  complaintEmail,
  enquiryReceivedEmail,
  missedYouEmail,
  orderLinkEmail,
  payLinkEmail,
  SAMPLE_CANCELLED,
  SAMPLE_CHANGE,
  SAMPLE_COMPLAINT,
  SAMPLE_ENQUIRY,
  SAMPLE_LINK,
  SAMPLE_MISSED,
  SAMPLE_PAY,
  SAMPLE_THANKS,
  SAMPLE_YEAR,
  thankYouEmail,
  yearLaterEmail,
  type CancelledView,
  type ChangeView,
  type ComplaintView,
  type EnquiryView,
  type LinkView,
  type MissedView,
  type PayView,
} from "@/lib/mail/after-emails";
import {
  ALERT_TITLES,
  ALERTS,
  SAMPLE_ALERTS,
  type AlertKind,
} from "@/lib/mail/alerts";
import type { Email } from "@/lib/mail/layout";
import { londonOffsetMinutes } from "@/lib/london-time";
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
import { thanksView, yearLaterView } from "./after-mail-repo";
import type { connect } from "./client";
import { readMailSettings, reviewLink } from "./mail-settings-repo";
import { readLegalRevision } from "./legal-repo";
import { orderMailView, todayRows } from "./order-mail-repo";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Data = Record<string, unknown>;
export type Template = (
  data: Data,
  db: Db,
  origin: string,
  now: Date,
) => Promise<Email | null>;

/** E-mail 13 sent (or retried) after 18:00 London gets the late variant (§8.1 variants, §8.4 Failures). */
const londonHour = (now: Date) =>
  new Date(now.getTime() + londonOffsetMinutes(now) * 60_000).getUTCHours();

/**
 * E-mails about events that later slices store (the cancellation 6.3, the change 6.2, the delivery attempt 6.x, the
 * payment link 9.x, Find my order 6.x, the enquiry 7.1, the complaint 7.5): each event keeps the view it is rendered
 * from, in `data.view`, so a resend says what that event said (§8.4 Send again). `{ sample: true }` is the drawn one.
 */
const fromView =
  <V>(
    sample: (origin: string, db: Db) => V | Promise<V>,
    build: (v: V, origin: string, now: Date) => Email,
  ): Template =>
  async (d, db, origin, now) =>
    build(d.sample ? await sample(origin, db) : (d.view as V), origin, now);

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
    const review = d.sample
      ? reviewLink("SAMPLE")
      : reviewLink((await readMailSettings(db)).googlePlaceId);
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
        review,
      );
    }
    const view = await orderMailView(db, Number(d.orderId));
    return view && orderConfirmedEmail(view, origin, review);
  },
  /**
   * E-mails to Linda and system e-mails (§8.3): data { kind, view } (or { kind, sample: true }). Plain, to
   * business/email (the sign-in code and invite: to the person).
   */
  alert: async (d, _db, origin) => {
    const kind = String(d.kind) as AlertKind;
    const build = ALERTS[kind] as
      ((v: unknown, o: string) => Email) | undefined;
    if (!build) return null;
    return build(d.sample ? SAMPLE_ALERTS[kind] : d.view, origin);
  },
  /** E-mail 5 · A year later: data { orderId, late }; on the broadcast stream with List-Unsubscribe (§8.4). */
  "year-later": async (d, db, origin, now) => {
    const v = d.sample
      ? SAMPLE_YEAR(origin)
      : await yearLaterView(db, Number(d.orderId), origin, !!d.late, now);
    return v && yearLaterEmail(v, origin);
  },
  /** E-mail 18 · Thank you: data { orderId }; nothing without a Place ID. */
  "thank-you": async (d, db, origin) => {
    const v = d.sample
      ? SAMPLE_THANKS(origin)
      : await thanksView(db, Number(d.orderId), origin);
    return v && thankYouEmail(v, origin);
  },
  /** E-mail 6 · Enquiry received (its trigger: the bespoke form, 7.1). */
  "enquiry-received": fromView<EnquiryView>(
    () => SAMPLE_ENQUIRY,
    enquiryReceivedEmail,
  ),
  /** E-mail 8 · Cancelled (6.3 and the admin, 9.x). */
  cancelled: fromView<CancelledView>(() => SAMPLE_CANCELLED, cancelledEmail),
  /** E-mail 12 · Your change is saved (6.2 and the admin). */
  "change-saved": fromView<ChangeView>(() => SAMPLE_CHANGE, changeSavedEmail),
  /** E-mail 13 · I missed you (Nobody was in, 8.x): late after 18:00 at the moment it is sent. */
  "missed-you": fromView<MissedView>(
    () => SAMPLE_MISSED,
    (v, origin, now) =>
      missedYouEmail({ ...v, late: v.late || londonHour(now) >= 18 }, origin),
  ),
  /** E-mail 15 · Pay for your cake (Send a payment link, 9.x). */
  "pay-link": fromView<PayView>(() => SAMPLE_PAY, payLinkEmail),
  /** E-mail 16 · Your order link (Find my order, 6.x). */
  "order-link": fromView<LinkView>(() => SAMPLE_LINK, orderLinkEmail),
  /** E-mail 17 · Complaint received (7.5). */
  "complaint-received": fromView<ComplaintView>(
    async (_o, db) => SAMPLE_COMPLAINT((await readSettings(db)).phone),
    (v) => complaintEmail(v),
  ),
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
    template: "year-later",
    title: "5 · A year later (1167:9106)",
    data: { sample: true },
  },
  {
    template: "enquiry-received",
    title: "6 · Enquiry received (1153:9316)",
    data: { sample: true },
  },
  {
    template: "cancelled",
    title: "8 · Cancelled (1155:9310)",
    data: { sample: true },
  },
  {
    template: "change-saved",
    title: "12 · Your change is saved (1249:9221)",
    data: { sample: true },
  },
  {
    template: "missed-you",
    title: "13 · I missed you (1249:9261)",
    data: { sample: true },
  },
  {
    template: "pay-link",
    title: "15 · Pay for your cake (1598:10530)",
    data: { sample: true },
  },
  {
    template: "order-link",
    title: "16 · Your order link (1800:13044)",
    data: { sample: true },
  },
  {
    template: "complaint-received",
    title: "17 · Complaint received (1800:13148)",
    data: { sample: true },
  },
  {
    template: "thank-you",
    title: "18 · Thank you — how was it? (1800:12959)",
    data: { sample: true },
  },
  ...(Object.keys(ALERT_TITLES) as AlertKind[]).map((kind) => ({
    template: "alert",
    title: `To Linda · ${ALERT_TITLES[kind]} (1800:13441)`,
    data: { kind, sample: true },
  })),
  {
    template: "sample",
    title:
      "Layout sample — every part of the frame (drawn as e-mail 2, 1128:9160)",
    data: {},
  },
];
