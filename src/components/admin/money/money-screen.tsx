import Link from "next/link";
import { SendPayLink } from "@/components/admin/order/send-pay-link";
import type { MoneyScreen as Data } from "@/db/money-screen-repo";
import { linkSent, moneySubtitle, paidInFullLine } from "@/lib/admin/money";
import { formatAdminMoney } from "@/lib/money";
import styles from "./money.module.css";

const label = (p: number) => formatAdminMoney(p, "label");
const breakdown = (p: number) => formatAdminMoney(p, "breakdown");

/**
 * Money (§9.9; desktop 934:8321, phone 1251:9519), Owner only: the subtitle, the four tiles (§13), STILL TO PAY (by
 * date, each with Send a payment link), the note (934:8410) and PAID IN FULL, NOTHING TO DO.
 */
export function MoneyScreen({ d }: { d: Data }) {
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
