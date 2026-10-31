import type { ReactNode } from "react";
import type { Block, Inline, LegalSection } from "@/lib/legal";
import { CookieSettingsLink } from "./cookie-settings-link";
import { OnThisPage } from "./on-this-page";
import styles from "./legal.module.css";

function renderInline(parts: Inline[]): ReactNode[] {
  return parts.map((p, i) => {
    if (p.kind === "bold") return <strong key={i}>{p.text}</strong>;
    if (p.kind === "text") return p.text;
    if (p.href === "#cookie-preferences")
      return <CookieSettingsLink key={i}>{p.text}</CookieSettingsLink>;
    const external = /^https?:/.test(p.href);
    return (
      <a
        key={i}
        href={p.href}
        className={styles.inlineLink}
        {...(external ? { target: "_blank", rel: "noopener" } : {})}
      >
        {p.text}
        {external && (
          <span className="visually-hidden"> (opens in a new tab)</span>
        )}
      </a>
    );
  });
}

function renderBlock(b: Block, i: number) {
  return b.kind === "p" ? (
    <p key={i} className={styles.paragraph}>
      {renderInline(b.inline)}
    </p>
  ) : (
    <ul key={i} className={styles.list}>
      {b.items.map((item, j) => (
        <li key={j}>{renderInline(item)}</li>
      ))}
    </ul>
  );
}

/**
 * A legal page (§4.5; Terms 664:4192 / phone 844:7228, the others alike): last updated, title, intro, “On this
 * page” and the numbered sections, then “Questions? Email … or call …” from Settings.
 */
export function LegalPage({
  title,
  intro,
  updated,
  sections,
  email,
  phone,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  email: string | null;
  phone: string | null;
}) {
  return (
    <article className={styles.page}>
      <header className={styles.top}>
        <p className={styles.updated}>Last updated {updated}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{intro}</p>
      </header>
      <div className={styles.columns}>
        <OnThisPage
          items={sections.map((s) => ({
            id: s.id,
            label: `${s.number} · ${s.heading}`,
          }))}
        />
        <div className={styles.sections}>
          {sections.map((s) => (
            <section
              key={s.id}
              className={styles.section}
              aria-labelledby={s.id}
            >
              <h2 id={s.id} className={styles.heading} tabIndex={-1}>
                {s.number} · {s.heading}
              </h2>
              {s.blocks.map(renderBlock)}
            </section>
          ))}
          {email && phone && (
            <p className={styles.questions}>
              Questions? Email{" "}
              <a href={`mailto:${email}`} className={styles.inlineLink}>
                {email}
              </a>{" "}
              or call{" "}
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className={styles.inlineLink}
              >
                {phone}
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
