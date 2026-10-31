"use client";

import { useEffect, useRef } from "react";
import type { LineView } from "@/db/draft-repo";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { formatPrice } from "@/lib/money";
import {
  capCopy,
  INSCRIPTION_MAX,
  LINE_COPY,
  normaliseText,
} from "@/lib/order-line";
import styles from "./cake-page.module.css";

/** The inscription (V2 · Inscription field 606:2895, phone 1210:9317) and HOW IT WILL LOOK (§5.1). */
export function InscriptionBlock({
  number,
  value,
  error,
  onChange,
}: {
  number: number;
  value: string;
  error?: string;
  onChange: (text: string) => void;
}) {
  const shown = normaliseText(value);
  return (
    <>
      <div className={styles.section} data-field="inscription">
        <TextField
          label={`${String(number).padStart(2, "0")} · Inscription`}
          name="inscription"
          max={INSCRIPTION_MAX}
          counterMode="always"
          error={error}
          autoComplete="off"
          hint="Up to 24 characters, piped by hand. Leave it empty if you would rather have none."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className={styles.section}>
        <p className={styles.sectionLabel}>How it will look</p>
        {shown ? (
          <p className={styles.preview}>{shown}</p>
        ) : (
          <p className={styles.previewEmpty}>{LINE_COPY.noMessage}</p>
        )}
      </div>
    </>
  );
}

/** “Added to your order” (1096:9111 · A): the draft so far and the two ways on. Focus goes to its heading. */
export function AddedPanel({ lines }: { lines: LineView[] }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className={styles.after} aria-labelledby="added-heading">
      <h2
        id="added-heading"
        ref={heading}
        tabIndex={-1}
        className={styles.afterTitle}
      >
        Added to your order
      </h2>
      <div className={styles.panel}>
        <h3 className={styles.sectionLabel}>In your order so far</h3>
        <ul className={styles.lines}>
          {lines.map((l) => (
            <li key={l.id} className={styles.line}>
              <span className={styles.lineTitle}>
                {l.title}
                {l.options && (
                  <span className={styles.lineOptions}>{l.options}</span>
                )}
              </span>
              <span className={styles.linePrice}>
                {formatPrice(l.pricePence)}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.panelNote}>
          One date and one delivery for the whole order, however many cakes are
          in it.
        </p>
      </div>
      <div className={styles.actions}>
        <ButtonLink href="/order/when" className={styles.grow}>
          Continue to date and delivery →
        </ButtonLink>
        <ButtonLink href="/cakes" variant="outline">
          Add another cake
        </ButtonLink>
      </div>
      <p className={styles.note}>
        Nothing is charged yet. You pick a date once the order is complete, and
        pay at the last step.
      </p>
    </section>
  );
}

/** Over the cap (1199:9241 · C, the limit as a template): nothing was added. */
export function CapPanel() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const copy = capCopy();
  return (
    <section className={styles.after} aria-labelledby="cap-heading">
      <div className={styles.panel}>
        <h2
          id="cap-heading"
          ref={heading}
          tabIndex={-1}
          className={styles.sectionLabel}
        >
          Your order
        </h2>
        <dl className={styles.rows}>
          <div>
            <dt>Cakes in this order</dt>
            <dd>{copy.count}</dd>
          </div>
          <div>
            <dt>{copy.adding}</dt>
            <dd>Not possible here</dd>
          </div>
        </dl>
        <p className={styles.panelNote}>{copy.most}</p>
      </div>
      <Notice icon title="Nothing extra has been added">
        {copy.why}
      </Notice>
      <ButtonLink href="/bespoke" block>
        Send an enquiry
      </ButtonLink>
      <Link href="/order/when" className={styles.backToOrder}>
        Back to your order
      </Link>
    </section>
  );
}
