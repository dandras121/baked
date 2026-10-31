import { ButtonLink } from "@/components/ui/button";
import { DropDownGroup, DropDownRow } from "@/components/ui/drop-down";
import type { FaqGroup } from "@/lib/faq";
import styles from "./faq.module.css";

/**
 * FAQ (§4.4; desktop 658:3996, tablet 1559:11372, phone 803:5741): one group of rows for the whole page — the
 * first question open on load, opening a row closes the others (ANIM-09).
 */
export function FaqPage({
  groups,
  email,
}: {
  groups: FaqGroup[];
  email: string | null;
}) {
  const first = groups[0]?.items[0]?.slug ?? null;
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>We have all the answers.</h1>
      <div className={styles.body}>
        <p className={styles.intro}>
          If your question is not here,{" "}
          {email ? (
            <a href={`mailto:${email}`} className={styles.inlineLink}>
              email me
            </a>
          ) : (
            "email me"
          )}{" "}
          — I will add it.
        </p>
        <DropDownGroup name="faq" defaultOpen={first}>
          {groups.map((g) => (
            <section
              key={g.key}
              className={styles.group}
              aria-labelledby={`faq-${g.key}`}
            >
              <h2 id={`faq-${g.key}`} className={styles.category}>
                {g.label}
              </h2>
              {g.items.map((item) => (
                <DropDownRow
                  key={item.slug}
                  id={item.slug}
                  question={item.question}
                >
                  {item.answer}
                </DropDownRow>
              ))}
            </section>
          ))}
        </DropDownGroup>
        <section className={styles.stuck} aria-labelledby="ask-me">
          <p className={styles.stuckLabel}>Still stuck?</p>
          <h2 id="ask-me" className={styles.ask}>
            Ask me directly
          </h2>
          <p className={styles.stuckText}>
            I answer every message within 24 hours, usually sooner.
          </p>
          <ButtonLink href="/contact" className={styles.getInTouch}>
            Get in touch
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
