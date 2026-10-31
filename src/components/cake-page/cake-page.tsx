import { Link } from "@/components/ui/link";
import type { CakePageData } from "@/lib/cake-page";
import { CakeMedia } from "./cake-media";
import styles from "./cake-page.module.css";

/**
 * The cake page, step 1 — The cake (§5.1; desktop 609:2889, phone 815:5841). Slice 3.5: the photos and videos and
 * the cake's own lines. The stepper (4.1) and the sizes, options, inscription, price, allergens and Add to order
 * (3.6a / 3.6b) come in their own slices.
 */
export function CakePage({ cake }: { cake: CakePageData }) {
  return (
    <div className={styles.page}>
      <CakeMedia items={cake.media} name={cake.name} />
      <div className={styles.content}>
        <Link href="/cakes" className={styles.back}>
          ← Back to the range
        </Link>
        {cake.tierLine && <p className={styles.tierLine}>{cake.tierLine}</p>}
        <h1 className={styles.name}>{cake.name}</h1>
        <p className={styles.whatItIs}>{cake.whatItIs}</p>
        {cake.from && <p className={styles.from}>{cake.from}</p>}
      </div>
    </div>
  );
}
