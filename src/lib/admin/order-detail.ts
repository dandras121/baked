// Order detail (§9.5): the words of the screen, worked out from the order — nothing typed, nothing stored.
import { WINDOWS } from "@/lib/handover";
import { refundAmount, refundTier, lastChangeDay } from "@/lib/deadlines";
import {
  formatLongDate,
  londonDate,
  type CalendarDate,
} from "@/lib/london-time";
import { formatAdminMoney } from "@/lib/money";

const money = (p: number) => formatAdminMoney(p, "breakdown");
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** “1 Sep” (money lines, attempts). */
export const dayMonth = (d: CalendarDate) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]}`;
};
/** “31 August” (the subtitle). */
const dayMonthLong = (d: CalendarDate) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${LONG[m - 1]}`;
};

export type PaymentLine = {
  label: string;
  value: string;
  reference?: string;
  /** A by-hand payment line: Remove (§9.5). */
  remove?: { id: number; pence: number; method: string; on: string };
  /** An open payment link: Copy the link · Cancel this link (§9.5). */
  link?: { id: number; token: string; waiting: boolean };
};

type Pay = {
  pence: number;
  on: CalendarDate;
  how: "Stripe" | "Cash" | "Bank transfer";
  pi?: string | null;
  /** A by-hand line's own row (Remove). */
  hand?: { id: number; method: string };
};

/**
 * MONEY (§9.5): one line per payment (“Deposit £80.00 · Stripe · 1 Sep”; the only payment covering the total is
 * “Paid in full”), refunds as negative lines, open links, then Still to pay (always shown).
 */
export function moneyLines(v: {
  totalPence: number;
  payments: (Pay & {
    kind: "checkout" | "change" | "link" | "deposit" | "hand";
  })[];
  /** Money given back by hand (cash or bank, §10.6). */
  handRefunds?: { pence: number; on: CalendarDate; how: string }[];
  refunds: { pence: number; on: CalendarDate; status: string; kind: string }[];
  openLinks: {
    purpose: string;
    pence: number;
    sentOn: CalendarDate;
    link?: { id: number; token: string; waiting: boolean };
  }[];
  stillToPayPence: number;
}) {
  const out: PaymentLine[] = [];
  const only = v.payments.length === 1 && v.payments[0].pence >= v.totalPence;
  for (const p of v.payments) {
    if (p.kind === "hand") {
      out.push({
        label: only ? "Paid in full" : p.how,
        value: `${money(p.pence)} · ${only ? `${p.how} · ` : ""}${dayMonth(p.on)}`,
        remove: p.hand && {
          id: p.hand.id,
          pence: p.pence,
          method: p.hand.method,
          on: dayMonth(p.on),
        },
      });
      continue;
    }
    const label = only
      ? "Paid in full"
      : p.kind === "change"
        ? "Change"
        : p.kind === "link"
          ? "Payment link"
          : p.pence < v.totalPence
            ? "Deposit"
            : "Payment";
    out.push({
      label,
      value: `${money(p.pence)} · ${p.how} · ${dayMonth(p.on)}`,
      reference: p.pi ?? undefined,
    });
  }
  for (const r of v.refunds) {
    const state =
      r.status === "pending"
        ? " · pending"
        : r.status === "failed"
          ? " · failed — try again"
          : "";
    out.push({
      label:
        r.kind === "fee"
          ? "Fee refund"
          : r.kind === "goodwill"
            ? "Goodwill refund"
            : r.kind === "dispute"
              ? "Dispute lost"
              : "Refund",
      value: `${money(-r.pence)} · Stripe · ${dayMonth(r.on)}${state}`,
    });
  }
  for (const r of v.handRefunds ?? [])
    out.push({
      label: "Given back",
      value: `${money(-r.pence)} · ${r.how} · ${dayMonth(r.on)}`,
    });
  for (const l of v.openLinks)
    out.push({
      label: "Link",
      value: `${LINK_PURPOSE[l.purpose] ?? "Payment"} · ${money(l.pence)} · sent ${dayMonth(l.sentOn)}`,
      link: l.link,
    });
  out.push({ label: "Still to pay", value: money(v.stillToPayPence) });
  return out;
}

const LINK_PURPOSE: Record<string, string> = {
  deposit: "Deposit",
  rest: "The rest",
  difference: "The difference",
  redelivery: "Redelivery",
};

/** “pi_3Qx…8KdA”: the PaymentIntent id shown as its first 6 and last 4 characters (§9.5 MONEY extras). */
export const shortReference = (id: string) =>
  id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;

