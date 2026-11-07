// E-mail 1 · Order confirmed (§8.1 row 1; the complete version 1800:13257). Built from the order and the facts kept
// with it at confirmation, so a resend says what was agreed then (§8.4 Send again).
import { WINDOWS } from "../handover";
import { addDays, formatLongDate, type CalendarDate } from "../london-time";
import { formatPrice } from "../money";
import type { Placeholder } from "../placeholders";
import type { Block, Business, Email } from "./layout";
import { rightsText } from "./rights";

export type OrderMailView = {
  number: string;
  token: string;
  customerName: string;
  date: CalendarDate;
  earliestDate: CalendarDate;
  /** London calendar day of confirmation. */
  confirmedOn: CalendarDate;
  handover: "delivery" | "collection";
  window: string | null;
  address: string | null;
  town: string | null;
  postcode: string | null;
  totalPence: number;
  manual: boolean;
  allergyNote: string | null;
  phone: string;
  phoneE164: string | null;
  lines: {
    name: string;
    flavour: string;
    sizeLine: string;
    options: string;
    message: string | null;
    allergenText: string;
  }[];
  facts: Record<Placeholder, string>;
  /** The accepted legal revisions (their PDFs are attached). */
  terms: { id: number; updatedOn: string } | null;
  cancellations: { id: number; updatedOn: string } | null;
};

/** “Two tiers · serves 24” → “Serves 24 · two tiers”, as drawn. */
const sizeWords = (line: string) => {
  const [a, b] = line.split(" · ");
  if (!b) return line;
  return `${b[0].toUpperCase()}${b.slice(1)} · ${a[0].toLowerCase()}${a.slice(1)}`;
};

/** “Contains gluten (wheat), eggs and milk.” → “Gluten (wheat), eggs and milk”. */
const containsWords = (t: string) => {
  const s = t.replace(/^Contains\s+/i, "").replace(/\.$/, "");
  return s ? `${s[0].toUpperCase()}${s.slice(1)}` : t;
};

/** “31 August” (the year only when it is not the confirmation year, §8.4 Dates). */
const dayMonth = (d: CalendarDate, today: CalendarDate) =>
  formatLongDate(d, today).replace(/^\w+ /, "");

export const factsBusiness = (f: Record<Placeholder, string>): Business => ({
  tradingName: f.trading_name,
  legalName: f.legal_name,
  addressLine: f.address,
  town: f.town,
  postcode: f.postcode,
  phone: f.phone,
});

export const pdfName = (kind: "terms" | "cancellations", updatedOn: string) =>
  `${kind}-${updatedOn}.pdf`;

