// E-mails 5, 6, 8, 12, 13, 15, 16, 17 and 18 (§8.1 with its variants table; frames 1167:9106, 1153:9316, 1155:9310,
// 1249:9221, 1249:9261, 1598:10530, 1800:13044, 1800:13148, 1800:12959; Appendix A.2). Pure functions: the queue
// gathers each view from the database (src/db/mail-templates.ts) and renders it again at every attempt.
import { WINDOWS } from "../handover";
import {
  formatClockTime,
  formatLongDate,
  weekdayIndex,
  type CalendarDate,
} from "../london-time";
import { formatPrice } from "../money";
import type { Block, Email } from "./layout";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const capital = (s: string) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : s);
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";
const windowOf = (key: string | null) => WINDOWS.find((w) => w.key === key);
/** The time word of a window (§8.1 e-mail 13, Appendix A.2): “this morning”. */
const TIME_WORD: Record<string, string> = {
  morning: "this morning",
  afternoon: "this afternoon",
  evening: "this evening",
};

// ── 5 · A year later ────────────────────────────────────────────────────────────────────────────────────────────

export type YearLaterView = {
  /** The order's first line, e.g. “The Lothian”. */
  cake: string;
  /** “who it was for”, else the customer's first name. */
  name: string;
  /** Whether “who it was for” was given (the sentence then says “for Mairi”, else “for your celebration”). */
  forWho: string | null;
  /** Sent after the anniversary itself (the catch-up, §12). */
  late: boolean;
  hero: string;
  tiles: { name: string; from: string; slug: string; image: string }[];
  note: string;
  leadTimeWords: string;
  bespokeLeadTimeWords: string;
  reviewHref: string | null;
  unsubscribeHref: string;
};

