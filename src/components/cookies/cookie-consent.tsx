"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Overlay } from "@/components/ui/overlay";
import { applyAnalyticsConsent } from "@/lib/analytics";
import { consentCookie, readConsent, type Consent } from "@/lib/consent";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";
import { CookieSwitch, LockIcon } from "./cookie-switch";
import styles from "./cookie-consent.module.css";

/** The footer's Cookie preferences control sends this to open the panel (§3.2, §3.3). */
export const OPEN_COOKIE_SETTINGS = "bbl:cookie-settings";

const bar = data.surfaceMotion.cookieBar;
const m = data.surfaceMotion;

type BarState = "hidden" | "shown" | "leaving";

/**
 * The cookie bar (desktop / tablet: the floating card 1003:9112; phone: the sheet 1004:9096) and the
 * settings panel (1003:9135 / 1004:9117; reopened 1199:9345), SITE-FLOWS §3.3 and §10.11.
 * Nothing renders without JavaScript, and nothing beyond the essential cookies is set before a choice.
 */
export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [barState, setBarState] = useState<BarState>("hidden");
  const [panel, setPanel] = useState<{ open: boolean; from: "bar" | "footer" }>(
    { open: false, from: "bar" },
  );
  const [analytics, setAnalytics] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const descId = useId();

  // First paint: read the stored choice; without a valid one the bar comes in after 700 ms (ANIM-15).
  useEffect(() => {
    const stored = readConsent(document.cookie);
    const timer = window.setTimeout(
      () => {
        setConsent(stored);
        if (stored) applyAnalyticsConsent(stored.analytics);
        else setBarState("shown");
      },
      stored || isMotionReduced() ? 0 : bar.delayMs,
    );
    return () => window.clearTimeout(timer);
  }, []);

  // ANIM-15 in: 24 px up and fade in, 320 ms ease-out. Never takes the focus.
  useEffect(() => {
    const el = barRef.current;
    if (barState !== "shown" || !el || isMotionReduced()) return;
    el.animate(
      [
        { transform: `translateY(${bar.offsetPx}px)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: bar.inMs, easing: m.easeOut },
    );
  }, [barState]);

  // While the bar shows, the page keeps room for it at the bottom (§3.3 Page padding, WCAG 2.4.11).
  useEffect(() => {
    const el = barRef.current;
    const root = document.documentElement;
    if (barState === "hidden" || !el) {
      root.style.removeProperty("--cookie-space");
      return;
    }
    const card = el.querySelector<HTMLElement>("[data-cookie-card]") ?? el;
    const measure = () => {
      const gap = window.innerWidth >= 768 ? 24 : 0;
      root.style.setProperty("--cookie-space", `${card.offsetHeight + gap}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--cookie-space");
    };
  }, [barState]);

  const leaveBar = useCallback(() => {
    const el = barRef.current;
    if (!el || isMotionReduced()) {
      setBarState("hidden");
      return;
    }
    setBarState("leaving");
    const out = el.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: `translateY(${bar.offsetPx}px)`, opacity: 0 },
      ],
      { duration: bar.outMs, easing: m.easeIn, fill: "forwards" },
    );
    out.onfinish = () => setBarState("hidden");
  }, []);

  /** Store a choice: the cookie, analytics on or off at once, the bar and the panel close. */
  const choose = (allowAnalytics: boolean) => {
    document.cookie = consentCookie(allowAnalytics);
    const stored = readConsent(document.cookie);
    setConsent(stored);
    applyAnalyticsConsent(allowAnalytics);
    setPanel((p) => ({ ...p, open: false }));
    if (barState !== "hidden") leaveBar();
  };

  const openPanel = useCallback(
    (from: "bar" | "footer") => {
      setAnalytics(consent?.analytics ?? false);
      setPanel({ open: true, from });
      if (from === "bar") setBarState("hidden"); // it comes back if the panel closes without a choice
    },
    [consent],
  );

  // The footer's Cookie preferences opens the same panel.
  useEffect(() => {
    const onOpen = () => openPanel("footer");
    window.addEventListener(OPEN_COOKIE_SETTINGS, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, onOpen);
  }, [openPanel]);

  /** Closed without a choice (Esc, scrim): nothing is stored; on a first visit the bar shows again. */
  const cancel = () => {
    setPanel((p) => ({ ...p, open: false }));
    if (!consent && panel.from === "bar") setBarState("shown");
  };

  const reopened = consent !== null;

  return (
    <>
      {barState !== "hidden" && (
        <section
          ref={barRef}
          className={styles.bar}
          aria-label="Cookies"
          data-testid="cookie-bar"
        >
          <span className={styles.hint} aria-hidden />
          <div className={styles.card} data-cookie-card>
            <span className={styles.grabber} aria-hidden />
            <h2 className={styles.title}>Cookies</h2>
            <p className={`${styles.text} ${styles.wideOnly}`}>
              A couple are essential to make the checkout work. One more — only
              if you agree — tells me which designs people look at.
            </p>
            <p className={`${styles.text} ${styles.phoneOnly}`}>
              I use a couple of essential cookies to make the checkout work, and
              — only if you agree — one that tells me which designs people look
              at.
            </p>
            <Link href="/cookies" className={styles.policy}>
              Cookie policy
            </Link>
            <div className={styles.barButtons}>
              <Button className={styles.button} onClick={() => choose(true)}>
                Accept all
              </Button>
              <Button className={styles.button} onClick={() => choose(false)}>
                Essential only
              </Button>
              <Button
                variant="secondary"
                className={styles.button}
                onClick={() => openPanel("bar")}
              >
                Settings
              </Button>
            </div>
          </div>
        </section>
      )}

      <Overlay
        open={panel.open}
        onClose={cancel}
        title="Cookie settings"
        description={
          reopened
            ? "Essential cookies keep the checkout working. Here's what you're currently sharing — switch anything off just as easily as you switched it on."
            : "Essential cookies keep the checkout working. The rest are yours to decide."
        }
        classNames={{
          panel: styles.panel,
          title: styles.panelTitle,
          description: styles.panelIntro,
          body: styles.panelBody,
        }}
      >
        <div className={styles.rows}>
          <div className={styles.row} data-locked="">
            <div>
              <p className={styles.rowName}>Essential</p>
              <p className={styles.rowText}>
                Checkout, your basket and security. Cannot be switched off.
              </p>
            </div>
            <div className={styles.rowControl}>
              <LockIcon />
              <CookieSwitch
                checked
                locked
                label="Essential cookies, always on"
              />
            </div>
          </div>
          <div className={styles.row}>
            <div>
              <p className={styles.rowName}>Analytics</p>
              <p className={styles.rowText} id={descId}>
                Which designs get looked at, so I know what to bake more of.{" "}
                {analytics ? "Currently on." : "Off until you switch it on."}
              </p>
            </div>
            <div className={styles.rowControl}>
              <CookieSwitch
                checked={analytics}
                onChange={setAnalytics}
                label="Analytics"
                describedBy={descId}
              />
            </div>
          </div>
        </div>
        <div className={styles.pair}>
          <Button className={styles.button} onClick={() => choose(true)}>
            Accept all
          </Button>
          <Button className={styles.button} onClick={() => choose(false)}>
            Essential only
          </Button>
        </div>
        <Button
          variant="secondary"
          block
          className={styles.button}
          onClick={() => choose(analytics)}
        >
          Save my choices
        </Button>
        <Link href="/cookies" className={styles.policy}>
          Cookie policy
        </Link>
        <p className={styles.footnote}>
          {reopened
            ? "Opened from the footer — you can come back and change this any time."
            : "You can change this any time from the footer."}
        </p>
      </Overlay>
    </>
  );
}
