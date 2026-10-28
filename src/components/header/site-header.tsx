import Image from "next/image";
import Link from "next/link";
import { DesktopNav } from "./desktop-nav";
import { HeaderShadow } from "./header-shadow";
import styles from "./site-header.module.css";

/**
 * The header bar of every public page (SITE-FLOWS §3.1; Nav / Header — v3 1421:9315).
 * Desktop (≥ 1120 px): logo mark, wordmark, seven navigation items. Below 1120 px the compact bar
 * (1461:9222, 1549:10272); its “menu” button and menu overlay come in slice 1.2.
 */
export function SiteHeader() {
  return (
    <HeaderShadow className={styles.root}>
      <span className={styles.shadow} aria-hidden />
      <div className={styles.bar}>
        <div className={styles.inner}>
          {/* Decorative emblem, cut by the bar as drawn; it slides in on the first load (ANIM-04, slice 1.3). */}
          <Image
            className={styles.mark}
            src="/brand/logo-mark.svg"
            alt=""
            width={139}
            height={150}
            priority
            unoptimized
          />
          <Link href="/" className={styles.wordmark} data-pressable="">
            <Image
              src="/brand/wordmark.svg"
              alt="Baked by Linda"
              width={337}
              height={51}
              priority
              unoptimized
            />
          </Link>
          <div className={styles.desktopNav}>
            <DesktopNav />
          </div>
        </div>
      </div>
    </HeaderShadow>
  );
}