export function yearLaterEmail(v: YearLaterView, origin: string): Email {
  const blocks: Block[] = [
    { kind: "eyebrow", text: v.late ? "A year ago" : "A year ago today" },
    { kind: "heading", text: "Is it nearly that time again?" },
    {
      kind: "para",
      text: [
        `This time last year I made ${v.cake} for ${v.forWho ?? "your celebration"}.`,
        v.note.trim(),
      ]
        .filter(Boolean)
        .join(" "),
    },
  ];
  if (v.tiles.length)
    blocks.push({
      kind: "tiles",
      title: "A few that are new this year",
      tiles: v.tiles.map((t) => ({
        name: t.name,
        from: t.from,
        href: `${origin}/cakes/${t.slug}`,
        image: t.image,
        alt: t.name,
      })),
    });
  blocks.push(
    {
      kind: "button",
      label: "See this year’s designs",
      href: `${origin}/cakes`,
      block: true,
    },
    {
      kind: "notice",
      icon: "clock",
      title: "If you do want one",
      text: `${capital(v.leadTimeWords)} for a ready-made design, ${v.bespokeLeadTimeWords} for something bespoke.`,
    },
    {
      kind: "para",
      text: "And if the answer is no, that is completely fine — I will not write again unless you ask me to.",
    },
  );
  if (v.reviewHref)
    blocks.push({
      kind: "linkLine",
      text: "Did you enjoy it?",
      label: "Leave a Google review →",
      href: v.reviewHref,
    });
  blocks.push({
    kind: "footnote",
    text: "You are getting this because you ticked the box when you ordered.",
    link: ["Stop these emails", v.unsubscribeHref],
  });
  return {
    subject: "Is it nearly that time again?",
    preheader: `A year since ${v.name}’s cake — no rush, just so I am on your list`,
    hero: { src: v.hero, alt: `Last year’s cake for ${v.name}` },
    headers: {
      "List-Unsubscribe": `<${v.unsubscribeHref}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    blocks,
  };
}

// ── 6 · Enquiry received ────────────────────────────────────────────────────────────────────────────────────────

export type EnquiryView = {
  reference: string;
  token: string;
  /** The answers chosen from pills and the date, in form order; gaps already read “Not answered”. */
  rows: [string, string][];
  callMe: boolean;
  withGaps: boolean;
};

export function enquiryReceivedEmail(v: EnquiryView, origin: string): Email {
  return {
    subject: "Your enquiry is with me",
    preheader: `${v.reference} · nothing is charged and nothing is committed`,
    blocks: [
      { kind: "heading", text: "Your enquiry is with me" },
      {
        kind: "para",
        text: [
          "Hello, here is what you asked for, so you have it in writing.",
          v.callMe
            ? "I will ring you within 24 hours to talk it through."
            : "I will reply within 24 hours.",
          v.withGaps
            ? "A few answers were left open — I will ask when we talk."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
      { kind: "rows", rows: v.rows },
      {
        kind: "steps",
        steps: [
          { label: "Enquiry sent", date: "Today", done: true },
          { label: "I reply", date: "Within 24 hours", done: false },
          { label: "We agree it by e-mail", done: false },
          { label: "Booked in", done: false },
        ],
      },
      {
        kind: "notice",
        icon: "clock",
        title: "What happens now",
        text: "I check the diary and reply. Nothing is booked and nothing is charged until we have agreed it.",
      },
      {
        kind: "para",
        text: "Your own words are written down on the page — see what I have written down.",
      },
      {
        kind: "button",
        label: "See what I have written down",
        href: `${origin}/my-enquiry/${v.token}`,
      },
    ],
  };
}

// ── 8 · Cancelled ───────────────────────────────────────────────────────────────────────────────────────────────

export type CancelledView = {
  number: string;
  cake: string;
  date: CalendarDate;
  cancelledOn: CalendarDate;
  /** full / half: the tiers (§10.1); own: Linda's own amount; none: nothing back. */
  tier: "full" | "half" | "own" | "none";
  /** Back to the card. */
  cardPence: number;
  /** Given back by hand (cash or bank). */
  handPence: number;
  /** The half tier counted from an earlier date than the order's (§10.1). */
  earliestDiffers: boolean;
  byLinda: boolean;
  manual: boolean;
};

export function cancelledEmail(v: CancelledView, origin: string): Email {
  const today = v.cancelledOn;
  const total = v.cardPence + v.handPence;
  const card = v.cardPence > 0;
  const hand = v.handPence > 0;
  const money = (p: number) => formatPrice(p);

  let refundLine: string;
  if (v.tier === "none" || total === 0)
    refundLine = v.tier === "own" ? "No refund is due." : "";
  else if (card && hand)
    refundLine = `${money(v.cardPence)} back to your card · ${money(v.handPence)} I will give back by hand.`;
  else if (hand)
    refundLine = `I will return ${money(v.handPence)} the way you paid.`;
  else if (v.tier === "half")
    refundLine = `${money(v.cardPence)} on its way back — half, as it was inside seven days${v.earliestDiffers ? " of the earliest date your order has had" : ""}.`;
  else if (v.tier === "own")
    refundLine = `${money(v.cardPence)} back to your card.`;
  else
    refundLine = `${money(v.cardPence)} is on its way back to the card you paid with.`;

  const intro = v.byLinda
    ? "I have had to cancel your order, and I am sorry."
    : "Your order is cancelled.";
  const para = [
    intro,
    refundLine,
    card ? "Most banks show it within 5–10 working days." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rows: [string, string][] = [
    ["Order", `${v.number} · ${v.cake}`],
    ["Was for", formatLongDate(v.date, today)],
    ["Cancelled", formatLongDate(v.cancelledOn, today)],
  ];
  if (total > 0) {
    rows.push([
      "Refund",
      v.tier === "full"
        ? `${money(total)}, in full`
        : v.tier === "half"
          ? `${money(total)}, half`
          : money(total),
    ]);
    rows.push([
      "To",
      card && hand
        ? `Card ${money(v.cardPence)} · by hand ${money(v.handPence)}`
        : card
          ? "The card you paid with"
          : "The way you paid",
    ]);
  }

  const blocks: Block[] = [
    { kind: "heading", text: "That is cancelled" },
    { kind: "para", text: para },
    { kind: "rows", rows },
  ];
  if (card)
    blocks.push({
      kind: "steps",
      steps: [
        {
          label: "Cancelled",
          date: formatLongDate(v.cancelledOn, today),
          done: true,
        },
        { label: "Refund raised", date: "Same day", done: false },
        {
          label: "Back with your bank",
          date: "Within 5–10 working days",
          done: false,
        },
        { label: "Done", done: false },
      ],
    });
  blocks.push({
    kind: "notice",
    icon: "clock",
    title: "What happens now",
    text: v.byLinda
      ? "Nothing you need to do."
      : "Nothing you need to do. Your date is back in the calendar, and you are welcome to book it again while it is free.",
  });
  if (!v.manual)
    blocks.push({
      kind: "button",
      label: "See the designs",
      href: `${origin}/cakes`,
    });
  const preheader =
    total === 0
      ? v.number
      : v.tier === "full"
        ? `${v.number} · refunded in full`
        : v.tier === "half" && !hand
          ? `${v.number} · half refunded`
          : `${v.number} · ${money(total)} refunded`;
  return {
    subject:
      total > 0
        ? `Your order is cancelled — ${money(total)} on its way back`
        : "Your order is cancelled",
    preheader,
    blocks,
  };
}

// ── 12 · Your change is saved ───────────────────────────────────────────────────────────────────────────────────

export type ChangeView = {
  number: string;
  token: string;
  date: CalendarDate;
  today: CalendarDate;
  /** [what, before, after], e.g. ["Size", "serves 24", "serves 32"]. */
  changes: [string, string, string][];
  /** The unchanged fields among size, message, date, window, address. */
  same: string[];
  newTotalPence: number;
  money: { kind: "up" | "down" | "owed" | "none"; pence: number };
  /** When the date changed: the new last day to change online, or “me” when changes now go through Linda. */
  newDeadline: CalendarDate | "me" | null;
};

export function changeSavedEmail(v: ChangeView, origin: string): Email {
  const p = formatPrice(v.money.pence);
  const rows: [string, string][] = [
    ["Order", `${v.number} · ${formatLongDate(v.date, v.today)}`],
    ...v.changes.map(
      ([what, before, after], i) =>
        [i ? "" : "What changed", `${what} — ${before} → ${after}`] as [
          string,
          string,
        ],
    ),
  ];
  if (v.changes.length <= 3 && v.same.length)
    rows.push(["Staying the same", capital(v.same.join(", "))]);
  rows.push(["New total", formatPrice(v.newTotalPence)]);
  if (v.money.kind === "up") rows.push(["Charged to your card today", p]);
  if (v.money.kind === "down")
    rows.push(["Back to your card", `${p} — within 5–10 working days`]);
  if (v.money.kind === "owed") rows.push(["Still to pay", p]);

  const blocks: Block[] = [
    { kind: "heading", text: "Your change is saved" },
    {
      kind: "para",
      text: `I’ve updated your order for ${formatLongDate(v.date, v.today)}. Here’s exactly what changed, and what’s stayed the same.`,
    },
    { kind: "rows", rows, strongLast: v.money.kind !== "none" },
  ];
  if (v.newDeadline)
    blocks.push({
      kind: "para",
      text:
        v.newDeadline === "me"
          ? "Changes and cancellation go through me."
          : `You can change or cancel online until 23:59 on ${formatLongDate(v.newDeadline, v.today)}.`,
    });
  blocks.push(
    {
      kind: "notice",
      icon: "check",
      title: "What happens now",
      text:
        v.money.kind === "up"
          ? "You paid the difference when you saved the change, so this is already settled — there’s nothing else for you to do."
          : v.money.kind === "down"
            ? "The difference is on its way back to your card — there’s nothing else for you to do."
            : "There’s nothing else for you to do.",
    },
    {
      kind: "button",
      label: "Back to my order",
      href: `${origin}/my-order/${v.token}`,
    },
  );
  const [w, , after] = v.changes[0] ?? ["", "", ""];
  return {
    subject:
      v.money.kind === "up"
        ? `Your change is saved — ${p} paid today`
        : v.money.kind === "down"
          ? `Your change is saved — ${p} on its way back`
          : "Your change is saved",
    preheader: w
      ? `${v.number} · ${w.toLowerCase()} updated to ${after}`
      : v.number,
    blocks,
  };
}

// ── 13 · I missed you ───────────────────────────────────────────────────────────────────────────────────────────

export type MissedView = {
  number: string;
  date: CalendarDate;
  today: CalendarDate;
  window: string | null;
  town: string;
  feePence: number;
  deliveryToken: string;
  /** Sent after 18:00 (also a retry, §8.4): collection moves to tomorrow before 12 noon. */
  late: boolean;
  /** Redelivery is offered only when tomorrow is open and this was the first attempt. */
  redeliveryOffered: boolean;
};

export function missedYouEmail(v: MissedView, origin: string): Email {
  const word = TIME_WORD[v.window ?? ""] ?? "today";
  const times = windowOf(v.window)?.times;
  const fee = formatPrice(v.feePence);
  const collect = v.late
    ? `Collect it free from ${v.town} tomorrow before 12 noon`
    : `Collect it free from ${v.town} today`;
  const base = `${origin}/delivery/${v.deliveryToken}`;
  return {
    subject: `I missed you ${word} — your cake is safe`,
    preheader: v.redeliveryOffered
      ? `${v.number} · free collection or ${fee} redelivery`
      : `${v.number} · free collection`,
    blocks: [
      { kind: "heading", text: "I missed you" },
      {
        kind: "para",
        text: `I came by ${word} but there was no answer. I waited fifteen minutes, then brought your cake back with me — it’s safe, and nothing extra has been charged.`,
      },
      {
        kind: "rows",
        rows: [
          ["Order", `${v.number} · ${formatLongDate(v.date, v.today)}`],
          ["Attempted", `${capital(word)}${times ? `, ${times}` : ""}`],
          ["Your cake", `Safe with me in ${v.town}`],
          ["Charged again", "Nothing — no fee for a missed delivery"],
        ],
      },
      {
        kind: "notice",
        icon: "clock",
        title: "What happens now",
        text: v.redeliveryOffered
          ? `${collect}, or I can bring it back tomorrow for ${fee} — just choose below.`
          : `${collect}.`,
      },
      {
        kind: "button",
        label: v.late
          ? "Collect it tomorrow — free"
          : "Collect it today — free",
        href: `${base}?choice=collect`,
      },
      ...(v.redeliveryOffered
        ? [
            {
              kind: "button",
              label: `Redeliver tomorrow — ${fee}`,
              href: `${base}?choice=redeliver`,
              secondary: true,
            } as Block,
          ]
        : []),
    ],
  };
}

// ── 15 · Pay for your cake ──────────────────────────────────────────────────────────────────────────────────────

export type PayView = {
  kind: "change" | "deposit" | "rest" | "difference" | "redelivery";
  number: string;
  linkToken: string;
  date: CalendarDate;
  today: CalendarDate;
  whatItIs: string;
  totalPence: number;
  paidPence: number;
  toPayPence: number;
  /** A waiting change: its lines and the total before. */
  changes?: [string, string][];
  same?: string[];
  totalBeforePence?: number;
  /** Redelivery: the new day and window. */
  redeliveryDate?: CalendarDate;
  redeliveryWindow?: string | null;
  /** With customer e-mails off no confirmation follows (§8.1 variants). */
  confirmationFollows: boolean;
};

export function payLinkEmail(v: PayView, origin: string): Email {
  const long = (d: CalendarDate) => formatLongDate(d, v.today);
  const pay = formatPrice(v.toPayPence);
  const order: [string, string] = ["Order", `${v.number} · ${long(v.date)}`];
  let subject: string;
  let heading: string;
  let intro: string;
  let rows: [string, string][];
  switch (v.kind) {
    case "change":
      subject = `One step left — ${pay} to finish your change`;
      heading = "One step left for your change";
      intro = `I’ve updated your order for ${long(v.date)}, as we talked about. The new total is a little more, so the change becomes final once the difference is paid.`;
      rows = [
        order,
        ...(v.changes ?? []).map(
          ([what, after], i) =>
            [i ? "" : "What changed", `${what} — ${after}`] as [string, string],
        ),
        ...(v.same?.length
          ? [
              ["Staying the same", capital(v.same.join(", "))] as [
                string,
                string,
              ],
            ]
          : []),
        [
          "Total — before → after",
          `${formatPrice(v.totalBeforePence ?? v.paidPence)} → ${formatPrice(v.totalPence)}`,
        ],
        ["To pay now", pay],
      ];
      break;
    case "deposit":
      subject = `Your deposit for ${long(v.date)}`;
      heading = "Your deposit";
      intro = `Here is the link for your deposit. Once it is paid, ${long(v.date)} is yours.`;
      rows = [
        ["Order", v.number],
        ["Your cake", `${v.whatItIs}, ${long(v.date)}`],
        ["Total", formatPrice(v.totalPence)],
        ["Paid so far", formatPrice(v.paidPence)],
        ["To pay now", pay],
      ];
      break;
    case "rest":
    case "difference":
      subject =
        v.kind === "rest" ? "The rest for your cake" : `${pay} for your cake`;
      heading =
        v.kind === "rest" ? "The rest for your cake" : `${pay} for your cake`;
      intro = `Here is the link for your cake on ${long(v.date)}.`;
      rows = [
        ["Order", v.number],
        ["Total", formatPrice(v.totalPence)],
        ["Paid so far", formatPrice(v.paidPence)],
        ["To pay now", `${pay} — this settles your cake`],
      ];
      break;
    case "redelivery": {
      const d = v.redeliveryDate ?? v.date;
      const w = windowOf(v.redeliveryWindow ?? null);
      subject = `Your redelivery on ${long(d)} — ${pay}`;
      heading = "Your redelivery";
      intro = `Here is the link for the redelivery. Once it is paid, I bring your cake on ${long(d)}.`;
      rows = [
        ["Order", v.number],
        ["Redelivery", `${long(d)}${w ? `, ${w.times}` : ""}`],
        ["To pay now", pay],
      ];
      break;
    }
  }
  const blocks: Block[] = [
    { kind: "heading", text: heading },
    { kind: "para", text: intro },
    { kind: "rows", rows, strongLast: true },
  ];
  if (v.kind === "change")
    blocks.push({
      kind: "notice",
      icon: "clock",
      title: "Until it’s paid",
      text: `Your order stays exactly as it was. Once you pay, the change is saved${v.confirmationFollows ? " and you’ll get a confirmation" : ""}. Questions? Just reply to this email.`,
    });
  blocks.push({
    kind: "button",
    label: `Pay ${pay}`,
    href: `${origin}/pay/${v.linkToken}`,
  });
  if (v.kind !== "change")
    blocks.push({ kind: "para", text: "Questions? Just reply to this email." });
  return {
    subject,
    preheader:
      v.kind === "change"
        ? `${v.number} · I have updated your order`
        : `${v.number} · a secure link to pay`,
    blocks,
  };
}

// ── 16 · Your order link ────────────────────────────────────────────────────────────────────────────────────────

export type LinkView = {
  today: CalendarDate;
  orders: {
    number: string;
    date: CalendarDate;
    cakes: string;
    token: string;
  }[];
};

export function orderLinkEmail(v: LinkView, origin: string): Email {
  const several = v.orders.length > 1;
  const blocks: Block[] = [
    {
      kind: "heading",
      text: several ? "Here are your links" : "Here is your link",
    },
    {
      kind: "para",
      text: several
        ? "You asked for the links to your orders on my website. Each opens its order page, where you can see everything and message me."
        : "You asked for the link to your order on my website. It opens your order page, where you can see everything and message me.",
    },
  ];
  for (const o of v.orders)
    blocks.push(
      {
        kind: "rows",
        title: `Order ${o.number}`,
        rows: [
          ["Date", formatLongDate(o.date, v.today)],
          ["Cakes", o.cakes],
        ],
      },
      {
        kind: "button",
        label: "See your order",
        href: `${origin}/my-order/${o.token}`,
      },
    );
  blocks.push({
    kind: "footnote",
    text: "You asked for this on my website. If it wasn’t you, ignore it — nothing changes.",
  });
  return {
    subject: several
      ? "Your order links"
      : `Your link to order ${v.orders[0]?.number ?? ""}`,
    preheader: "Here is the link you asked for",
    blocks,
  };
}

// ── 17 · Complaint received ─────────────────────────────────────────────────────────────────────────────────────

export type ComplaintView = {
  reference: string;
  orderNumber: string | null;
  sentOn: CalendarDate;
  sentAt: { hours: number; minutes: number };
  phone: string;
};

export function complaintEmail(v: ComplaintView): Email {
  return {
    subject: `Complaint received — ${v.reference}`,
    preheader: "I will reply within one working day",
    blocks: [
      { kind: "heading", text: "Your complaint is with me" },
      {
        kind: "para",
        text: "Thank you for telling me. Your complaint is with me exactly as you sent it.",
      },
      {
        kind: "rows",
        rows: [
          ["Reference", v.reference],
          ...(v.orderNumber
            ? [["Order", v.orderNumber] as [string, string]]
            : []),
          [
            "Sent",
            `${formatLongDate(v.sentOn, v.sentOn)}, ${formatClockTime(v.sentAt.hours, v.sentAt.minutes)}`,
          ],
        ],
      },
      {
        kind: "notice",
        icon: "clock",
        title: "I will reply within one working day",
        text: `If it is about food safety or an allergy, ring me on ${v.phone} straight away.`,
      },
    ],
  };
}

// ── 18 · Thank you — how was it? ────────────────────────────────────────────────────────────────────────────────

export type ThanksView = {
  customerName: string;
  cake: string;
  date: CalendarDate;
  token: string;
  reviewHref: string;
  optOutHref: string;
};

/** The same e-mail to every customer: no “were you happy?” first, no reward, no offers (§8.1 e-mail 18). */
export function thankYouEmail(v: ThanksView, origin: string): Email {
  const first = firstName(v.customerName);
  return {
    subject: `Thank you${first ? `, ${first}` : ""} — I hope it went down well`,
    preheader:
      "If you have a minute, a Google review helps a small kitchen like mine",
    blocks: [
      { kind: "heading", text: `Thank you${first ? `, ${first}` : ""}` },
      {
        kind: "para",
        text: `I hope ${v.cake} went down well on ${WEEKDAYS[weekdayIndex(v.date)]}. If you have a minute, a short Google review helps a small kitchen like mine more than anything — it is how most people find me.`,
      },
      { kind: "button", label: "Leave a Google review", href: v.reviewHref },
      {
        kind: "para",
        text: "Something not right? Just reply to this e-mail — I want to know.",
      },
      {
        kind: "linkLine",
        label: "See your order →",
        href: `${origin}/my-order/${v.token}`,
      },
      {
        kind: "footnote",
        text: "No more thank-you e-mails?",
        link: ["Turn them off with one click.", v.optOutHref],
        inline: true,
      },
    ],
  };
}

// ── Samples for /dev/emails (the drawn values) ──────────────────────────────────────────────────────────────────

export const SAMPLE_YEAR = (origin: string): YearLaterView => ({
  cake: "The Lothian",
  name: "Mairi",
  forWho: "Mairi",
  late: false,
  hero: `${origin}/email/placeholder-hero.png`,
  tiles: [
    ["Sugar Peony", "From £210", "sugar-peony"],
    ["Tartan Ribbon", "From £205", "tartan-ribbon"],
    ["Midnight Berry", "From £190", "midnight-berry"],
  ].map(([name, from, slug]) => ({
    name,
    from,
    slug,
    image: `${origin}/email/placeholder-tile.png`,
  })),
  note: "If there is another one coming up, I would love to be part of it — and it does not have to be the same one.",
  leadTimeWords: "five days",
  bespokeLeadTimeWords: "three to four weeks",
  reviewHref: "https://search.google.com/local/writereview?placeid=SAMPLE",
  unsubscribeHref: `${origin}/unsubscribe/sample`,
});

export const SAMPLE_ENQUIRY: EnquiryView = {
  reference: "BBL-2026-E-0312",
  token: "sample",
  rows: [
    ["Occasion", "Wedding"],
    ["Servings", "70 to 120"],
    ["Date", "20 June 2027 · flexible"],
    ["Where", "West Lothian"],
    ["Budget", "£250 – 400"],
    ["Finish", "Not answered"],
    ["Flavour", "Vanilla"],
    ["Dietary", "No nuts"],
    ["Pictures", "2 attached"],
    ["How to reach you", "By email"],
  ],
  callMe: false,
  withGaps: false,
};

export const SAMPLE_CANCELLED: CancelledView = {
  number: "BBL-2026-0147",
  cake: "The Lothian",
  date: "2026-09-12",
  cancelledOn: "2026-09-02",
  tier: "full",
  cardPence: 18500,
  handPence: 0,
  earliestDiffers: false,
  byLinda: false,
  manual: false,
};

export const SAMPLE_CHANGE: ChangeView = {
  number: "BBL-2026-0163",
  token: "sample",
  date: "2026-09-12",
  today: "2026-09-01",
  changes: [["Size", "serves 24", "serves 32"]],
  same: ["message", "date", "delivery time", "address"],
  newTotalPence: 24000,
  money: { kind: "up", pence: 5500 },
  newDeadline: null,
};

export const SAMPLE_MISSED: MissedView = {
  number: "BBL-2026-0171",
  date: "2026-09-12",
  today: "2026-09-12",
  window: "morning",
  town: "Winchburgh",
  feePence: 1500,
  deliveryToken: "sample",
  late: false,
  redeliveryOffered: true,
};

export const SAMPLE_PAY: PayView = {
  kind: "change",
  number: "BBL-2026-0147",
  linkToken: "sample",
  date: "2026-09-12",
  today: "2026-09-01",
  whatItIs: "The Lothian",
  totalPence: 33500,
  paidPence: 28000,
  toPayPence: 5500,
  totalBeforePence: 28000,
  changes: [["Size", "now serves 24, two tiers"]],
  same: ["message", "date", "delivery time and address"],
  confirmationFollows: true,
};

export const SAMPLE_LINK: LinkView = {
  today: "2026-09-01",
  orders: [
    {
      number: "BBL-2026-0147",
      date: "2026-09-12",
      cakes: "The Lothian",
      token: "sample",
    },
  ],
};

export const SAMPLE_COMPLAINT = (phone: string): ComplaintView => ({
  reference: "BBL-2026-C-0004",
  orderNumber: "BBL-2026-0147",
  sentOn: "2026-09-14",
  sentAt: { hours: 18, minutes: 42 },
  phone,
});

export const SAMPLE_THANKS = (origin: string): ThanksView => ({
  customerName: "Mairi Sinclair",
  cake: "The Lothian",
  date: "2026-09-12",
  token: "sample",
  reviewHref: "https://search.google.com/local/writereview?placeid=SAMPLE",
  optOutHref: `${origin}/unsubscribe/sample?list=thanks`,
});
