import NextLink from "next/link";
import { STEPS, stepCount, stepPath, stepState } from "@/lib/checkout";
import styles from "./checkout.module.css";

/**
 * The checkout stepper (§5 Stepper; desktop V2 · Stepper 627:3124, phone 812:5951). Desktop and tablet: four steps
 * joined by lines; completed steps carry a tick and are links back (ANIM-07), the current and later steps are not.
 * Phone: four dots and “Step 2 of 4 · When & where” (not links; the phone uses the ← back links).
 * `cakeHref` is step 1's link: edit mode for the last cake added.
 */
export function Stepper({
  current,
  cakeHref,
}: {
  current: 1 | 2 | 3 | 4;
  cakeHref?: string;
}) {
  const here = STEPS[current - 1];
  return (
    <nav className={styles.stepper} aria-label="Checkout steps">
      <ol className={styles.steps}>
        {STEPS.map((s) => {
          const state = stepState(s.n, current);
          const href = s.key === "cake" ? cakeHref : stepPath(s.key);
          const inner = (
            <>
              <span className={styles.disc} aria-hidden>
                {state === "done" ? "✓" : s.n}
              </span>
              <span className={styles.stepLabel}>{s.label}</span>
              {state === "done" && (
                <span className="visually-hidden"> (done)</span>
              )}
            </>
          );
          return (
            <li key={s.key} className={styles.step} data-state={state}>
              {state === "done" && href ? (
                <NextLink
                  href={href}
                  className={styles.stepLink}
                  data-pressable
                >
                  {inner}
                </NextLink>
              ) : (
                <span aria-current={state === "current" ? "step" : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className={styles.dots} aria-hidden>
        <div className={styles.dotRow}>
          {STEPS.map((s) => (
            <span
              key={s.key}
              className={styles.dot}
              data-state={stepState(s.n, current)}
            />
          ))}
        </div>
        <p className={styles.dotLabel}>
          {stepCount(current)} · <strong>{here.label}</strong>
        </p>
      </div>
    </nav>
  );
}
