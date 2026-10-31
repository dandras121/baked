import { sendContact } from "@/app/(site)/contact/actions";
import { Link } from "@/components/ui/link";
import type { Settings } from "@/lib/settings";
import { ContactForm } from "./contact-form";
import styles from "./contact.module.css";

/** `tel:` address: the number without spaces (“+44 7884 199103” → “+447884199103”). */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/**
 * Contact (§7.4; desktop 656:3843, tablet 1558:11846, phone 839:6616): the form and “THE DETAILS”, every value
 * from Settings (§11.1).
 */
export function ContactPage({ settings }: { settings: Settings | null }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tell me about it.</h1>
      <div className={styles.body}>
        <div className={styles.formColumn}>
          <p className={styles.intro}>
            Whether it is a firm order or a half-formed idea, write to me here.
            I answer every message within 24 hours, usually sooner.
          </p>
          <ContactForm action={sendContact} />
        </div>
        {settings && (
          <section className={styles.details} aria-labelledby="the-details">
            <h2 id="the-details" className={styles.detailsTitle}>
              The details
            </h2>
            <dl className={styles.list}>
              <div className={styles.item}>
                <dt className={styles.term}>Email</dt>
                <dd className={styles.value}>
                  <Link
                    href={`mailto:${settings.email}`}
                    className={styles.valueLink}
                  >
                    {settings.email}
                  </Link>
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.term}>Phone</dt>
                <dd className={styles.value}>
                  <Link
                    href={telHref(settings.phone)}
                    className={styles.valueLink}
                  >
                    {settings.phone}
                  </Link>
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.term}>Where</dt>
                <dd className={styles.value}>
                  {settings.addressLine}
                  <br />
                  {settings.postcode}
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.term}>Collection by arrangement</dt>
                <dd className={styles.value}>Most days, including evenings</dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.term}>Delivery</dt>
                <dd className={styles.value}>{settings.deliveryArea}</dd>
              </div>
            </dl>
            <p className={styles.kitchen}>
              I am a one-person kitchen, so I am not always by the phone. Email
              reaches me fastest.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
