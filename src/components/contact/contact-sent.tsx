import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { telHref } from "./contact-page";
import styles from "./contact.module.css";

/** Message sent (§7.4; desktop 654:3724, tablet 1558:11484, phone 839:7071). */
export function ContactSent({ phone }: { phone: string | null }) {
  return (
    <div className={styles.page}>
      <h1 className={`${styles.title} ${styles.sentTitle}`}>
        Thank you <br className={styles.wideBreak} />
        for sharing it.
      </h1>
      <div className={`${styles.body} ${styles.sentBody}`}>
        <p className={styles.sentText}>
          I answer every message within 24 hours, usually sooner.
          {phone && (
            <>
              {" "}
              If it is urgent, call{" "}
              <Link href={telHref(phone)} variant="inline">
                {phone}
              </Link>{" "}
              — I am in the kitchen most mornings.
            </>
          )}
        </p>
        <ButtonLink href="/cakes" variant="outline" className={styles.back}>
          Back to the designs
        </ButtonLink>
      </div>
    </div>
  );
}
