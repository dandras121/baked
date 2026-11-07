// E-mails to Linda and the system e-mails (§8.3; board 1800:13441): plain and short, no images, no logo — the
// subject says it all, because Linda reads them in her phone's mail list. Each links to where she acts in the admin.
// All go to business/email, except the sign-in code and the invite (to the person).
import { formatLongDate, type CalendarDate } from "../london-time";
import { formatPrice } from "../money";
import { plural } from "../words";
import type { Email } from "./layout";

type Link = [label: string, href: string];

/** One alert: the subject, a line or two, and the link to act on. */
const plain = (
  subject: string,
  lines: string[],
  link?: Link,
  fromName?: string,
): Email => ({
  subject,
  preheader: lines[0] ?? "",
  plain: true,
  fromName,
  blocks: [
    ...lines.map((text) => ({ kind: "para" as const, text })),
    ...(link
      ? [{ kind: "linkLine" as const, label: `${link[0]} →`, href: link[1] }]
      : []),
  ],
});

const pounds = formatPrice;

export type AlertViews = {
  "new-enquiry": {
    reference: string;
    occasion: string;
    date: CalendarDate | null;
    today: CalendarDate;
    detail: string;
  };
  "new-order": {
    number: string;
    date: CalendarDate;
    today: CalendarDate;
    cakes: number;
    totalPence: number;
    handover: string;
    allergyNote: string | null;
  };
  "customer-changed": { number: string; what: string; detail: string };
  "customer-cancelled": { number: string; refundPence: number };
  paid: { number: string; pence: number };
  "delivery-choice": {
    number: string;
    choice: "collect" | "redeliver";
    date: CalendarDate;
    today: CalendarDate;
  };
  "check-payment": { amountPence: number; why: string };
  "website-message": {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    sentAt: string;
    page: string;
  };
  "message-linda": { name: string; number: string; message: string };
  complaint: { reference: string; name: string; orderNumber: string | null };
  "refund-failed": { number: string; reason: string };
  "email-bounced": { name: string; number: string | null; subject: string };
  "dispute-opened": {
    number: string;
    respondBy: CalendarDate;
    today: CalendarDate;
  };
  "dispute-closed": { number: string; outcome: "won" | "lost" };
  "sign-in-code": { code: string };
  "team-invite": { inviter: string; link: string };
};

export type AlertKind = keyof AlertViews;

const ORDER = (origin: string, number: string): Link => [
  "Open the order",
  `${origin}/admin/orders/${number}`,
];

export const ALERTS: {
  [K in AlertKind]: (v: AlertViews[K], origin: string) => Email;
} = {
  "new-enquiry": (v, origin) =>
    plain(
      `New enquiry ${v.reference} — ${v.occasion}, ${v.date ? formatLongDate(v.date, v.today) : "flexible"}`,
      [v.detail],
      ["Open the enquiry", `${origin}/admin/enquiries/${v.reference}`],
    ),
  "new-order": (v, origin) =>
    plain(
      `New order ${v.number} — ${formatLongDate(v.date, v.today)}, ${plural(v.cakes, "cake")}, ${pounds(v.totalPence)}`,
      [
        [v.handover, v.allergyNote ? `Allergy note: ${v.allergyNote}.` : ""]
          .filter(Boolean)
          .join(" "),
      ],
      ORDER(origin, v.number),
    ),
  "customer-changed": (v, origin) =>
    plain(
      `Customer changed ${v.number} — ${v.what}`,
      [v.detail],
      ORDER(origin, v.number),
    ),
  "customer-cancelled": (v, origin) =>
    plain(
      `Customer cancelled ${v.number} — ${pounds(v.refundPence)} back`,
      [
        v.refundPence
          ? `${pounds(v.refundPence)} goes back to their card.`
          : "No refund was due.",
      ],
      ORDER(origin, v.number),
    ),
  paid: (v, origin) =>
    plain(
      `Paid ${pounds(v.pence)} — ${v.number}`,
      ["Paid through the payment link."],
      ORDER(origin, v.number),
    ),
  "delivery-choice": (v, origin) =>
    plain(
      v.choice === "collect"
        ? `${v.number}: they will collect ${v.date === v.today ? "today" : "tomorrow"}`
        : `${v.number}: they will take redelivery on ${formatLongDate(v.date, v.today)}`,
      [
        v.choice === "collect"
          ? `They chose to collect it free, before ${v.date === v.today ? "6pm" : "12 noon"}.`
          : "They chose the redelivery.",
      ],
      ORDER(origin, v.number),
    ),
  "check-payment": (v, origin) =>
    plain(
      `Check this payment — ${pounds(v.amountPence)}`,
      [`A Stripe payment needs a look: ${v.why}`],
      ["Open Money", `${origin}/admin/money`],
    ),
  "website-message": (v, origin) =>
    plain(
      `Website message — ${v.name}`,
      [
        `Name: ${v.name}`,
        `Email: ${v.email}`,
        `Phone: ${v.phone ?? "not given"}`,
        v.message,
        `Sent ${v.sentAt} from ${v.page}. Reply from your mailbox — Reply-To is the customer.`,
      ],
      ["Open the message", `${origin}/admin/messages/${v.id}`],
      "Baked by Linda website",
    ),
  "message-linda": (v, origin) =>
    plain(
      `Message from ${v.name} — ${v.number}`,
      [v.message, "Reply from your mailbox — Reply-To is the customer."],
      ORDER(origin, v.number),
      "Baked by Linda website",
    ),
  complaint: (v, origin) =>
    plain(
      `Complaint ${v.reference} — ${v.name}${v.orderNumber ? ` — ${v.orderNumber}` : ""}`,
      [
        "A complaint came in through the website. Reply within one working day — Reply-To is the customer.",
      ],
      ["Open the complaint", `${origin}/admin/complaints/${v.reference}`],
      "Baked by Linda website",
    ),
  "refund-failed": (v, origin) =>
    plain(
      `Refund failed — ${v.number}`,
      [`Stripe did not take the refund: ${v.reason}`],
      ORDER(origin, v.number),
    ),
  "email-bounced": (v, origin) =>
    plain(
      `E-mail bounced — ${v.name}`,
      [`“${v.subject}” did not arrive. Check the address on the order.`],
      v.number
        ? ORDER(origin, v.number)
        : ["Open the e-mails", `${origin}/admin/emails`],
    ),
  "dispute-opened": (v, origin) =>
    plain(
      `Payment disputed — ${v.number} — respond in Stripe by ${formatLongDate(v.respondBy, v.today).replace(/^\w+ /, "")}`,
      [
        "The customer's bank has questioned the payment. Answer it in Stripe before the date.",
      ],
      ORDER(origin, v.number),
    ),
  "dispute-closed": (v, origin) =>
    plain(
      `Dispute closed — ${v.number} — ${v.outcome}`,
      [
        v.outcome === "won"
          ? "The money stays with you."
          : "The bank returned the money to the customer.",
      ],
      ORDER(origin, v.number),
    ),
  "sign-in-code": (v) =>
    plain(`Your Baked by Linda sign-in code: ${v.code}`, [
      "It works for ten minutes. If you did not ask for it, ignore this e-mail.",
    ]),
  "team-invite": (v) =>
    plain(
      `${v.inviter} has added you to Baked by Linda`,
      ["The link works for 7 days."],
      ["Join the team", v.link],
    ),
};

