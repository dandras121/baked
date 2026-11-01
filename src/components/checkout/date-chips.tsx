import { holdDateAndGo } from "@/app/(site)/order/actions";
import { formatShortDate } from "@/lib/london-time";
import styles from "./checkout.module.css";

/**
 * Up to three date chips (§5.2 B, §5.5 G; 974:9109): one tap takes a new hold on that date and goes on to `next`.
 * Inside step 2's form they are its own submit buttons; elsewhere each chip is a small form of its own.
 */
export function DateChips({
  dates,
  next,
  inForm = true,
}: {
  dates: string[];
  next: "details" | "pay";
  inForm?: boolean;
}) {
  if (!dates.length) return null;
  return (
    <div className={styles.chips} role="group" aria-label="Free dates">
      {dates.map((d) =>
        inForm ? (
          <button
            key={d}
            type="submit"
            name="chip"
            value={d}
            className={styles.chip}
            data-pressable
          >
            {formatShortDate(d)}
          </button>
        ) : (
          <form key={d} action={holdDateAndGo}>
            <input type="hidden" name="chip" value={d} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={styles.chip} data-pressable>
              {formatShortDate(d)}
            </button>
          </form>
        ),
      )}
    </div>
  );
}