export function orderConfirmedEmail(v: OrderMailView, origin: string): Email {
  const today = v.confirmedOn;
  const long = (d: CalendarDate) => formatLongDate(d, today);
  const several = v.lines.length > 1;
  const first = v.customerName.trim().split(/\s+/)[0] ?? "";
  const times = WINDOWS.find((w) => w.key === v.window)?.times;
  const f = v.facts;
  const handoverRows: [string, string][] =
    v.handover === "delivery"
      ? [
          ["Delivery", `${long(v.date)}${times ? `, ${times}` : ""}`],
          [
            "To",
            [v.address, [v.town, v.postcode].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", "),
          ],
        ]
      : [
          ["Collection", `${long(v.date)}, at a time we agree`],
          ["Where", f.address],
        ];
  handoverRows.push([
    "Paid",
    `${formatPrice(v.totalPence)} · card · ${dayMonth(v.confirmedOn, today)}`,
  ]);

  const cakes: Block[] = v.lines.map((l) => ({
    kind: "rows",
    title: l.name,
    rows: [
      ...(l.flavour ? [["Flavour", l.flavour] as [string, string]] : []),
      ["Size", sizeWords(l.sizeLine)],
      ...(l.message !== null
        ? [
            ["Message", l.message ? `“${l.message}”` : "No message"] as [
              string,
              string,
            ],
          ]
        : []),
      ...(l.options ? [["Options", l.options] as [string, string]] : []),
      ["Contains", containsWords(l.allergenText)],
    ],
  }));

  const files = [
    v.terms && pdfName("terms", v.terms.updatedOn),
    v.cancellations && pdfName("cancellations", v.cancellations.updatedOn),
  ].filter((x): x is string => !!x);

  return {
    subject: `${several ? "Your cakes are" : "Your cake is"} booked — ${long(v.date)}`,
    preheader: `Order ${v.number} · everything you need is in here`,
    business: factsBusiness(f),
    attachments: [
      ...(v.terms
        ? [
            {
              name: pdfName("terms", v.terms.updatedOn),
              revisionId: v.terms.id,
              facts: f,
            },
          ]
        : []),
      ...(v.cancellations
        ? [
            {
              name: pdfName("cancellations", v.cancellations.updatedOn),
              revisionId: v.cancellations.id,
              facts: f,
            },
          ]
        : []),
    ],
    blocks: [
      {
        kind: "heading",
        text: several ? "Your cakes are booked" : "Your cake is booked",
      },
      {
        kind: "para",
        text: `Thank you${first ? `, ${first}` : ""}. I have put ${long(v.date)} in the diary and the money has gone through.`,
      },
      ...cakes,
      { kind: "rows", title: "Handover", rows: handoverRows },
      {
        kind: "steps",
        steps: [
          { label: "Booked", date: dayMonth(v.confirmedOn, today), done: true },
          {
            label: "In the kitchen",
            date: dayMonth(addDays(v.date, -1), today),
            done: false,
          },
          v.handover === "delivery"
            ? {
                label: "With you",
                date: `${dayMonth(v.date, today)}${times ? `, ${times}` : ""}`,
                done: false,
              }
            : {
                label: "Ready to collect",
                date: dayMonth(v.date, today),
                done: false,
              },
        ],
      },
      {
        kind: "notice",
        icon: "clock",
        title: "Changing or cancelling",
        text: rightsText({
          date: v.date,
          earliestDate: v.earliestDate,
          today,
          manual: v.manual,
        }),
      },
      {
        kind: "button",
        label: "See your order",
        href: `${origin}/my-order/${v.token}`,
      },
      {
        kind: "textPanel",
        title: "Key terms",
        paras: [
          `Sold by ${f.trading_name}, the trading name of ${f.legal_name}, sole trader · ${f.address} ${f.postcode} · ${f.phone} · ${f.email}`,
          "A cake made to your order has no 14-day cancellation right (Consumer Contracts Regulations 2013). Refunds: full more than seven days before the earliest date, half inside seven days, none on the day.",
          "To complain: reply to this e-mail or use the Complaints page; I reply within one working day.",
        ],
      },
      ...(files.length
        ? [
            {
              kind: "small",
              text: `Attached: ${files.join(" · ")} — the versions you accepted.`,
            } as Block,
          ]
        : []),
      {
        kind: "links",
        links: [
          ["Cancellations and refunds", `${origin}/cancellations`],
          ["Terms and conditions", `${origin}/terms`],
        ],
      },
    ],
  };
}

/** /dev/emails: the drawn sample (1800:13257). */
export const SAMPLE_ORDER: OrderMailView = {
  number: "BBL-2026-0147",
  token: "sample",
  customerName: "Mairi Sinclair",
  date: "2026-09-12",
  earliestDate: "2026-09-12",
  confirmedOn: "2026-08-31",
  handover: "delivery",
  window: "morning",
  address: "48 Preston Road",
  town: "Linlithgow",
  postcode: "EH49 6HH",
  totalPence: 18500,
  manual: false,
  allergyNote: "No nuts",
  phone: "07700 900 000",
  phoneE164: "+447700900000",
  lines: [
    {
      name: "The Lothian",
      flavour: "Vanilla sponge, raspberry conserve",
      sizeLine: "Two tiers · serves 24",
      options: "Fresh flowers on top",
      message: "Happy 30th, Mairi",
      allergenText: "Contains gluten (wheat), eggs and milk.",
    },
  ],
  facts: {
    trading_name: "Baked by Linda",
    legal_name: "Linda Dávid-Vágvölgyi",
    phone: "+44 7884 199103",
    email: "info@bakedbylinda.co.uk",
    address: "20 Church View, Winchburgh",
    postcode: "EH52 6SZ",
    town: "Winchburgh",
    delivery_area: "Edinburgh & the Lothians",
    delivery_charge: "free",
    second_attempt_fee: "£15",
    lead_time_words: "five days",
    bespoke_lead_time_words: "three to four weeks",
    bespoke_minimum: "£150",
    kitchen_handles: "nuts",
    council: "West Lothian Council",
    hygiene_rating: "Pass",
  },
  terms: { id: 0, updatedOn: "2026-10-23" },
  cancellations: { id: 0, updatedOn: "2026-10-23" },
};