/** The subtitle (§9.5): “Mairi Sinclair · paid in full · £280.00 · Stripe, 31 August”; a Helper sees the name. */
export function detailSubtitle(v: {
  name: string;
  status: string;
  owner: boolean;
  totalPence: number;
  netPaidPence: number;
  last: { how: string; on: CalendarDate } | null;
}) {
  if (!v.owner) return v.name;
  const state =
    v.status === "refunded"
      ? "refunded"
      : v.status === "cancelled"
        ? "cancelled"
        : v.netPaidPence >= v.totalPence
          ? "paid in full"
          : v.netPaidPence > 0
            ? `${money(v.netPaidPence)} paid`
            : "nothing paid yet";
  return [
    v.name,
    state,
    money(v.totalPence),
    v.last && `${v.last.how}, ${dayMonthLong(v.last.on)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A cake's line: “Two tiers · serves 24 · vanilla sponge · “Happy 30th, Mairi”” (“no message” when it offers one). */
export function cakeLine(l: {
  sizeLine: string;
  flavour: string;
  options: string;
  message: string | null;
}) {
  return [
    l.sizeLine,
    l.flavour,
    l.options,
    l.message === null
      ? null
      : l.message.trim()
        ? `“${l.message.trim()}”`
        : "no message",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** “Morning · 9am – 12pm”. */
export function windowLabel(key: string | null) {
  const w = WINDOWS.find((x) => x.key === key);
  return w
    ? `${w.key[0].toUpperCase()}${w.key.slice(1)} · ${w.times}`
    : "Not chosen";
}

/** One line per delivery attempt with an outcome (§9.5). */
export function attemptLine(
  a: {
    day: CalendarDate;
    outcome: string;
    choice: string;
    collectDay: CalendarDate | null;
    feePaidPence: number;
  },
  next: { day: CalendarDate; deliveryWindow: string | null } | null,
  owner: boolean,
) {
  if (a.outcome !== "nobody-in") return null;
  const head = `Nobody was in ${dayMonth(a.day)}`;
  if (a.choice === "collect")
    return `${head} · chose to collect${a.collectDay ? ` ${dayMonth(a.collectDay)}` : ""}`;
  if (a.choice === "redeliver" && next) {
    const fee = a.feePaidPence
      ? ` · ${owner ? `${money(a.feePaidPence)} ` : ""}paid`
      : "";
    return `${head} · chose redelivery ${dayMonth(next.day)}, ${next.deliveryWindow ?? "window to agree"}${fee}`;
  }
  return `${head} · no choice yet`;
}

/** Marketing (§9.5, Owner): “Agreed 31 August 2026 · wording stored” or “No”. */
export function marketingLine(consents: unknown) {
  const c = consents as {
    marketing?: { wording?: string } | null;
    terms?: { at?: string };
  };
  if (!c?.marketing) return "No";
  const at = c.terms?.at ? londonDate(new Date(c.terms.at)) : null;
  if (!at) return "Agreed · wording stored";
  return `Agreed ${dayMonthLong(at)} ${at.slice(0, 4)} · wording stored`;
}

/**
 * The note (§9.5; the customer's pronoun is not known, so the copy names them instead): catalogue — what they can
 * change online until when; manual — they message you.
 */
export function changeNote(v: {
  kind: string;
  name: string;
  date: CalendarDate;
  today: CalendarDate;
}) {
  const first = v.name.trim().split(/\s+/)[0] ?? "";
  if (v.kind === "manual")
    return `${first} cannot change or cancel online — a message to you comes first.`;
  return `${first} can change the date, size or message online until 23:59 on ${formatLongDate(
    lastChangeDay(v.date),
    v.today,
  )} (two days before). After that, a message to you comes first. You can change anything at any time.`;
}

/** “£280.00 refund if cancelled today” and why (§9.5, §13; the ‘none’ tier reads “No refund if cancelled today”). */
export function refundToday(v: {
  earliest: CalendarDate;
  date: CalendarDate;
  today: CalendarDate;
  basisPence: number;
}) {
  const tier = refundTier(v.earliest, v.date, v.today);
  const amount = refundAmount(Math.max(0, v.basisPence), tier);
  const day = formatLongDate(v.date, v.today).replace(/^\w+ /, "");
  if (tier === "none")
    return {
      line: "No refund if cancelled today",
      why: `On or after ${day} — no refund under the terms.`,
    };
  return {
    line: `${money(amount)} refund if cancelled today`,
    why:
      tier === "full"
        ? `More than 7 days before ${v.earliest !== v.date ? formatLongDate(v.earliest, v.today).replace(/^\w+ /, "") : day} — the full-refund rule applies.`
        : `Within 7 days of ${v.earliest !== v.date ? formatLongDate(v.earliest, v.today).replace(/^\w+ /, "") : day} — half back.`,
  };
}

/** HISTORY line time: “12 Sep 11:52”. */
export const historyWhen = (at: Date, time: string) =>
  `${dayMonth(londonDate(at))} ${time}`;

/** Stripe for this order (§9.5 Refund in Stripe): the one card payment, else a search for the order number. */
export function stripeHref(v: {
  number: string;
  cardPayments: string[];
  live: boolean;
}) {
  const base = `https://dashboard.stripe.com${v.live ? "" : "/test"}`;
  return v.cardPayments.length === 1
    ? `${base}/payments/${v.cardPayments[0]}`
    : `${base}/search?query=${encodeURIComponent(v.number)}`;
}