/** The drawn samples (board 1800:13441), for /dev/emails. */
export const SAMPLE_ALERTS: { [K in AlertKind]: AlertViews[K] } = {
  "new-enquiry": {
    reference: "BBL-2026-E-0312",
    occasion: "Birthday",
    date: "2026-10-03",
    today: "2026-09-14",
    detail: "Serves 24 · budget £160–£220 · they would like a phone call.",
  },
  "new-order": {
    number: "BBL-2026-0147",
    date: "2026-09-12",
    today: "2026-08-31",
    cakes: 1,
    totalPence: 18500,
    handover: "Delivery 9am – 12pm to Linlithgow.",
    allergyNote: "no nuts",
  },
  "customer-changed": {
    number: "BBL-2026-0147",
    what: "size: serves 30",
    detail: "Paid £55 by card.",
  },
  "customer-cancelled": { number: "BBL-2026-0147", refundPence: 18500 },
  paid: { number: "BBL-2026-0147", pence: 5500 },
  "delivery-choice": {
    number: "BBL-2026-0151",
    choice: "redeliver",
    date: "2026-09-13",
    today: "2026-09-12",
  },
  "check-payment": {
    amountPence: 18500,
    why: "the amount matches no snapshot of its order.",
  },
  "website-message": {
    id: 1,
    name: "Mairi Sinclair",
    email: "mairi@example.com",
    phone: "07700 900 000",
    message: "Could we move the delivery window to the afternoon?",
    sentAt: "Monday 14 September 2026, 6:42pm",
    page: "/contact",
  },
  "message-linda": {
    name: "Mairi Sinclair",
    number: "BBL-2026-0147",
    message: "Could we move the delivery window to the afternoon?",
  },
  complaint: {
    reference: "BBL-2026-C-0004",
    name: "Mairi Sinclair",
    orderNumber: "BBL-2026-0147",
  },
  "refund-failed": {
    number: "BBL-2026-0147",
    reason: "the card was closed.",
  },
  "email-bounced": {
    name: "Mairi Sinclair",
    number: "BBL-2026-0147",
    subject: "Your cake is booked — Saturday 12 September",
  },
  "dispute-opened": {
    number: "BBL-2026-0147",
    respondBy: "2026-10-02",
    today: "2026-09-20",
  },
  "dispute-closed": { number: "BBL-2026-0147", outcome: "won" },
  "sign-in-code": { code: "419 270" },
  "team-invite": {
    inviter: "Linda",
    link: "https://bakedbylinda.co.uk/admin/join/sample",
  },
};

export const ALERT_TITLES: Record<AlertKind, string> = {
  "new-enquiry": "New enquiry",
  "new-order": "New order",
  "customer-changed": "Customer changed",
  "customer-cancelled": "Customer cancelled",
  paid: "Payment received",
  "delivery-choice": "Missed-delivery choice",
  "check-payment": "Check this payment",
  "website-message": "Website message",
  "message-linda": "Message Linda",
  complaint: "Complaint",
  "refund-failed": "Refund failed",
  "email-bounced": "E-mail bounced",
  "dispute-opened": "Payment disputed",
  "dispute-closed": "Dispute closed",
  "sign-in-code": "Sign-in code (to the person)",
  "team-invite": "Team invite (to the person)",
};
