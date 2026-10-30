import Image from "next/image";
import NextLink from "next/link";
import { cacheLife } from "next/cache";
import { CookiePreferencesButton } from "@/components/cookies/cookie-preferences-button";
import { Link } from "@/components/ui/link";
import { getSiteSettings } from "@/db/site-settings";
import { londonDate } from "@/lib/london-time";
import { FooterMascot } from "./footer-mascot";
import styles from "./site-footer.module.css";

/** The legal pages (SITE-FLOWS §2), in reading order: the left column first, then the right one. */
const LEGAL = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Cookie policy", href: "/cookies" },
  { label: "Terms & conditions", href: "/terms" },
  { label: "Delivery & collection", href: "/delivery-and-collection" },
  { label: "Cancellations & refunds", href: "/cancellations" },
  { label: "Accessibility statement", href: "/accessibility" },
  { label: "Complaints procedure", href: "/complaints" },
  { label: "Allergen information", href: "/allergens" },
] as const;

/** © year: the current year in London (Proposal §3.2), refreshed daily. */
async function currentYear() {
  "use cache";
  cacheLife("days");
  return londonDate(new Date()).slice(0, 4);
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/**
 * The footer of every public page (SITE-FLOWS §3.2; desktop 1411:9627, tablet 1551:10408, phone
 * 1461:9223). Business facts come from Settings (§11.1); where no database is configured (a preview
 * before Neon) they are left out, never typed in.
 */
export async function SiteFooter() {
  const [s, year] = await Promise.all([getSiteSettings(), currentYear()]);
  return (
    <div className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <NextLink href="/" className={styles.wordmark} data-pressable="">
            <Image
              src="/brand/wordmark.svg"
              alt="Baked by Linda"
              width={337}
              height={51}
              unoptimized
            />
          </NextLink>
          {s && (
            <>
              <p className={`${styles.tagline} type-footer-text`}>
                Bespoke celebration cakes, made by hand in West Lothian and
                delivered across {s.deliveryArea}.
              </p>
              <p className={`${styles.address} type-footer-text`}>
                {s.addressLine}
                <br />
                {s.postcode}
                <br />
                Scotland
              </p>
              <p className={`${styles.contact} type-footer-contact`}>
                <Link href={`mailto:${s.email}`} className={styles.ink}>
                  {s.email}
                </Link>
                <br />
                <Link href={telHref(s.phone)} className={styles.ink}>
                  {s.phone}
                </Link>
              </p>
            </>
          )}
          <p className={styles.findMyOrder}>
            <Link
              href="/find-my-order"
              className={`${styles.ink} ${styles.underlined} type-footer-contact`}
            >
              Find my order →
            </Link>
          </p>
        </div>

        <nav aria-labelledby="footer-legal" className={styles.legal}>
          <h2 id="footer-legal" className={`${styles.title} type-footer-title`}>
            LEGAL
          </h2>
          <ul className={`${styles.legalList} type-footer-legal`}>
            {LEGAL.map((page) => (
              <li key={page.href}>
                <Link href={page.href} dense className={styles.inkDeep}>
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-food" className={styles.food}>
          <h2 id="footer-food" className={`${styles.title} type-footer-title`}>
            FOOD &amp; COMPLIANCE
          </h2>
          <ul className={`${styles.foodList} type-small`}>
            {s && <li>Food business registered with {s.council}</li>}
            {s && <li>Food Hygiene Information Scheme: {s.hygieneRating}</li>}
            <li>
              Allergen information for all 14 regulated allergens is shown on
              every cake page
            </li>
          </ul>
        </section>

        <div className={styles.bottom}>
          {s && (
            <p className={`${styles.smallPrint} type-small`}>
              {s.tradingName} is the trading name of {s.legalName}, a sole
              trader based in Scotland. The address above is the address for
              service. Every cake is made to your specification and is
              perishable, so the 14-day right to cancel under the Consumer
              Contracts Regulations 2013 does not apply to these orders — see{" "}
              <Link
                href="/cancellations"
                variant="inline"
                className={styles.inkDeep}
              >
                Cancellations &amp; refunds
              </Link>{" "}
              for the terms that do.
            </p>
          )}
          <div className={styles.closing}>
            <p className={`${styles.copyright} type-small`}>
              © {year}
              {s ? ` ${s.tradingName}` : ""}. All rights reserved.
            </p>
            <CookiePreferencesButton className={styles.cookies} />
          </div>
        </div>
      </div>
      <FooterMascot />
    </div>
  );
}
