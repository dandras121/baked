import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { HandOver, NobodyWasIn } from "@/components/admin/today/row-actions";
import type { OrderDetail } from "@/db/order-detail-repo";
import { STATUS_TAG } from "@/lib/admin/orders";
import {
  attemptLine,
  cakeLine,
  changeNote,
  dayMonth,
  detailSubtitle,
  historyWhen,
  marketingLine,
  moneyLines,
  refundToday,
  shortReference,
  stripeHref,
  windowLabel,
} from "@/lib/admin/order-detail";
import { nobodyCopy } from "@/lib/admin/today";
import { formatAdminTime, formatLongDate, londonDate } from "@/lib/london-time";
import { formatAdminMoney } from "@/lib/money";
import { phoneForPeople } from "@/lib/phone";
import { splitLine } from "@/lib/admin/cancel";
import type { AdminCancelQuote } from "@/db/admin-cancel-repo";
import { CancelOrder } from "./cancel-order";
import { CollectionTime } from "./collection-time";
import {
  CancelWaiting,
  DeliveredAfterAll,
  RecordTheirChoice,
} from "./missed-actions";
import { CopyOrderLink } from "./copy-link";
import { LinkActions } from "./link-actions";
import { SendPayLink } from "./send-pay-link";
import styles from "./order.module.css";

/**
 * Order detail (§9.5; desktop 936:8285 + collection fragment 1607:10904, phone 948:8816). 8.4b: every block, the
 * Collection time field, Mark handed over / Undo, Nobody was in, Message the customer, Copy the order link, Refund in
 * Stripe and HISTORY. Cancel (8.4c), Change (8.6), payments (8.7), Print and the data buttons (9.9) come later.
 */
