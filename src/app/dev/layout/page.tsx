import type { Metadata } from "next";
import { PageShell, PageWidth } from "@/components/page-shell/page-shell";
import { ViewportWidth } from "./viewport-width";
import styles from "./layout-page.module.css";

export const metadata: Metadata = {
  title: "Layout and breakpoints — Baked by Linda",
};

export default function LayoutPage() {
  return (
    <PageShell
      header={<div className={styles.slot}>Header slot (phase 1)</div>}
      footer={
        <div className={`${styles.slot} ${styles.footerSlot}`}>
          Footer slot (phase 1)
        </div>
      }
    >
      <div className={styles.bleed}>
        <PageWidth className={styles.content}>
          <h1 className="type-wordmark">Layout and breakpoints</h1>
          <p className={styles.band} data-testid="band">
            <span className="only-phone">
              Phone (below 768 px) · design width 402
            </span>
            <span className="only-tablet">
              Tablet (768–1119 px) · the desktop design × 0.8 at 1024
            </span>
            <span className="only-desktop">
              Desktop (1120 px and wider) · design width 1280
            </span>
          </p>
          <p>
            Window width: <ViewportWidth />. The pink band runs edge to edge;
            the white box is the content, at most 1280 px wide and centred.
          </p>
        </PageWidth>
      </div>

      <PageWidth className={styles.content}>
        <h2 className="type-heading-sm">Design pixels</h2>
        <p>
          Horizontal sizes follow the window; type sizes do not (RESPONSIVE
          §2–4).
        </p>
        <div
          className={`only-phone ${styles.ruler} ${styles.rulerPhone}`}
          data-testid="ruler-phone"
        >
          phone cake card · 274 design px
        </div>
        <div
          className={`${styles.ruler} ${styles.rulerDesktop}`}
          data-testid="ruler"
        >
          cake card · 355 design px
        </div>

        <h2 className="type-heading-sm">Card grid</h2>
        <p>
          Catalogue: 3 columns on desktop and tablet, 2 on the phone (RESPONSIVE
          §3.2).
        </p>
        <ul className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className={styles.card} aria-hidden />
          ))}
        </ul>

        <h2 className="type-heading-sm">Type per band</h2>
        <p>
          Tablet: max(0.8 × desktop, min(desktop, 14 px)); the same at every
          tablet width (RESPONSIVE §3.2–3.3).
        </p>
        <p className={`type-section ${styles.wrap}`} data-testid="type-section">
          Cakes
        </p>
        <p className="type-body" data-testid="type-body">
          Body text, 16 px on desktop and 14 px on tablet.
        </p>
        <p className="type-label" data-testid="type-label">
          FIELD LABEL, 11 PX EVERYWHERE
        </p>
      </PageWidth>
    </PageShell>
  );
}
