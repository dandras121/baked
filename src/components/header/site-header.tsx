import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/db/site-settings";
import { DesktopNav } from "./desktop-nav";
import { HeaderShadow } from "./header-shadow";
import { MobileMenu } from "./mobile-menu";
import mobile from "./mobile-menu.module.css";
import { NAV_ITEMS } from "./nav-items";
import styles from "./site-header.module.css";

/**
 * The header bar of every public page (SITE-FLOWS §3.1; Nav / Header — v3 1421:9315).
 * Desktop (≥ 1120 px): logo mark, wordmark, seven navigation items. Below 1120 px the compact bar
 * (1461:9222, 1549:10272) with the “menu” button and the menu overlay (ANIMATIONS §4).
 */
export async function SiteHeader() {
  const settings = await getSiteSettings();
  return (
    <HeaderShadow className={styles.root}>
      <span className={styles.shadow} aria-hidden />
      <MobileMenu
        instagram={settings?.instagram ?? null}
        facebook={settings?.facebook ?? null}
      />
      <noscript>
        <style>{"[data-menu-button]{display:none}"}</style>
        <details className={mobile.noJs}>
          <summary className="type-social">menu</summary>
          <nav aria-label="Menu" className={mobile.noJsPanel}>
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="type-menu-item">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </noscript>
      <div className={`shell ${styles.bar}`}>
        <div className={styles.inner}>
          {/* Decorative emblem, cut by the bar as drawn; it slides in on the first load (ANIM-04, slice 1.3). */}
          <Image
            className={`${styles.mark} logo-mark`}
            src="/brand/logo-mark.svg"
            alt=""
            width={139}
            height={150}
            priority
            unoptimized
          />
          <Link
            href="/"
            className={styles.wordmark}
            data-pressable=""
            data-home-link
          >
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
