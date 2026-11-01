"use client";

import { useEffect, useRef } from "react";
import type { LineView } from "@/db/draft-repo";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { formatPrice } from "@/lib/money";
import { capCopy, INSCRIPTION_MAX, LINE_COPY } from "@/lib/order-line";
import styles from "./cake-page.module.css";

/** The inscription (V2 · Inscription field 606:2895): a plain heading, the field and its counter (Bohoka 2026-11-01: no preview, no hint line). */
export function InscriptionBlock({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className={styles.section} data-field="inscription">
      <TextField
        label="Inscription"
        labelStyle="heading"
        name="inscription"
        max={INSCRIPTION_MAX}
        counterMode="always"
        error={error}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** “Added to your order” (1096:9111 · A): the draft so far and the two ways on. Focus goes to its heading. */
export function AddedPanel({
  lines,
  cleared = false,
}: {
  lines: LineView[];
  /** The old order had been cleared after a day without changes (§10.2); this cake started a new one. */
  cleared?: boolean;
}) {
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
      {cleared && <Notice title={LINE_COPY.cleared} />}
      <div className={styles.panel}>
        <h3 className={styles.sectionLabel}>Your order so far</h3>
        <ul className={styles.lines}>
          {lines.map((l) => (
            <li key={l.id} className={styles.line} data-line={l.id}>
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
