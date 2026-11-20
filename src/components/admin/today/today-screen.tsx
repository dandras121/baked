import Link from "next/link";
import {
  canText,
  FLAG_LINES,
  readyText,
  smsHref,
  todaySubtitle,
  whenLabel,
} from "@/lib/admin/today";
import { formatAdminTime, formatLongDate } from "@/lib/london-time";
import { formatPrice } from "@/lib/money";
import { phoneForPeople } from "@/lib/phone";
import type { TodayRow } from "@/db/today-repo";
import { SendAText } from "./send-a-text";
import styles from "./today.module.css";

type Numbers = {
  outToday: number;
  thisWeek: number;
  newEnquiries: number;
  takenThisWeek: number;
  stillToPay: number;
  subtitle: { out: number; collections: number; payments: number };
};

const TAG: Record<TodayRow["kind"], string> = {
  today: "",
  redelivery: "Redelivery",
  collect: "Collection",
  "no-choice": "",
  "not-collected": "",
};

/** Whole pounds when the pence are 0 (£1,390), otherwise two decimals (§9.1 Money format). */
const tileMoney = (p: number) =>
  p % 100 === 0 ? `£${(p / 100).toLocaleString("en-GB")}` : formatPrice(p);

/**
 * Today (§9.3; desktop 932:8165, phone 948:8761): the date, the subtitle, the tiles (desktop; a Helper sees out today
 * and this week only), Handovers today with each row's flags and Send a text, the two notes; or the empty state.
 */
export function TodayScreen({
  day,
  rows,
  numbers,
  owner,
  kitchen,
  next,
  notice,
}: {
  day: string;
  rows: TodayRow[];
  numbers: Numbers;
  owner: boolean;
  kitchen: string;
  next: { date: string; cakes: number } | null;
  notice: string | null;
}) {
  const sub = {
    ...numbers.subtitle,
    payments: owner ? numbers.subtitle.payments : null,
  };
  const tiles: [string, string][] = [
    [String(numbers.outToday), "out today"],
    [String(numbers.thisWeek), "this week"],
    ...(owner
      ? ([
          [String(numbers.newEnquiries), "new enquiries"],
          [tileMoney(numbers.takenThisWeek), "taken this week"],
          [tileMoney(numbers.stillToPay), "still to pay"],
        ] as [string, string][])
      : []),
  ];
  return (
    <>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <h1 className={styles.title}>{formatLongDate(day, day)}</h1>
      {todaySubtitle(sub) && (
        <p className={styles.subtitle}>
          <span className={styles.wide}>{todaySubtitle(sub)}</span>
          <span className={styles.narrow}>{todaySubtitle(sub, true)}</span>
        </p>
      )}
      <ul className={styles.tiles} aria-label="This week in numbers">
        {tiles.map(([n, label]) => (
          <li key={label} className={styles.tile}>
            <span className={styles.tileNumber}>{n}</span>
            <span className={styles.tileLabel}>{label}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <div className={styles.empty}>
          <p>
            Nothing going out today.
            {next &&
              ` Next: ${formatLongDate(next.date, day)} · ${next.cakes} ${next.cakes === 1 ? "cake" : "cakes"}.`}
          </p>
          <Link href="/admin/orders" className={styles.emptyLink}>
            See all orders
          </Link>
        </div>
      ) : (
        <>
          <h2 className={styles.section}>Handovers today</h2>
          <ul className={styles.rows}>
            {rows.map((r) => (
              <TodayRowView
                key={`${r.orderId}-${r.kind}`}
                r={r}
                kitchen={kitchen}
              />
            ))}
          </ul>
          <p className={styles.note}>
            Tapping Mark handed over is the only thing that sets an order to
            completed. Forgetting is safe — nothing else depends on it.
          </p>
          <p className={styles.note}>
            Send a text opens your messages with the customer’s number and a
            ready-written text — check the time, then send. The site never texts
            anyone.
          </p>
        </>
      )}
    </>
  );
}

function TodayRowView({ r, kitchen }: { r: TodayRow; kitchen: string }) {
  const cake = r.cakes[0]
    ? `${r.cakes[0]}${r.cakes.length > 1 ? ` +${r.cakes.length - 1}` : ""}`
    : "";
  const where =
    r.handover === "delivery" ? (r.address ?? r.town ?? "") : "collection";
  const ring = r.kind === "not-collected" || r.kind === "no-choice";
  const phone = r.phoneE164 ? phoneForPeople(r.phoneE164) : r.phone;
  return (
    <li className={styles.row}>
      <Link
        href={`/admin/orders/${r.number}`}
        className={styles.rowLink}
        aria-label={`${r.name}, order ${r.number}`}
      />
      <div className={styles.when}>
        <span className={styles.time}>{whenLabel(r)}</span>
        <span className={styles.tag}>
          {TAG[r.kind] ||
            (r.handover === "delivery" ? "Delivery" : "Collection")}
        </span>
      </div>
      <div className={styles.who}>
        <span className={styles.name}>{r.name}</span>
        <span className={styles.what}>
          {[cake, where].filter(Boolean).join(" · ")}
        </span>
        {r.flags.map((f) => (
          <span key={f} className={styles.flag}>
            {FLAG_LINES[f]}
          </span>
        ))}
      </div>
      <div className={styles.actions}>
        <a href={`tel:${r.phoneE164 ?? r.phone}`} className={styles.phone}>
          {phone}
        </a>
        {!ring && r.phoneE164 && canText(r.phoneE164) && (
          <SendAText
            href={smsHref(r.phoneE164, readyText({ ...r, kitchen }))}
            text={readyText({ ...r, kitchen })}
          />
        )}
        {r.status === "completed" && r.handedOverAt && (
          <span className={styles.done}>
            Handed over {formatAdminTime(r.handedOverAt)}
          </span>
        )}
      </div>
    </li>
  );
}
