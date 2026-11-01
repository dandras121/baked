import NextLink from "next/link";
import { removeFromOrder } from "@/app/(site)/order/actions";
import type { LineView } from "@/db/draft-repo";
import { formatPrice } from "@/lib/money";
import styles from "./checkout.module.css";

/**
 * The order summary column on steps 2 and 3, desktop and tablet (§5.2 Order summary; 1674:11944): one block per cake
 * with Edit / Remove, the date (“Not chosen yet” until a day is picked), the total. No button inside it.
 * Remove is a form, so it works without JavaScript too.
 */
export function OrderSummary({
  lines,
  step,
  date,
}: {
  lines: LineView[];
  step: "when" | "details" | "pay";
  date: string | null;
}) {
  const total = lines.reduce((sum, l) => sum + l.pricePence, 0);
  return (
    <aside className={styles.summary} aria-labelledby="summary-heading">
      <h2 id="summary-heading" className={styles.summaryTitle}>
        Your order
      </h2>
      <ul className={styles.summaryLines}>
        {lines.map((l) => (
          <li key={l.id} className={styles.summaryLine} data-line={l.id}>
            <div className={styles.summaryText}>
              <p className={styles.summaryName}>{l.name}</p>
              <p className={styles.summaryDetail}>
                {[l.sizeLine, l.options].filter(Boolean).join(" · ")}
              </p>
              {l.message !== null && (
                <p className={styles.summaryDetail}>
                  {l.message ? `“${l.message}”` : "No message"}
                </p>
              )}
              <div className={styles.summaryActions}>
                <NextLink
                  href={`/cakes/${l.slug}?line=${l.id}&from=${step}`}
                  className={styles.summaryAction}
                  data-pressable
                >
                  Edit<span className="visually-hidden"> {l.name}</span>
                </NextLink>
                <form action={removeFromOrder}>
                  <input type="hidden" name="line" value={l.id} />
                  <input type="hidden" name="step" value={step} />
                  <button
                    type="submit"
                    className={styles.summaryAction}
                    data-pressable
                  >
                    Remove<span className="visually-hidden"> {l.name}</span>
                  </button>
                </form>
              </div>
            </div>
            <p className={styles.summaryPrice}>{formatPrice(l.pricePence)}</p>
          </li>
        ))}
      </ul>
      <dl className={styles.summaryRows}>
        <div>
          <dt>Date</dt>
          <dd>{date ?? "Not chosen yet"}</dd>
        </div>
      </dl>
      <p className={styles.summaryTotal}>
        <span>Total</span>
        <span className={styles.summaryTotalAmount}>{formatPrice(total)}</span>
      </p>
    </aside>
  );
}
