"use client";

import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { ChangeLine } from "./change-page";
import styles from "./change.module.css";

const shown = (m: string | null) => (m ? `“${m}”` : "No message");

function Closed({ what, value }: { what: string; value: string }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <div>
          <p className={styles.what}>{what}</p>
          <p className={styles.value}>{value}</p>
        </div>
        <span className={styles.was}>Closed</span>
      </div>
    </div>
  );
}

/**
 * A2 · Change window closed (1036:9260): what has NOT happened first (nothing changed, the date is still held), the
 * rows marked Closed, then the two doors left — Message Linda and Back to your order. Violet, never maroon.
 */
export function ChangeClosed({
  token,
  number,
  closedOn,
  date,
  phone,
  dateRow,
  lines,
}: {
  token: string;
  number: string;
  closedOn: string;
  date: string;
  phone: string;
  dateRow: { label: string; value: string };
  lines: ChangeLine[];
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  return (
    <div className={styles.page}>
      <p className={styles.number}>Order {number}</p>
      <h1 ref={title} tabIndex={-1} className={styles.title}>
        Your cake is already being made
      </h1>
      <Notice icon title={`Changes closed on ${closedOn}`}>
        <p>Nothing on your order has changed, and {date} is still held.</p>
      </Notice>
      <section className={styles.panel} aria-labelledby="closed-rows">
        <h2 id="closed-rows" className={styles.label}>
          No longer editable
        </h2>
        {lines.map((l) => (
          <div key={l.id}>
            {lines.length > 1 && <h3 className={styles.cake}>{l.name}</h3>}
            <Closed what="Size" value={l.sizeLine} />
            {l.message !== null && (
              <Closed what="Message" value={shown(l.message)} />
            )}
          </div>
        ))}
        <Closed what={dateRow.label} value={dateRow.value} />
        <p className={styles.foot}>
          Send me a message and I will do what I still can by hand. If it is
          urgent, call {phone}.
        </p>
      </section>
      <div className={styles.buttons}>
        <ButtonLink href={`/my-order/${token}/message`}>
          Message Linda
        </ButtonLink>
        <ButtonLink href={`/my-order/${token}`} variant="outline">
          Back to your order
        </ButtonLink>
      </div>
    </div>
  );
}
