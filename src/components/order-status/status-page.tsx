"use client";

import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Notice } from "@/components/ui/notice";
import { formatPrice } from "@/lib/money";
import type { cancelledCopy } from "@/lib/cancel-copy";
import { panelDate, statusCopy, type StatusState } from "@/lib/order-status";
import { WINDOWS } from "@/lib/handover";
import styles from "./status.module.css";

export type StatusView = {
  token: string;
  number: string;
  state: StatusState;
  date: string;
  today: string;
  handover: "delivery" | "collection";
  window: string | null;
  address: string | null;
  postcode: string | null;
  allergyNote: string | null;
  manual: boolean;
  completed: boolean;
  email: string;
  totalPence: number;
  paidPence: number;
  collectAt: string;
  reviewHref: string | null;
  /** “Refunded £55 on 3 September” — every refund line, whatever its kind (§6.3 Money). */
  refunds: string[];
  /** E: the kept cancellation's words, and what it refunds (§6.3 E). */
  cancelled: ReturnType<typeof cancelledCopy> | null;
  cancelRefundPence: number;
  lines: {
    name: string;
    flavour: string;
    sizeLine: string;
    options: string;
    message: string | null;
    allergenText: string;
    /** Still a visible cake: “Order this cake again” (state C). */
    againHref: string | null;
  }[];
};

const ClockIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden className={styles.boxIcon}>
    <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10 5.5V10l3 2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const TickIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden className={styles.boxIcon}>
    <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M6.5 10.2l2.4 2.4 4.6-4.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** “Two tiers · serves 24” stays as it is; manual orders have no flavour row (§6.3 Order panel rows). */
function OrderPanel({ v }: { v: StatusView }) {
  const times = WINDOWS.find((w) => w.key === v.window)?.times;
  const due = v.totalPence - v.paidPence;
  return (
    <section className={styles.panel} aria-labelledby="your-order">
      <h2 id="your-order" className={styles.panelLabel}>
        Your order
      </h2>
      {v.lines.map((l, i) => (
        <div
          key={i}
          className={`${styles.line} ${v.manual ? styles.noPhoto : ""}`}
        >
          {!v.manual && <div className={styles.photo} aria-hidden />}
          <div>
            <p className={styles.lineName}>{l.name}</p>
            <p className={styles.lineText}>{l.sizeLine}</p>
            {!v.manual && l.flavour && (
              <p className={styles.lineText}>{l.flavour}</p>
            )}
            {l.options && <p className={styles.lineText}>{l.options}</p>}
            {l.message !== null && (
              <p className={styles.lineText}>
                {l.message ? `“${l.message}”` : "No message"}
              </p>
            )}
            <p className={styles.lineText}>{l.allergenText}</p>
          </div>
        </div>
      ))}
      <hr className={styles.rule} />
      <dl className={styles.rows}>
        <dt>Date</dt>
        <dd>{panelDate(v.date, v.today)}</dd>
        {v.handover === "delivery" ? (
          <>
            {times && (
              <>
                <dt>Window</dt>
                <dd>{times}</dd>
              </>
            )}
            <dt>To</dt>
            <dd>{[v.address, v.postcode].filter(Boolean).join(", ")}</dd>
          </>
        ) : (
          <>
            <dt>Collect from</dt>
            <dd>{v.collectAt}</dd>
            <dt>Collection time</dt>
            <dd>Agreed with Linda</dd>
          </>
        )}
        {v.allergyNote && (
          <>
            <dt>Allergies</dt>
            <dd>{v.allergyNote}</dd>
          </>
        )}
      </dl>
      <hr className={styles.rule} />
      <dl className={styles.rows}>
        {v.cancelled ? (
          v.cancelRefundPence > 0 ? (
            <>
              <dt>{v.cancelled.tick ? "Refunded" : "Refund on its way"}</dt>
              <dd className={styles.money}>
                {formatPrice(v.cancelRefundPence)}
              </dd>
            </>
          ) : (
            <>
              <dt>Paid</dt>
              <dd>{formatPrice(v.paidPence)}</dd>
            </>
          )
        ) : due > 0 ? (
          <>
            <dt>Total</dt>
            <dd>{formatPrice(v.totalPence)}</dd>
            <dt>Paid so far</dt>
            <dd>{formatPrice(v.paidPence)}</dd>
            <dt>Still to pay</dt>
            <dd className={styles.money}>{formatPrice(due)}</dd>
          </>
        ) : (
          <>
            <dt>Paid in full</dt>
            <dd className={styles.money}>{formatPrice(v.totalPence)}</dd>
          </>
        )}
      </dl>
      {v.refunds.map((r) => (
        <p key={r} className={styles.receipt}>
          {r}
        </p>
      ))}
      {v.cancelled
        ? v.cancelled.tick && (
            <p className={styles.receipt}>Refund receipt sent to {v.email}</p>
          )
        : !v.manual &&
          v.paidPence > 0 && (
            <p className={styles.receipt}>Receipt sent to {v.email}</p>
          )}
    </section>
  );
}

