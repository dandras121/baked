import styles from "./what-now.module.css";

const Clock = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden className={styles.icon}>
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
    <path
      d="M8 4.5V8l2.4 1.6"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * What now (1102:9131): the ways forward after Nobody was in, each with a clock, then the violet line under them; or
 * the one line when the choices have closed. Shared by the status page and `/delivery/[token]`.
 */
export function WhatNow({
  lines,
  after,
}: {
  lines: string[];
  after?: string | null;
}) {
  return (
    <section className={styles.panel} aria-labelledby="what-now">
      <h2 id="what-now" className={styles.label}>
        What now
      </h2>
      <ul className={styles.list}>
        {lines.map((l) => (
          <li key={l}>
            <Clock />
            <span>{l}</span>
          </li>
        ))}
      </ul>
      {after && <p className={styles.after}>{after}</p>}
    </section>
  );
}
