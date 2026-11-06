import { ButtonLink } from "@/components/ui/button";
import { whatHappensNext, CONFIRMED_COPY } from "@/lib/confirmed";
import { londonDate } from "@/lib/london-time";
import styles from "./confirmed.module.css";
import { GreetingMascot } from "./greeting-mascot";

/**
 * Order confirmed (§5.6; desktop 643:3478, tablet 1558:10938, phone 836:6509): “Thank you, {first name}.”, what
 * happens next, the order number card with the mascot peeking over it (ANIM-25) and Track this order. Linda's phone
 * and the collection address come from current Settings (§11.1).
 */
export function OrderConfirmed({
  order,
  phone,
  collectionAddress,
  now = new Date(),
}: {
  order: {
    number: string;
    token: string;
    customerName: string;
    email: string;
    date: string;
    handover: string;
    deliveryWindow: string | null;
    confirmedAt: Date;
  };
  phone: string;
  collectionAddress: string;
  now?: Date;
}) {
  const first = order.customerName.trim().split(/\s+/)[0] ?? "";
  const { rows, changeUntil } = whatHappensNext({
    email: order.email,
    date: order.date,
    today: londonDate(now),
    confirmedAt: order.confirmedAt,
    now,
    handover: order.handover === "delivery" ? "delivery" : "collection",
    window: order.deliveryWindow,
    collectionAddress,
  });
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title} tabIndex={-1} data-step-heading>
          Thank you{first ? "," : "."}
          {first && (
            <>
              <br />
              <span className={styles.name}>{first}.</span>
            </>
          )}
        </h1>
      </div>
      <div className={styles.body}>
        <section aria-labelledby="next-heading">
          <h2 id="next-heading" className={styles.heading}>
            What happens next
          </h2>
          <ul className={styles.rows}>
            {rows.map((r) => (
              <li key={r.label} className={styles.row}>
                <p className={styles.label}>{r.label}</p>
                <p className={styles.text}>{r.text}</p>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            {CONFIRMED_COPY.help}{" "}
            <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>.
            {changeUntil && <> {CONFIRMED_COPY.changeUntil(changeUntil)}</>}
          </p>
        </section>
        <section className={styles.order} aria-labelledby="order-number-label">
          <div className={styles.card}>
            <GreetingMascot orderNumber={order.number} />
            <p id="order-number-label" className={styles.cardLabel}>
              Your order number
            </p>
            <p className={styles.number} data-testid="order-number">
              {order.number}
            </p>
            <p className={styles.keep}>{CONFIRMED_COPY.keep}</p>
          </div>
          <ButtonLink
            href={`/my-order/${order.token}`}
            variant="outline"
            className={styles.track}
          >
            Track this order
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
