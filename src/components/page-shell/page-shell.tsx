import type { ReactNode } from "react";
import styles from "./page-shell.module.css";

type PageShellProps = {
  /** The header bar (phase 1). Sticky on every breakpoint (RESPONSIVE §1). */
  header?: ReactNode;
  /** The footer (phase 1). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * The frame of every public page: header slot, main content, footer slot.
 * It is also the size container that the design unit --u is measured against (responsive.css).
 */
export function PageShell({ header, footer, children }: PageShellProps) {
  return (
    <div className={`shell ${styles.shell}`}>
      {/* First stop for the keyboard (§10.13): jumps past the header to the page content. */}
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>{header}</header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>{footer}</footer>
    </div>
  );
}

/** Content that stays at most 1280 px wide and centred; its background box can still run edge to edge. */
export function PageWidth({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.pageWidth} ${className}`}>{children}</div>;
}
