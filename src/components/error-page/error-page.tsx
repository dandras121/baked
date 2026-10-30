import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import styles from "./error-page.module.css";

export type SiteFacts = { email?: string; phone?: string };

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

const COPY = {
  404: {
    title: ["This page", "has been eaten."],
    // §4.6 Proposal copy (replaces the frame's “your details are still held”).
    body: "The link is broken or the page has moved. Nothing is wrong with your order — if you were mid-checkout, your answers are kept for a day.",
  },
  500: {
    title: ["Something", "went wrong."],
    body: "Something went wrong on my side. Nothing you did caused it, and nothing was sent or charged. Please try again in a minute — or get in touch and I will sort it out.",
  },
} as const;

/**
 * The 404 and 500 pages (SITE-FLOWS §4.6, §4.7; desktop 654:3550 / 1608:10783, tablet 1558:11134 /
 * 1608:10968, phone 839:7303 / 1608:10885). Phone and e-mail come from Settings; without them the
 * lines that need them are left out.
 */
export function ErrorPage({
  kind,
  facts,
}: {
  kind: 404 | 500;
  facts: SiteFacts;
}) {
  const copy = COPY[kind];
  const second =
    kind === 404
      ? { href: "/cakes", label: "Browse the designs" }
      : facts.phone
        ? { href: telHref(facts.phone), label: `Call ${facts.phone}` }
        : null;
  return (
    <section className={styles.page} aria-labelledby="error-title">
      <h1 id="error-title" className={styles.title}>
        {copy.title[0]}
        <br />
        {copy.title[1]}
      </h1>
      <div className={styles.body}>
        <p className={styles.text}>{copy.body}</p>
        <div className={styles.actions}>
          <ButtonLink href="/" variant="solid" className={styles.primary}>
            Back to home
          </ButtonLink>
          {second && (
            <ButtonLink
              href={second.href}
              variant="outline"
              className={styles.secondaryButton}
            >
              {second.label}
            </ButtonLink>
          )}
        </div>
        {/* Phone: the second action is a text link (839:7333, 1608:10885). */}
        {second && (
          <Link href={second.href} className={styles.secondaryLink}>
            {second.label}
          </Link>
        )}
        {facts.email && (
          <p className={styles.email}>
            Looking for something specific? Email{" "}
            <Link
              href={`mailto:${facts.email}`}
              variant="inline"
              className={styles.emailLink}
            >
              {facts.email}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
