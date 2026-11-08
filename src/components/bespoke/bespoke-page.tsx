import type { EnquiryState } from "@/app/(site)/bespoke/actions";
import contact from "@/components/contact/contact.module.css";
import { formatPrice } from "@/lib/money";
import type { Settings } from "@/lib/settings";
import { numberInWords } from "@/lib/words";
import { BespokeForm } from "./bespoke-form";
import styles from "./bespoke.module.css";

const STEPS = [
  ["You send this form", "However rough the idea is."],
  ["I reply within 24 hours", "By e-mail or phone, and we talk it through."],
  ["You decide", "Nothing is paid until you agree."],
] as const;

/**
 * Bespoke enquiry (§7.1; desktop 660:4068, tablet 1559:11694, phone 847:8028): “Dreams come true.”, the form, and
 * How this works with How far ahead to ask beside it (under it on the phone). The figures come from Settings.
 */
export function BespokePage({
  settings,
  today,
  inspired,
  action,
}: {
  settings: Settings | null;
  today: string;
  inspired: { id: number; caption: string; src: string | null } | null;
  action: (s: EnquiryState, f: FormData) => Promise<EnquiryState>;
}) {
  const minimum = settings?.bespokeMinimumPence ?? 16000;
  const weeks = settings?.bespokeLeadTimeWeeks ?? 3;
  return (
    <div className={contact.page}>
      <h1 className={`${contact.title} ${styles.title}`}>
        Dreams <br />
        come true.
      </h1>
      <div className={styles.body}>
        <div>
          <p className={contact.intro}>
            Most of this is tap-and-go. Only the description and your contact
            details need typing. Bespoke cakes start at {formatPrice(minimum)}.
          </p>
          <BespokeForm
            minimumPence={minimum}
            leadWeeks={weeks}
            deliveryArea={settings?.deliveryArea ?? "Edinburgh & the Lothians"}
            today={today}
            inspired={inspired}
            action={action}
          />
        </div>
        <aside className={styles.aside} aria-labelledby="how-this-works">
          <section className={styles.panel}>
            <h2 id="how-this-works" className={styles.panelTitle}>
              How this works
            </h2>
            <ol className={styles.steps}>
              {STEPS.map(([title, text], i) => (
                <li key={title}>
                  <span className={styles.disc} aria-hidden>
                    {i + 1}
                  </span>
                  <span>
                    <span className={styles.stepTitle}>{title}</span>
                    <span className={styles.stepText}>{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <h2 className={styles.heading}>How far ahead to ask</h2>
          <dl className={styles.ahead}>
            <div>
              <dt>Celebration cakes</dt>
              <dd>
                {numberInWords(weeks)} to {numberInWords(weeks + 1)} weeks
              </dd>
            </div>
            <div>
              <dt>Wedding cakes</dt>
              <dd>six months or more</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
