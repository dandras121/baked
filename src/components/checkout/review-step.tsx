import NextLink from "next/link";
import { removeFromOrder } from "@/app/(site)/order/actions";
import type { LineView } from "@/db/draft-repo";
import { formatPrice } from "@/lib/money";
import { NOTHING_FURTHER } from "@/lib/review";
import styles from "./checkout.module.css";
import { PaymentBlock, type PayContext } from "./payment-block";

/**
 * Step 4 — One last look (§5.4; desktop 641:3382, Your details 1797:13126, phone 834:…). Left: the cakes with
 * Edit / Remove and each cake's allergens, the handover line, the total, your details with Change links. Right: the
 * BEFORE YOU PAY box, Due today and the payment block (Stripe arrives in slice 4.4b).
 */
export function ReviewStep({
  lines,
  handover,
  totalPence,
  details,
  beforeYouPay,
  payment,
  pay,
}: {
  lines: LineView[];
  handover: { label: string; value: string };
  totalPence: number;
  details: {
    name: string;
    email: string;
    phone: string;
    /** Delivery only: “48 Preston Road” and “Linlithgow EH49 6HH”. */
    address: [string, string] | null;
  };
  beforeYouPay: string[];
  /** The PaymentIntent's client secret and the publishable key; null / “” while payments are not switched on. */
  payment: { clientSecret: string | null; publishableKey: string };
  /** For the outcomes (§5.5): the hold, the date, Linda's phone, a payment under way elsewhere, a bank check to finish. */
  pay: PayContext;
}) {
  return (
    <div className={styles.review}>
      <section className={styles.reviewOrder} aria-labelledby="review-order">
        <h2 id="review-order" className={styles.sectionHeading}>
          Your order
        </h2>
        <ul className={styles.reviewLines}>
          {lines.map((l) => (
            <li key={l.id} className={styles.reviewLine} data-line={l.id}>
              <span className={styles.reviewThumb} aria-hidden />
              <div className={styles.summaryText}>
                <p className={styles.summaryName}>{l.name}</p>
                <p className={styles.summaryDetail}>
                  {[l.sizeLine, l.options].filter(Boolean).join(" · ")}
                  {l.message !== null &&
                    ` · ${l.message ? `“${l.message}”` : "no message"}`}
                </p>
                <p className={styles.summaryDetail}>{l.allergenText}</p>
                <div className={styles.summaryActions}>
                  <NextLink
                    href={`/cakes/${l.slug}?line=${l.id}&from=pay`}
                    className={styles.summaryAction}
                    data-pressable
                  >
                    Edit<span className="visually-hidden"> {l.name}</span>
                  </NextLink>
                  <form action={removeFromOrder}>
                    <input type="hidden" name="line" value={l.id} />
                    <input type="hidden" name="step" value="pay" />
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
        <p className={styles.reviewRow}>
          <span>{handover.label}</span>
          <span>{handover.value}</span>
        </p>
        <p className={styles.summaryTotal}>
          <span>Total</span>
          <span className={styles.summaryTotalAmount}>
            {formatPrice(totalPence)}
          </span>
        </p>

        <h2 className={styles.reviewSubheading}>Your details</h2>
        <div className={styles.reviewDetails}>
          <div className={styles.reviewDetail}>
            <p>
              {details.name}
              <br />
              {details.email} · {details.phone}
            </p>
            <NextLink
              href="/order/details"
              className={styles.summaryAction}
              data-pressable
            >
              Change<span className="visually-hidden"> your details</span>
            </NextLink>
          </div>
          {details.address && (
            <div className={styles.reviewDetail}>
              <p>
                Delivery to {details.address[0]}
                <br />
                {details.address[1]}
              </p>
              <NextLink
                href="/order/when"
                className={styles.summaryAction}
                data-pressable
              >
                Change
                <span className="visually-hidden"> the delivery address</span>
              </NextLink>
            </div>
          )}
        </div>
      </section>

      <section className={styles.reviewPay} aria-labelledby="before-you-pay">
        <div className={styles.beforeYouPay}>
          <h2 id="before-you-pay" className={styles.reviewSubheading}>
            Before you pay
          </h2>
          <ul>
            {beforeYouPay.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <p className={styles.dueLabel}>Due today</p>
        <p className={styles.dueAmount}>{formatPrice(totalPence)}</p>
        <p className={styles.reviewNote}>{NOTHING_FURTHER}</p>
        <PaymentBlock
          clientSecret={payment.clientSecret}
          publishableKey={payment.publishableKey}
          totalPence={totalPence}
          billingName={details.name}
          context={pay}
        />
        <p className={styles.reviewNote}>
          Card payments are handled by Stripe. I never see your card number.
        </p>
      </section>
    </div>
  );
}
