import Link from "next/link";
import { SendPayLink } from "@/components/admin/order/send-pay-link";
import type { MoneyScreen as Data } from "@/db/money-screen-repo";
import type { MoneyFlags } from "@/db/money-flags-repo";
import { ButtonLink } from "@/components/ui/button";
import {
  FLAG,
  linkSent,
  moneySubtitle,
  paidInFullLine,
} from "@/lib/admin/money";
import { stripeHref } from "@/lib/admin/order-detail";
import { formatLongDate } from "@/lib/london-time";
import {
  Checked,
  DismissNoOrder,
  KeepFee,
  RefundFee,
  TryAgain,
} from "./flag-actions";
import { formatAdminMoney } from "@/lib/money";
import styles from "./money.module.css";

const label = (p: number) => formatAdminMoney(p, "label");
const breakdown = (p: number) => formatAdminMoney(p, "breakdown");

/**
 * Money (§9.9; desktop 934:8321, phone 1251:9519), Owner only: the subtitle, the four tiles (§13), STILL TO PAY (by
 * date, each with Send a payment link), the note (934:8410) and PAID IN FULL, NOTHING TO DO.
 */
export function MoneyScreen({
  d,
  flags,
  today,
  stripeLive,
}: {
  d: Data;
  flags: MoneyFlags;
  today: string;
  stripeLive: boolean;
}) {
  const open = (number: string) => `/admin/orders/${number}?from=money`;
  const tiles: [string, string][] = [
    [label(d.tiles.stillToPay), "still to pay"],
    [label(d.tiles.paidThisWeek), "paid this week"],
    [label(d.tiles.dueWithin7), "unpaid, date within 7 days"],
    [label(d.tiles.takenThisYear), "taken this year"],
  ];
  return (
    <>
      <h1 className={styles.title}>Money</h1>
      <p className={styles.subtitle}>
        {moneySubtitle(d.tiles.stillToPay, d.rows.length)}
      </p>

      {flags.noOrder.length +
        flags.refundFailed.length +
        flags.checkDay.length +
        flags.feeToRefund.length +
        flags.handBack.length >
        0 && (
        <section className={styles.flags} aria-label="Needs you">
          {flags.noOrder.length > 0 && (
            <Flag title={FLAG.noOrderTitle(flags.noOrder.length)}>
              {flags.noOrder.map((a) => (
                <div key={a.id} className={styles.flagItem}>
                  <p className={styles.flagText}>
                    {FLAG.noOrder(a.pence, a.on, a.paymentIntentId)}
                  </p>
                  <div className={styles.flagActions}>
                    <ButtonLink
                      href={stripeHref({
                        number: "",
                        cardPayments: [a.paymentIntentId],
                        live: stripeLive,
                      })}
                      variant="outline"
                      className={styles.flagButton}
                      external
                    >
                      Open in Stripe
                    </ButtonLink>
                    <DismissNoOrder alertId={a.id} />
                  </div>
                </div>
              ))}
            </Flag>
          )}
          {flags.refundFailed.map((f) => (
            <Flag
              key={`r${f.id}`}
              title={FLAG.refundFailedTitle}
              href={open(f.number)}
              number={f.number}
            >
              <div className={styles.flagItem}>
                <p className={styles.flagText}>
                  {FLAG.refundFailed(f.pence, f.number, f.name, f.on, f.error)}
                </p>
                <div className={styles.flagActions}>
                  <TryAgain refundId={f.id} />
                </div>
              </div>
            </Flag>
          ))}
          {flags.checkDay.map((f) => (
            <Flag
              key={`c${f.orderId}`}
              title={FLAG.checkDayTitle(f.number)}
              href={open(f.number)}
              number={f.number}
            >
              <div className={styles.flagItem}>
                <p className={styles.flagText}>
                  {FLAG.checkDay(f.name, formatLongDate(f.date, today))}
                </p>
                <div className={styles.flagActions}>
                  <Checked orderId={f.orderId} />
                </div>
              </div>
            </Flag>
          ))}
          {flags.feeToRefund.map((f) => (
            <Flag
              key={`f${f.attemptId}`}
              title={FLAG.feeTitle(f.pence, f.number)}
              href={open(f.number)}
              number={f.number}
            >
              <div className={styles.flagItem}>
                <p className={styles.flagText}>{FLAG.fee(f.pence, f.name)}</p>
                <div className={styles.flagActions}>
                  <RefundFee
                    attemptId={f.attemptId}
                    label={`Refund ${label(f.pence)}`}
                  />
                  <KeepFee attemptId={f.attemptId} fee={label(f.pence)} />
                </div>
              </div>
            </Flag>
          ))}
          {flags.handBack.map((f) => (
            <Flag
              key={`h${f.orderId}`}
              title={FLAG.handTitle(f.pence, f.number)}
              href={open(f.number)}
              number={f.number}
            >
              <div className={styles.flagItem}>
                <p className={styles.flagText}>{FLAG.hand}</p>
                <div className={styles.flagActions}>
                  <ButtonLink
                    href={open(f.number)}
                    variant="outline"
                    className={styles.flagButton}
                  >
                    Record a refund given back
                  </ButtonLink>
                </div>
              </div>
            </Flag>
          ))}
        </section>
      )}

      <ul className={styles.tiles} aria-label="Money in numbers">
        {tiles.map(([n, what]) => (
          <li key={what} className={styles.tile}>
            <span className={styles.tileNumber}>{n}</span>
            <span className={styles.tileLabel}>{what}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="still-h">
        <h2 id="still-h" className={styles.section}>
          Still to pay
        </h2>
        {d.rows.length === 0 ? (
          <p className={styles.line}>Every order is paid in full.</p>
        ) : (
          <>
            <div className={styles.heads} aria-hidden>
              <span>Order</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Paid</span>
              <span>To pay</span>
              <span>Link sent</span>
            </div>
            <ul className={styles.rows}>
              {d.rows.map((r) => (
                <li key={r.id} className={styles.row}>
                  <Link
                    href={`/admin/orders/${r.number}?from=money`}
                    className={styles.number}
                  >
                    {r.number}
                  </Link>
                  <Link
                    href={`/admin/orders/${r.number}?from=money`}
                    className={styles.name}
                    tabIndex={-1}
                  >
                    {r.name}
                  </Link>
                  <span className={styles.cell}>
                    <span className={styles.narrow}>Total </span>
                    {label(r.totalPence)}
                  </span>
                  <span className={styles.cell}>
                    <span className={styles.narrow}> · Paid </span>
                    {breakdown(r.paidPence)}
                  </span>
                  <span className={`${styles.cell} ${styles.due}`}>
                    <span className={styles.narrow}> · To pay </span>
                    {breakdown(r.stillToPayPence)}
                  </span>
                  {/* Phone: “· Sent 1 Sep · £240” after the sums; no line when no link is open. */}
                  <span
                    className={`${styles.cell} ${r.link ? "" : styles.wideOnly}`}
                  >
                    <span className={styles.narrow}> · </span>
                    {linkSent(r.link)}
                  </span>
                  <span className={styles.action}>
                    <SendPayLink
                      orderId={r.id}
                      number={r.number}
                      name={r.name}
                      money={{
                        totalPence: r.totalPence,
                        paidPence: r.paidPence,
                        stillToPayPence: r.stillToPayPence,
                      }}
                      className={styles.send}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className={styles.note}>
          The link opens a Stripe payment page for the amount you enter. Marking
          a payment by hand is for cash or bank transfer — Stripe payments land
          here on their own.
        </p>
      </section>

      <section aria-labelledby="paid-h">
        <h2 id="paid-h" className={styles.section}>
          Paid in full, nothing to do
        </h2>
        <p className={styles.line}>{paidInFullLine(d.paidInFull)}</p>
      </section>
    </>
  );
}

/** One flag (934:8321's box): the title in caps, then its lines and buttons; the order it belongs to, when it has one. */
function Flag({
  title,
  href,
  number,
  children,
}: {
  title: string;
  href?: string;
  number?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.flag}>
      <h2 className={styles.flagTitle}>{title}</h2>
      {children}
      {href && (
        <Link href={href} className={styles.flagLink}>
          Open {number}
        </Link>
      )}
    </div>
  );
}