export function OrderDetailScreen({
  d,
  owner,
  today,
  back,
  feePence,
  closedTomorrow,
  stripeLive,
  kitchen,
  cancelQuote,
  saved = false,
  payAtStart = false,
  sketches = [],
  waiting = null,
}: {
  /** A change waiting for its difference (§9.7). */
  waiting?: { pence: number; sentOn: string | null } | null;
  /** Add a sketch or photo (§9.6): signed links; never shown to the customer. */
  sketches?: { id: string; name: string; thumb: string; file: string }[];
  /** Just added by hand (§9.6): “Order saved”. */
  saved?: boolean;
  /** Save and send a payment link (§9.6): the dialog opens on arrival. */
  payAtStart?: boolean;
  d: OrderDetail;
  kitchen: string;
  /** Owner, confirmed orders: what Cancel the order proposes (§9.5). */
  cancelQuote: AdminCancelQuote | null;
  owner: boolean;
  today: string;
  back: { href: string; label: string };
  feePence: number;
  closedTomorrow: boolean;
  stripeLive: boolean;
}) {
  const o = d.order;
  const date = String(o.date);
  const first = o.customerName.trim().split(/\s+/)[0] ?? "";
  const live = o.status === "confirmed" || o.status === "completed";
  const latest = d.attempts.at(-1) ?? null;
  const attemptDay = latest ? String(latest.day) : date;
  const canNobody =
    o.handover === "delivery" &&
    o.status === "confirmed" &&
    (latest?.outcome ?? "none") === "none" &&
    attemptDay <= today;
  const canHandOver = o.status === "confirmed" && date <= today;
  // After Nobody was in (§9.5): the attempt it was recorded on, while no later attempt has an outcome of its own.
  const missedT = [...d.attempts]
    .reverse()
    .find((a) => a.outcome === "nobody-in");
  const missedNext =
    missedT && d.attempts.find((a) => a.attempt === missedT.attempt + 1);
  const missed =
    o.status === "confirmed" &&
    missedT &&
    (!missedNext || missedNext.outcome === "none")
      ? { t: missedT, next: missedNext ?? null }
      : null;
  const fee = (p: number) => formatAdminMoney(p, "label");

  // Payments by kind and day, for MONEY and the subtitle.
  const payments = [
    ...(o.amountReceivedPence > 0
      ? [
          {
            kind: "checkout" as const,
            pence: o.amountReceivedPence,
            on: londonDate(o.confirmedAt),
            how: "Stripe" as const,
            pi: o.paymentIntentId,
          },
        ]
      : []),
    ...d.changes
      .filter((c) => c.paidPence > 0)
      .map((c) => ({
        kind: "change" as const,
        pence: c.paidPence,
        on: londonDate(c.createdAt),
        how: "Stripe" as const,
        pi: c.paymentIntentId,
      })),
    ...d.links
      .filter((l) => l.paidPence > 0)
      .map((l) => ({
        kind: "link" as const,
        pence: l.paidPence,
        on: londonDate(l.paidAt ?? l.createdAt),
        how: "Stripe" as const,
        pi: l.paymentIntentId,
      })),
    ...d.hand
      .filter((h) => h.kind === "payment")
      .map((h) => ({
        kind: "hand" as const,
        pence: h.amountPence,
        on: String(h.paidOn),
        how:
          h.method === "cash" ? ("Cash" as const) : ("Bank transfer" as const),
        pi: null,
      })),
  ].sort((a, b) => a.on.localeCompare(b.on));
  const last = payments.at(-1) ?? null;
  const lines = moneyLines({
    totalPence: o.totalPence,
    payments,
    refunds: d.refunds.map((r) => ({
      pence: r.amountPence,
      on: londonDate(r.createdAt),
      status: r.status,
      kind: r.kind,
    })),
    handRefunds: d.hand
      .filter((h) => h.kind === "refund")
      .map((h) => ({
        pence: h.amountPence,
        on: String(h.paidOn),
        how: h.method === "cash" ? "Cash" : "Bank transfer",
      })),
    openLinks: d.links
      .filter((l) => l.status === "open")
      .map((l) => ({
        purpose: l.purpose,
        pence: l.amountPence,
        sentOn: String(l.sentOn),
        link: { id: l.id, token: l.token, waiting: !!l.changeId },
      })),
    stillToPayPence: d.money.stillToPayPence,
  });
  const cards = payments.map((p) => p.pi).filter((x): x is string => !!x);
  const refund = refundToday({
    earliest: String(o.earliestDate),
    date,
    today,
    basisPence: d.money.netPaidPence,
  });
  const cancelled = o.cancellation as {
    cancelledOn: string;
    cardPence: number;
    handPence: number;
  } | null;
  const phone = o.phoneE164 ? phoneForPeople(o.phoneE164) : o.phone;
  const tag = STATUS_TAG[o.status] ?? o.status;
  const where = [o.address, [o.town, o.postcode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  const row = (
    label: string,
    value: React.ReactNode,
    key?: string | number,
  ) => (
    <div className={styles.pair} key={key}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );

  return (
    <>
      <Link
        href={back.href}
        className={`${styles.back} ${owner ? "" : styles.backAlways}`}
      >
        ‹ {back.label}
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{o.number}</h1>
        <span
          className={`${styles.tag} ${o.status === "cancelled" ? styles.cancelled : ""}`}
        >
          {tag}
        </span>
      </div>
      {saved && (
        <p className={styles.saved} role="status">
          Order saved. The confirmation e-mail is on its way to {o.email}.
        </p>
      )}
      <p className={styles.subtitle}>
        {detailSubtitle({
          name: o.customerName,
          status: o.status,
          owner,
          totalPence: o.totalPence,
          netPaidPence: d.money.netPaidPence,
          last: last && { how: last.how, on: last.on },
        })}
      </p>

      <div className={styles.columns}>
        <div className={styles.main}>
          <section
            className={`${styles.section} ${styles.cakes}`}
            aria-labelledby="cakes-h"
          >
            <h2 id="cakes-h" className={styles.label}>
              The cakes
            </h2>
            {d.lines.map((l) => (
              <div key={l.id} className={styles.cake}>
                <h3 className={styles.cakeName}>{l.name}</h3>
                <p className={styles.line}>{cakeLine(l)}</p>
                <p className={styles.line}>{l.allergenText}</p>
              </div>
            ))}
          </section>

          <section
            className={`${styles.section} ${styles.where}`}
            aria-labelledby="where-h"
          >
            <h2 id="where-h" className={styles.label}>
              Where and when
            </h2>
            <dl className={styles.pairs}>
              {row("Date", formatLongDate(date, today))}
              {o.handover === "delivery" ? (
                <>
                  {row("Window", windowLabel(o.deliveryWindow))}
                  {row("Delivery", where)}
                </>
              ) : (
                <>
                  {row("Collection", `From ${kitchen}`)}
                  <div className={styles.pair}>
                    <dt>
                      <label htmlFor="collection-time">Collection time</label>
                    </dt>
                    <dd>
                      {live ? (
                        <CollectionTime
                          orderId={o.id}
                          initial={o.collectionTime}
                          first={first}
                        />
                      ) : (
                        o.collectionTime || "Agreed with Linda"
                      )}
                    </dd>
                  </div>
                </>
              )}
              {d.attempts.map((a, i) => {
                const text = attemptLine(
                  {
                    ...a,
                    day: String(a.day),
                    collectDay: a.collectDay && String(a.collectDay),
                  },
                  d.attempts[i + 1]
                    ? {
                        day: String(d.attempts[i + 1].day),
                        deliveryWindow: d.attempts[i + 1].deliveryWindow,
                      }
                    : null,
                  owner,
                );
                return text ? row("Attempt", text, a.id) : null;
              })}
              {row(
                "Phone",
                <a href={`tel:${o.phoneE164 ?? o.phone}`}>{phone}</a>,
              )}
              {row("Email", o.email)}
              {owner && row("Marketing", marketingLine(o.consents))}
              {o.cakeFor && row("For", o.cakeFor)}
            </dl>
          </section>

          {sketches.length > 0 && (
            <section
              className={`${styles.section} ${styles.cakes}`}
              aria-labelledby="sketches-h"
            >
              <h2 id="sketches-h" className={styles.label}>
                Sketches and photos
              </h2>
              <ul className={styles.sketches}>
                {sketches.map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.file}
                      target="_blank"
                      rel="noopener"
                      className={styles.sketch}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.thumb}
                        alt={`Sketch: ${p.name}`}
                        width={96}
                        height={96}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {o.allergyNote && (
            <section
              className={`${styles.allergy}`}
              aria-labelledby="allergy-h"
            >
              <h2 id="allergy-h" className={styles.allergyLabel}>
                Allergy note
              </h2>
              <p>{o.allergyNote}</p>
            </section>
          )}

          {owner && (
            <section
              className={`${styles.section} ${styles.money}`}
              aria-labelledby="money-h"
            >
              <h2 id="money-h" className={styles.label}>
                Money
              </h2>
              <p className={styles.total}>
                {formatAdminMoney(o.totalPence, "breakdown")}
              </p>
              <dl className={styles.pairs}>
                {d.lines.map((l) =>
                  row(
                    o.kind === "manual" ? "The cake" : l.name,
                    formatAdminMoney(l.pricePence, "breakdown"),
                    l.id,
                  ),
                )}
                {cancelled &&
                  row(
                    "Cancelled",
                    `${dayMonth(cancelled.cancelledOn)} · ${splitLine({ card: cancelled.cardPence, hand: cancelled.handPence })}`,
                    "cancelled",
                  )}
                {o.deliveryChargePence > 0 &&
                  row(
                    "Delivery",
                    formatAdminMoney(o.deliveryChargePence, "breakdown"),
                  )}
                {lines.map((l, i) =>
                  row(
                    l.label,
                    <>
                      {l.value}
                      {l.reference && (
                        <>
                          {" · "}
                          <a
                            href={stripeHref({
                              number: o.number,
                              cardPayments: [l.reference],
                              live: stripeLive,
                            })}
                            target="_blank"
                            rel="noopener"
                            className={styles.ref}
                          >
                            {shortReference(l.reference)}
                          </a>
                        </>
                      )}
                      {l.link && (
                        <LinkActions
                          linkId={l.link.id}
                          token={l.link.token}
                          first={first}
                          waiting={l.link.waiting}
                        />
                      )}
                    </>,
                    `p${i}`,
                  ),
                )}
              </dl>
            </section>
          )}

          {(d.messages.length > 0 || d.complaints.length > 0) && (
            <section
              className={`${styles.section} ${styles.messages}`}
              aria-labelledby="messages-h"
            >
              <h2 id="messages-h" className={styles.label}>
                Messages
              </h2>
              <ul className={styles.list}>
                {d.messages.map((m) => (
                  <li key={`m${m.id}`}>
                    <span className={styles.when}>
                      {historyWhen(m.createdAt, formatAdminTime(m.createdAt))} ·
                      Message Linda
                    </span>
                    <p>{m.body}</p>
                  </li>
                ))}
                {d.complaints.map((c) => (
                  <li key={`c${c.id}`}>
                    <span className={styles.when}>
                      {historyWhen(c.createdAt, formatAdminTime(c.createdAt))} ·
                      Complaint {c.reference}
                    </span>
                    <p>{c.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            className={`${styles.section} ${styles.history}`}
            aria-labelledby="history-h"
          >
            <h2 id="history-h" className={styles.label}>
              History
            </h2>
            <ul className={styles.list}>
              {/* A manual order's own line (“Added the order by hand”, with who) is in HISTORY already. */}
              {o.kind !== "manual" && (
                <li>
                  <span className={styles.when}>
                    {historyWhen(o.confirmedAt, formatAdminTime(o.confirmedAt))}
                  </span>{" "}
                  Booked on the website
                </li>
              )}
              {d.history.map((h) => (
                <li key={h.id}>
                  <span className={styles.when}>
                    {historyWhen(h.at, formatAdminTime(h.at))}
                  </span>{" "}
                  {h.byName} · {h.what}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className={styles.side} aria-labelledby="actions-h">
          <h2 id="actions-h" className={`${styles.label} ${styles.deskLabel}`}>
            Actions
          </h2>
          <div className={styles.buttons}>
            {(canHandOver || o.status === "completed") && (
              <HandOver
                orderId={o.id}
                className={styles.button}
                done={
                  o.status === "completed" && o.handedOverAt
                    ? `Handed over ${dayMonth(londonDate(o.handedOverAt))} ${formatAdminTime(o.handedOverAt)}`
                    : null
                }
                undoable={
                  o.status === "completed" &&
                  !!o.handedOverAt &&
                  londonDate(o.handedOverAt) === today
                }
              />
            )}
            {canNobody && (
              <NobodyWasIn
                orderId={o.id}
                button={styles.button}
                copy={nobodyCopy({
                  name: o.customerName,
                  address: o.address,
                  town: o.town,
                  window: latest?.deliveryWindow ?? o.deliveryWindow,
                  feePence,
                  owner,
                  redeliver: (latest?.attempt ?? 1) === 1 && !closedTomorrow,
                })}
              />
            )}
            {missed && (
              <DeliveredAfterAll
                orderId={o.id}
                version={o.version}
                first={first}
                className={styles.button}
                feeLine={
                  missed.t.feePaidPence > 0
                    ? owner
                      ? `Their ${fee(missed.t.feePaidPence)} redelivery fee goes back to the card.`
                      : `Their ${fee(missed.t.feePaidPence)} redelivery fee is flagged for the owner to refund.`
                    : null
                }
              />
            )}
            {missed && owner && (
              <RecordTheirChoice
                orderId={o.id}
                version={o.version}
                first={first}
                today={today}
                className={styles.button}
                current={
                  missed.t.choice === "collect" && missed.t.collectDay
                    ? `collect ${dayMonth(String(missed.t.collectDay))}`
                    : missed.t.choice === "redeliver" && missed.next
                      ? `redeliver ${dayMonth(String(missed.next.day))}`
                      : null
                }
                feeLine={
                  missed.t.choice === "redeliver" && missed.t.feePaidPence > 0
                    ? `Their ${fee(missed.t.feePaidPence)} redelivery fee goes back to the card.`
                    : null
                }
              />
            )}
            {waiting && (
              <div className={styles.waiting}>
                <p>
                  Change waiting for{" "}
                  {formatAdminMoney(waiting.pence, "breakdown")}
                  {waiting.sentOn
                    ? ` — link sent ${dayMonth(waiting.sentOn)}`
                    : ""}
                </p>
                {owner && (
                  <CancelWaiting
                    orderId={o.id}
                    first={first}
                    className={styles.button}
                  />
                )}
              </div>
            )}
            {o.status === "confirmed" && !waiting && (
              <ButtonLink
                href={`/admin/orders/${o.number}/change`}
                variant="outline"
                className={styles.button}
              >
                {o.kind === "manual" ? "Edit the order" : "Change the order"}
              </ButtonLink>
            )}
            {owner &&
              (o.status === "confirmed" || o.status === "completed") &&
              d.money.stillToPayPence > 0 && (
                <SendPayLink
                  orderId={o.id}
                  number={o.number}
                  name={o.customerName}
                  money={{
                    totalPence: o.totalPence,
                    paidPence: d.money.netPaidPence,
                    stillToPayPence: d.money.stillToPayPence,
                  }}
                  className={styles.button}
                  openAtStart={payAtStart}
                />
              )}
            <ButtonLink
              href={`mailto:${o.email}?subject=${encodeURIComponent(`Your order ${o.number}`)}`}
              variant="outline"
              className={styles.button}
            >
              Message the customer
            </ButtonLink>
            <CopyOrderLink
              path={`/my-order/${o.token}`}
              className={styles.button}
            />
            {owner && (
              <ButtonLink
                href={stripeHref({
                  number: o.number,
                  cardPayments: cards,
                  live: stripeLive,
                })}
                external
                variant="outline"
                className={styles.button}
              >
                Refund in Stripe
              </ButtonLink>
            )}
            {owner && cancelQuote && o.status === "confirmed" && (
              <CancelOrder
                orderId={o.id}
                version={o.version}
                number={o.number}
                first={first}
                quote={cancelQuote}
                className={styles.button}
              />
            )}
          </div>
          {owner && live && (
            <div className={styles.refund}>
              <p className={styles.refundLine}>{refund.line}</p>
              <p className={styles.note}>{refund.why}</p>
            </div>
          )}
          <hr className={styles.rule} />
          {live && (
            <p className={styles.note}>
              {changeNote({ kind: o.kind, name: o.customerName, date, today })}
            </p>
          )}
          {owner && (
            <p className={styles.note}>
              Refund in Stripe opens this order’s payments in Stripe. A refund
              shows here once Stripe confirms it. Cancelling the order refunds
              automatically.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
