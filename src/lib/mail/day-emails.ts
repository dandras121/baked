// E-mails 2, 3, 3b and 4 (§8.1 rows 2–4; 1128:9160, 1128:9206, 1128:9249, 1155:9360 with Appendix A.2). Linda's
// phone and the collection address are the current Settings (§11.1: operational facts reach every order at once).
import { WINDOWS } from "../handover";
import {
  addDays,
  formatLongDate,
  weekdayIndex,
  type CalendarDate,
} from "../london-time";
import { numberInWords } from "../words";
import type { Block, Email } from "./layout";
import type { OrderMailView } from "./order-confirmed";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type Today = { phone: string; collectionAddress: string };

/** “9am – 12pm” → “9am and 12pm” (§8.4 Windows: the subject of 3 says “between {start} and {end}”). */
const between = (times: string) => times.replace(" – ", " and ");
const windowOf = (key: string | null) => WINDOWS.find((w) => w.key === key);
const dayMonth = (d: CalendarDate, today: CalendarDate) =>
  formatLongDate(d, today).replace(/^\w+ /, "");
const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const capital = (s: string) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : s);

/** The address line as the drawn panels show it: “48 Preston Road, EH49 6HH”. */
const toLine = (v: OrderMailView) =>
  [v.address, v.postcode].filter(Boolean).join(", ");

/** The timeline (§8.4): filled up to the step the e-mail is about; the last step has no date and is never filled. */
function steps(v: OrderMailView, upTo: 2 | 3): Block {
  const today = v.confirmedOn;
  const w = windowOf(v.window);
  const delivery = v.handover === "delivery";
  return {
    kind: "steps",
    steps: [
      { label: "Booked", date: dayMonth(v.confirmedOn, today), done: true },
      {
        label: "In the kitchen",
        date: dayMonth(addDays(v.date, -1), today),
        done: true,
      },
      delivery
        ? {
            label: "With you",
            date: `${dayMonth(v.date, today)}${w ? `, ${w.times}` : ""}`,
            done: upTo === 3,
          }
        : {
            label: "Ready to collect",
            date: `${dayMonth(v.date, today)}, at the agreed time`,
            done: upTo === 3,
          },
      { label: delivery ? "Delivered" : "Collected", done: false },
    ],
  };
}

/** E-mail 2 · Two days before: 08:00 on D-2, the last day to change (Decided D2). */
export function twoDaysBeforeEmail(
  v: OrderMailView,
  now: Today,
  origin: string,
): Email {
  const w = windowOf(v.window);
  const rows: [string, string][] = [
    ["Date", formatLongDate(v.date, v.confirmedOn)],
  ];
  if (v.handover === "delivery") {
    if (w) rows.push(["Delivery", w.times]);
    rows.push(["To", toLine(v)]);
  } else {
    rows.push(
      ["Collection", "At a time we agree"],
      ["Where", now.collectionAddress],
    );
  }
  if (v.allergyNote) rows.push(["Allergies noted", v.allergyNote]);
  return {
    subject: `Your cake is being made for ${WEEKDAYS[weekdayIndex(v.date)]}`,
    preheader: "Last chance to change anything — today",
    blocks: [
      { kind: "heading", text: "Your cake is next" },
      {
        kind: "para",
        text: "I start on your cake later this week. The time slot is confirmed — if anything has changed at your end, today is the last day to change anything.",
      },
      { kind: "rows", rows },
      steps(v, 2),
      {
        kind: "notice",
        icon: "clock",
        title: "What happens now",
        text: "I bake and decorate over the next two days. After today the size, message, date and window are fixed.",
      },
      v.manual
        ? {
            kind: "button",
            label: "See your order",
            href: `${origin}/my-order/${v.token}`,
          }
        : {
            kind: "button",
            label: "Change something",
            href: `${origin}/my-order/${v.token}/change`,
          },
      ...(v.manual
        ? [
            {
              kind: "small",
              text: "If anything has changed, reply to this e-mail today.",
            } as Block,
          ]
        : []),
    ],
  };
}

const SETTING_OFF: Record<string, string> = {
  morning: "this morning",
  afternoon: "around midday",
  evening: "this afternoon",
};

/** E-mail 3 · On the day — delivery: 07:00 on the date. */
export function onTheDayEmail(
  v: OrderMailView,
  now: Today,
  origin: string,
): Email {
  const w = windowOf(v.window);
  return {
    subject: `Today — your cake arrives between ${w ? between(w.times) : "the times we agreed"}`,
    preheader: "Keep your phone nearby",
    blocks: [
      { kind: "heading", text: "Today is the day" },
      {
        kind: "para",
        text: `Your cake is finished and I am setting off ${SETTING_OFF[v.window ?? ""] ?? "today"}. Someone needs to be in to take it.`,
      },
      {
        kind: "rows",
        rows: [
          ["Arriving", w ? `Between ${between(w.times)}` : "Today"],
          ["To", toLine(v)],
          ["My number", now.phone],
        ],
      },
      steps(v, 3),
      {
        kind: "notice",
        icon: "clock",
        title: "What happens now",
        text: "Keep your phone to hand — I text you when I set off. Once it is with you, keep it level, cool and out of the sun.",
      },
      {
        kind: "button",
        label: "See your order",
        href: `${origin}/my-order/${v.token}`,
      },
    ],
  };
}