/**
 * The status page (§6.2 states A, B, B2, C, E; §6.3 actions). The first match of §6.2 decides the state on the server;
 * this draws it: the order number, the heading, the NEXT box, the actions and “Your order”.
 */
export function StatusPage({
  v,
  banner = null,
}: {
  v: StatusView;
  /** “Your change is saved.” and its line (§6.3 status banners), straight after a save only. */
  banner?: { title: string; text: string } | null;
}) {
  const copy = statusCopy(v);
  const base = `/my-order/${v.token}`;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const catalogue = !v.manual;
  const again =
    v.state === "C" && catalogue ? v.lines.filter((l) => l.againHref) : [];
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        {banner && (
          <div className={styles.banner}>
            <Notice icon title={banner.title}>
              <p>{banner.text}</p>
            </Notice>
          </div>
        )}
        <p className={styles.number}>Order {v.number}</p>
        <h1 ref={title} tabIndex={-1} className={styles.title}>
          {copy.title}
        </h1>
        <p className={styles.intro}>{copy.intro}</p>
      </div>
      <div className={styles.next}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <div className={styles.box}>
          {v.cancelled?.tick ? (
            <TickIcon />
          ) : v.state === "E" && v.cancelled?.eyebrow === "No refund" ? null : (
            <ClockIcon />
          )}
          <div>
            <p className={styles.boxTitle}>{copy.nextTitle}</p>
            {copy.nextText && <p className={styles.boxText}>{copy.nextText}</p>}
          </div>
        </div>
      </div>
      <OrderPanel v={v} />
      <div className={styles.actions}>
        <div className={styles.buttons}>
          {v.state === "A" && catalogue && (
            <ButtonLink href={`${base}/change`}>Change something</ButtonLink>
          )}
          <ButtonLink href={`${base}/message`} variant="outline">
            Message Linda
          </ButtonLink>
          {again.map((l) => (
            <ButtonLink key={l.againHref} href={l.againHref!} variant="outline">
              {again.length > 1
                ? `Order ${l.name} again`
                : "Order this cake again"}
            </ButtonLink>
          ))}
          {v.state === "C" && v.reviewHref && (
            <span className={styles.wide}>
              <ButtonLink href={v.reviewHref} variant="outline" external block>
                Leave a Google review
              </ButtonLink>
            </span>
          )}
        </div>
        {copy.note && <p className={styles.note}>{copy.note}</p>}
        {v.state === "E" && (
          <p className={styles.cancel}>
            <Link href="/cancellations">Cancellations &amp; refunds</Link>
          </p>
        )}
        {v.state === "A" && catalogue && (
          <p className={styles.cancel}>
            <Link href={`${base}/cancel`}>Need to cancel instead? →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
