"use client";

import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type {
  collectingCopy,
  nobodyCopy,
  redeliveryCopy,
} from "@/lib/delivery";
import type { RedeliverResult } from "@/db/delivery-repo";
import { RedeliverForm } from "./redeliver-form";
import change from "./change.module.css";
import styles from "./delivery.module.css";
import { WhatNow } from "./what-now";

/**
 * The delivery link (§6.8; What now 1102:9131, G 1199:9305). One screen per moment: the two ways forward, Collect's
 * question, G once chosen (final, “To change your mind, ring me…”), or the closed line.
 */
export function DeliveryPage({
  token,
  number,
  phase,
  choice,
  phone,
  nobody,
  collecting,
  cakes,
  collectAt,
  paidInFull,
  collect,
  redelivery,
  redeliver,
}: {
  token: string;
  number: string;
  phase: "choose" | "closed" | "collect" | "redeliver";
  choice: "collect" | "redeliver" | null;
  phone: string;
  nobody: ReturnType<typeof nobodyCopy>;
  collecting: ReturnType<typeof collectingCopy> | null;
  cakes: string[];
  collectAt: string;
  paidInFull: boolean;
  collect: () => Promise<void>;
  /** H once booked. */
  redelivery: ReturnType<typeof redeliveryCopy> | null;
  /** The redeliver screen: the next day, the fee and the actions. */
  redeliver: {
    dayLong: string;
    feePence: number;
    publishableKey: string;
    action: (window: string) => Promise<RedeliverResult | { kind: "failed" }>;
    finish: () => Promise<"booked" | "processing" | "failed">;
  };
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const base = `/delivery/${token}`;
  const head = (text: string) => (
    <>
      <p className={change.number}>Order {number}</p>
      <h1 ref={title} tabIndex={-1} className={change.title}>
        {text}
      </h1>
    </>
  );
  const ringToChange = (
    <p className={styles.foot}>To change your mind, ring me on {phone}.</p>
  );

  // G · Collecting it (1199:9305).
  if (phase === "collect" && collecting)
    return (
      <div className={change.page}>
        {head("Your cake is waiting for you")}
        <Notice icon title={collecting.noticeTitle}>
          <p>
            {collecting.noticeText}
            {paidInFull ? " Nothing more to pay — it’s already settled." : ""}
          </p>
        </Notice>
        <section className={change.panel} aria-labelledby="your-order">
          <h2 id="your-order" className={change.label}>
            Your order
          </h2>
          <dl className={styles.rows}>
            <dt>Order</dt>
            <dd>{cakes.join(", ")}</dd>
            <dt>Collect from</dt>
            <dd>{collectAt}</dd>
            <dt>Ready</dt>
            <dd>{collecting.ready}</dd>
          </dl>
          {paidInFull && (
            <p className={styles.small}>
              Paid in full already — nothing more to settle.
            </p>
          )}
        </section>
        {ringToChange}
      </div>
    );

  if (phase === "closed")
    return (
      <div className={change.page}>
        {head("Nobody was in")}
        <WhatNow lines={[nobody.closed]} />
      </div>
    );

  if (phase === "choose" && choice === "collect")
    return (
      <div className={change.page}>
        {head("Collect your cake")}
        <p className={styles.lead}>{nobody.confirmCollect}</p>
        <form action={collect} className={change.buttons}>
          <Button type="submit" busyLabel="Saving">
            Yes, I will collect it
          </Button>
          <ButtonLink href={base} variant="outline">
            Back
          </ButtonLink>
        </form>
        <p className={styles.foot}>
          It is free, and nothing else changes on your order.
        </p>
      </div>
    );

  if (phase === "choose" && choice === "redeliver" && nobody.redeliverButton)
    return (
      <div className={change.page}>
        {head("Redeliver tomorrow")}
        <p className={styles.lead}>
          I bring it back on {redeliver.dayLong}. Pick a time — I text a tighter
          one that morning.
        </p>
        <RedeliverForm
          token={token}
          dayLong={redeliver.dayLong}
          feePence={redeliver.feePence}
          phone={phone}
          publishableKey={redeliver.publishableKey}
          redeliver={redeliver.action}
          finish={redeliver.finish}
        />
      </div>
    );

  // H · Redelivery (1199:9325): final.
  if (phase === "redeliver" && redelivery)
    return (
      <div className={change.page}>
        {head("Your cake is coming again")}
        <Notice icon title={redelivery.noticeTitle}>
          <p>{redelivery.noticeText}</p>
        </Notice>
        <section className={change.panel} aria-labelledby="redelivery">
          <h2 id="redelivery" className={change.label}>
            Redelivery
          </h2>
          <dl className={styles.rows}>
            <dt>New date</dt>
            <dd>{redelivery.newDate}</dd>
            <dt>Window</dt>
            <dd>{redelivery.window}</dd>
            <dt>Redelivery fee</dt>
            <dd>{redelivery.fee}</dd>
          </dl>
          <p className={styles.small}>
            I text you a tighter time that morning.
          </p>
        </section>
        {ringToChange}
      </div>
    );

  // The two ways forward (1102:9131).
  return (
    <div className={change.page}>
      {head("Nobody was in")}
      <WhatNow
        lines={[nobody.collectLine, nobody.redeliverLine].filter(
          (l): l is string => !!l,
        )}
        after={nobody.bestLine}
      />
      <div className={change.buttons}>
        <ButtonLink href={`${base}?choice=collect`}>
          {nobody.collectButton}
        </ButtonLink>
        {nobody.redeliverButton && (
          <ButtonLink href={`${base}?choice=redeliver`} variant="outline">
            {nobody.redeliverButton}
          </ButtonLink>
        )}
      </div>
      <p className={styles.foot}>{nobody.neither}</p>
    </div>
  );
}
