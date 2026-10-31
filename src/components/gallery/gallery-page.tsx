import { ButtonLink } from "@/components/ui/button";
import { GALLERY_INTRO, type GalleryTile } from "@/lib/gallery";
import { GalleryGrid } from "./gallery-grid";
import styles from "./gallery.module.css";

/**
 * Gallery (§4.8; desktop 1633:11617, tablet 1638:11793, phone 1636:11699; empty 1633:12222). The title follows
 * Appendix A (“Cakes,⏎I have made.”).
 */
export function GalleryPage({ tiles }: { tiles: GalleryTile[] }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Cakes,
        <br />I have made.
      </h1>
      {tiles.length === 0 ? (
        <section className={styles.empty} aria-labelledby="gallery-empty">
          <h2 id="gallery-empty" className={styles.emptyTitle}>
            The gallery is being put together.
          </h2>
          <p className={styles.emptyText}>
            In the meantime, have a look at the ready-made range or tell me your
            idea.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="/cakes">Browse the designs</ButtonLink>
            <ButtonLink href="/bespoke" variant="outline">
              Start a bespoke enquiry
            </ButtonLink>
          </div>
        </section>
      ) : (
        <>
          <div className={styles.body}>
            <p className={styles.intro}>{GALLERY_INTRO}</p>
            <ButtonLink href="/bespoke" className={styles.start}>
              Start a bespoke enquiry
            </ButtonLink>
            <GalleryGrid tiles={tiles} />
          </div>
          <section className={styles.cta} aria-labelledby="gallery-cta">
            <p className={styles.eyebrow}>Bespoke</p>
            <h2 id="gallery-cta" className={styles.ctaTitle}>
              Have an idea of your own?
            </h2>
            <p className={styles.ctaText}>
              Tell me about it — I answer every message within 24 hours, usually
              sooner.
            </p>
            <ButtonLink href="/bespoke" className={styles.ctaButton}>
              Start a bespoke enquiry
            </ButtonLink>
          </section>
        </>
      )}
    </div>
  );
}
