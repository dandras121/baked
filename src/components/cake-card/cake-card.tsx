import NextLink from "next/link";
import { ButtonLink } from "@/components/ui/button";
import type { CakeCardData } from "@/lib/home-content";
import styles from "./cake-card.module.css";

/**
 * The cake card, closed (§4.1; desktop 1487:8534, tablet 1553:10842, phone Home 1381:10001).
 * View and the cake name go to the cake page; the rest of the card is not a link. The picture is the
 * placeholder until photos and the card video arrive (3.1 / 3.4); the corner button comes with ANIM-11 (3.4).
 */
export function CakeCard({
  cake,
  variant = "home",
}: {
  cake: CakeCardData;
  variant?: "home";
}) {
  const href = `/cakes/${cake.slug}`;
  return (
    <article className={styles.card} data-variant={variant} data-cake-card>
      <div className={styles.picture} aria-hidden />
      <h3 className={styles.name}>
        <NextLink href={href} className={styles.nameLink}>
          {cake.name}
        </NextLink>
      </h3>
      <p className={styles.flavour}>{cake.flavour}</p>
      <div className={styles.bottom}>
        <p className={styles.tiers}>
          <span>{cake.tiers}</span>
          <span className="visually-hidden">, </span>
          <span>{cake.serves}</span>
        </p>
        <div className={styles.buy}>
          <p className={styles.from}>{cake.from}</p>
          <ButtonLink href={href} size="card" className={styles.view}>
            View<span className="visually-hidden"> {cake.name}</span>
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
