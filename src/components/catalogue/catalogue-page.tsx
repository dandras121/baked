import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { CatalogueCake } from "@/lib/catalogue";
import { telHref } from "@/components/contact/contact-page";
import { CatalogueGrid } from "./catalogue-grid";
import { ClearedNotice } from "./cleared-notice";
import styles from "./catalogue.module.css";

/** The six “cake from above” slots of the header (§0.6): empty circles until Bohoka's pictures arrive. */
const SLOTS = [1, 2, 3, 4, 5, 6];

/**
 * The full range (§4.2; desktop 599:2721, tablet 1557:11293, phone 798:5566): “Browse my recipes.” with its
 * placeholder slots, the occasion pills and the grid on the pink texture band, 12 at a time.
 */
export function CataloguePage({
  cakes,
  phone,
}: {
  cakes: CatalogueCake[];
  phone: string | null;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/glow.webp" alt="" className={styles.glow} aria-hidden />
        {SLOTS.map((n) => (
          <span key={n} className={styles.slot} data-slot={n} aria-hidden />
        ))}
        <h1 className={styles.title}>
          Browse
          <br />
          my recipes.
        </h1>
      </header>
      <ClearedNotice />
      {cakes.length === 0 ? (
        // No visible designs at all (1108:9884): no filter row, no count.
        <section className={styles.empty} aria-labelledby="range-empty">
          <h2 id="range-empty" className={styles.noticeTitle}>
            The range is being photographed
          </h2>
          <div className={styles.noticeActions}>
            <ButtonLink href="/bespoke">Start a bespoke enquiry</ButtonLink>
            {phone && <Link href={telHref(phone)}>Or call me</Link>}
          </div>
        </section>
      ) : (
        <CatalogueGrid cakes={cakes} />
      )}
    </div>
  );
}