/** E-mail 3b · On the day — collection: 07:00 on the date (no collection time saved yet: “the time we agreed”). */
export function collectionDayEmail(
  v: OrderMailView,
  now: Today,
  origin: string,
): Email {
  return {
    subject: "Today — ready to collect at the time we agreed",
    preheader: now.collectionAddress,
    blocks: [
      { kind: "heading", text: "Ready when you are" },
      {
        kind: "para",
        text: "Your cake is finished and boxed. Come at the time we agreed — if anything changes, just ring me.",
      },
      {
        kind: "rows",
        rows: [
          ["Collection time", "Today, at the time we agreed"],
          ["Where", now.collectionAddress],
          ["My number", now.phone],
        ],
      },
      steps(v, 3),
      {
        kind: "notice",
        icon: "clock",
        title: "What happens now",
        text: "Bring a flat boot space and drive gently. Keep it level, cool and out of the sun once you are home.",
      },
      {
        kind: "button",
        label: "See your order",
        href: `${origin}/my-order/${v.token}`,
      },
    ],
  };
}

export type ListRow = {
  number: string;
  name: string;
  phone: string;
  phoneE164: string | null;
  handover: "delivery" | "collection";
  window: string | null;
  cakes: string[];
  address: string | null;
  allergyNote: string | null;
};

/** E-mail 4 · Your daily list (to the team, 06:00): today's handovers and yesterday's collections not marked. */
export function dailyListEmail(
  d: { date: CalendarDate; handovers: ListRow[]; notCollected: ListRow[] },
  origin: string,
): Email {
  const cakes = d.handovers.reduce((n, h) => n + h.cakes.length, 0);
  const rings = d.notCollected.length;
  const subject = cakes
    ? `Today: ${cakes} ${cakes === 1 ? "cake" : "cakes"} out`
    : `Today: ${rings} to ring`;
  const card = (h: ListRow, notCollected = false): Block => {
    const w = windowOf(h.window);
    const when = notCollected
      ? "Not collected yet"
      : h.handover === "delivery"
        ? (w?.times ?? "Delivery")
        : "Collection";
    return {
      kind: "card",
      lines: [
        `${when} · ${h.name} · ${h.phone}`,
        `${h.cakes.join(", ")} · ${h.handover === "delivery" ? (h.address ?? "") : "from the kitchen"}`,
        ...(h.allergyNote ? [`Allergies: ${h.allergyNote}`] : []),
      ],
      links: [
        ...(notCollected
          ? []
          : ([
              ["Mark as handed over →", `${origin}/admin/orders/${h.number}`],
            ] as [string, string][])),
        ...(h.phoneE164
          ? ([
              [
                notCollected ? "Ring →" : "Send a text →",
                notCollected ? tel(h.phoneE164) : `sms:${h.phoneE164}`,
              ],
            ] as [string, string][])
          : []),
      ],
    };
  };
  const n = d.handovers.length;
  return {
    subject,
    preheader: "Tap to mark each one done",
    noSignOff: true,
    blocks: [
      { kind: "heading", text: formatLongDate(d.date, d.date) },
      {
        kind: "para",
        text: n
          ? `${capital(numberInWords(n))} going out today. Tap the link under each one once it is handed over — that is what moves the tick on their page.`
          : "Nothing goes out today.",
      },
      ...d.handovers.map((h) => card(h)),
      ...d.notCollected.map((h) => card(h, true)),
      {
        kind: "small",
        text: "Forget to tap? Nothing breaks — their page still reads correctly. A collection you have not marked shows on Today the next day as “Not collected yet”.",
      },
    ],
  };
}

export const SAMPLE_TODAY: Today = {
  phone: "+44 7884 199103",
  collectionAddress: "20 Church View, Winchburgh",
};

export const SAMPLE_LIST = {
  date: "2026-09-12",
  handovers: [
    {
      number: "BBL-2026-0147",
      name: "Mairi Sinclair",
      phone: "07700 900 000",
      phoneE164: "+447700900000",
      handover: "delivery" as const,
      window: "morning",
      cakes: ["The Lothian"],
      address: "48 Preston Road",
      allergyNote: "No nuts",
    },
    {
      number: "BBL-2026-0151",
      name: "Callum Reid",
      phone: "07700 900 358",
      phoneE164: "+447700900358",
      handover: "collection" as const,
      window: null,
      cakes: ["Sugar Peony"],
      address: null,
      allergyNote: null,
    },
    {
      number: "BBL-2026-0153",
      name: "Shona Baird",
      phone: "07700 900 127",
      phoneE164: "+447700900127",
      handover: "delivery" as const,
      window: "evening",
      cakes: ["Wee Beastie"],
      address: "3 Mill Road, Bathgate",
      allergyNote: null,
    },
  ],
  notCollected: [],
};
