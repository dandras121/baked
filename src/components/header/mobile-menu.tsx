"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { isMotionReduced } from "@/motion/reduced-motion";
import {
  LANDSCAPE_QUERY,
  menuGeometry,
  menuRows,
  menuTracks,
  SELECT,
  type MenuPart,
} from "./menu-timeline";
import { activeIndexFor, NAV_ITEMS } from "./nav-items";
import styles from "./mobile-menu.module.css";

export type SocialLink = { url: string; label: string };

type Phase = "closed" | "opening" | "open" | "closing" | "selecting";

const DESKTOP_MIN = 1120;
const MENU_ID = "site-menu";

const samePath = (a: string, b: string) =>
  a.replace(/\/$/, "") === b.replace(/\/$/, "");

const isPlainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * Phone and tablet menu (< 1120 px): the “menu” button and the overlay with the two circles
 * (ANIMATIONS §4, ANIM-01 open, ANIM-02 close, ANIM-03 select and navigate).
 * The overlay is fixed to the screen under the header bar; the page behind is inert while it shows.
 */
export function MobileMenu({
  instagram,
  facebook,
}: {
  instagram: SocialLink | null;
  facebook: SocialLink | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeIndexFor(pathname);

  const [phase, setPhase] = useState<Phase>("closed");
  const [lineItem, setLineItem] = useState(active);
  const [seenActive, setSeenActive] = useState(active);
  if (active !== seenActive) {
    setSeenActive(active);
    if (phase === "closed") setLineItem(active);
  }
  const [isPending, startTransition] = useTransition();
  const [reveal, setReveal] = useState<{
    navStarted: boolean;
    holdDone: boolean;
  } | null>(null);

  const button = useRef<HTMLButtonElement>(null);
  const pink = useRef<HTMLDivElement>(null);
  const white = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const items = useRef<HTMLUListElement>(null);
  const social = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const running = useRef<Animation[]>([]);
  const timers = useRef<number[]>([]);
  const historyPushed = useRef(false);
  const ignorePop = useRef<(() => void) | null>(null);
  const phaseRef = useRef<Phase>("closed");
  /** Every phase change goes through here, so handlers always see the current phase. */
  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const stopAnimations = useCallback(() => {
    for (const a of running.current) a.cancel();
    running.current = [];
  }, []);
  const stopAll = useCallback(() => {
    stopAnimations();
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, [stopAnimations]);
  /** Where focus goes once the next phase has rendered (the page is no longer inert by then). */
  const focusNext = useRef<"button" | "main" | null>(null);
  const setLive = (live: boolean) =>
    items.current?.toggleAttribute("data-live", live);

  /** Play one sampled part on every layer; resolves when it ends (or at once with reduced motion). */
  const playPart = useCallback(
    (part: MenuPart, underlineOf: number): Promise<void> => {
      const btn = button.current?.getBoundingClientRect();
      if (!btn || isMotionReduced()) return Promise.resolve();
      const g = menuGeometry(
        { right: btn.right, top: btn.top },
        { width: window.innerWidth, height: window.innerHeight },
      );
      const landscape = window.matchMedia(LANDSCAPE_QUERY).matches;
      const word = underlineOf >= 0 ? words.current[underlineOf] : null;
      const tracks = menuTracks(
        menuRows(part, landscape),
        g,
        word?.offsetWidth ?? 0,
      );
      const opts: KeyframeAnimationOptions = {
        duration: tracks.duration,
        easing: "linear",
        fill: "forwards",
      };
      const pairs: [Element | null | undefined, Keyframe[]][] = [
        [pink.current, tracks.pink],
        [white.current, tracks.white],
        [arrow.current, tracks.arrow],
        [items.current, tracks.menu],
        [social.current, tracks.social],
        [
          underlineOf >= 0 ? lines.current[underlineOf] : null,
          tracks.underline,
        ],
      ];
      const anims = pairs
        .filter(([el]) => el)
        .map(([el, k]) => el!.animate(k, opts));
      running.current.push(...anims);
      return anims[0].finished.then(
        () => undefined,
        () => undefined,
      );
    },
    [],
  );

  // History: opening pushes one entry so that Back only closes the menu (A§3.4).
  const pushEntry = () => {
    if (historyPushed.current) return;
    window.history.pushState(
      { ...window.history.state, bblMenu: true },
      "",
      window.location.href,
    );
    historyPushed.current = true;
  };
  const dropEntry = (after?: () => void) => {
    if (!historyPushed.current) {
      after?.();
      return;
    }
    historyPushed.current = false;
    ignorePop.current = after ?? (() => {});
    window.history.back();
  };

  const open = () => {
    if (phaseRef.current !== "closed") return; // input lock (A§1.5)
    pushEntry();
    go("opening");
  };

  // ANIM-01 starts once the overlay is on screen.
  useLayoutEffect(() => {
    if (phase !== "opening") return;
    setLive(false);
    const reduced = isMotionReduced();
    later(reduced ? 0 : SELECT.interactiveAtMs, () => {
      setLive(true);
      items.current?.querySelector("a")?.focus();
    });
    void playPart("open", lineItem).then(() => {
      if (phaseRef.current === "opening") go("open");
    });
    // lineItem is read when the animation starts only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, playPart]);

  const close = useCallback(
    (fromBack = false) => {
      if (phaseRef.current !== "open") return; // input lock while animating (A§1.5)
      stopAll();
      setLive(false);
      go("closing");
      if (!fromBack) dropEntry();
      else historyPushed.current = false;
      void playPart("close", lineItem).then(() => {
        if (phaseRef.current !== "closing") return;
        focusNext.current = "button";
        go("closed");
      });
    },

    [lineItem, playPart, stopAll],
  );

  /** ANIM-03: underline the tapped item, hand over to the new page at 240 ms, reveal it 300–920 ms. */
  const select = (i: number) => {
    const p = phaseRef.current;
    if (
      p !== "open" &&
      !(p === "opening" && items.current?.hasAttribute("data-live"))
    )
      return;
    stopAll();
    setLive(false);
    go("selecting");
    const href = NAV_ITEMS[i].href;
    const same = i === active && samePath(pathname, href);
    const reduced = isMotionReduced();

    if (!reduced && i !== lineItem) {
      const ease = { easing: SELECT.easing, fill: "both" as const };
      const old = lineItem >= 0 ? lines.current[lineItem] : null;
      const oldW = lineItem >= 0 ? words.current[lineItem]?.offsetWidth : 0;
      if (old)
        running.current.push(
          // Retracts to 2 px, then is gone (the tapped item takes the underline).
          old.animate(
            [
              { width: `${oldW}px`, opacity: 1 },
              { width: "2px", opacity: 1, offset: 0.99 },
              { width: "2px", opacity: 0 },
            ],
            { ...ease, duration: SELECT.retractMs },
          ),
        );
      const next = lines.current[i];
      const w = words.current[i]?.offsetWidth ?? 0;
      if (next)
        running.current.push(
          next.animate([{ width: "2px" }, { width: `${w}px` }], {
            ...ease,
            delay: SELECT.retractMs,
            duration: SELECT.drawMs,
          }),
        );
    }

    const navigate = () => {
      setReveal({ navStarted: true, holdDone: reduced });
      window.scrollTo(0, 0);
      startTransition(() => {
        if (same && !window.location.search && !window.location.hash)
          router.refresh();
        else router.replace(href);
      });
    };
    setReveal({ navStarted: false, holdDone: false });
    later(reduced ? 0 : SELECT.handoffMs, () => {
      // The menu's history entry goes first, so the new page takes the old page's place after it.
      if (same) dropEntry(navigate);
      else {
        historyPushed.current = false;
        navigate();
      }
      later(reduced ? 0 : SELECT.holdUntilMs - SELECT.handoffMs, () =>
        setReveal((r) => (r ? { ...r, holdDone: true } : r)),
      );
    });
    // The tapped item is the active one from here on.
    later(reduced ? 0 : SELECT.handoffMs, () => setLineItem(i));
  };

  // The reveal starts at 300 ms, or as soon as the new route has rendered if that takes longer.
  useEffect(() => {
    if (!reveal?.navStarted || !reveal.holdDone || isPending) return;
    // A state transition that starts the reveal animation once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReveal(null);
    void playPart("selectReverse", lineItem).then(() => {
      if (phaseRef.current !== "selecting") return;
      focusNext.current = "main";
      go("closed");
    });
  }, [reveal, isPending, lineItem, playPart]);

  // Back closes only the menu; Esc closes it; a restored page (bfcache) shows it closed.
  useEffect(() => {
    const onPop = () => {
      const after = ignorePop.current;
      if (after) {
        ignorePop.current = null;
        after();
        return;
      }
      if (historyPushed.current) close(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted && phaseRef.current !== "closed") {
        stopAll();
        historyPushed.current = false;
        go("closed");
      }
    };
    // Rotation / resize: the static open state needs nothing; a running animation snaps to its end;
    // at 1120 px and wider the menu closes at once (A§3.4).
    const onResize = () => {
      if (phaseRef.current === "closed") return;
      for (const a of running.current) a.finish();
      if (window.innerWidth >= DESKTOP_MIN) {
        stopAll();
        dropEntry();
        go("closed");
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("resize", onResize);
    };
  }, [close, stopAll]);

  // While the menu shows: the page behind is inert and does not scroll; the logo acts as Home (A§3.4).
  const shown = phase !== "closed";
  useEffect(() => {
    if (!shown) return;
    const html = document.documentElement;
    const behind = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-page-content], [data-skip-link]",
      ),
    ];
    html.style.overflow = "hidden";
    behind.forEach((el) => (el.inert = true));
    const onLogo = (e: Event) => {
      const link = (e.target as Element).closest?.("[data-home-link]");
      if (!link || !isPlainClick(e as unknown as MouseEvent)) return;
      e.preventDefault();
      e.stopPropagation();
      select(0);
    };
    document.addEventListener("click", onLogo, true);
    return () => {
      html.style.overflow = "";
      behind.forEach((el) => (el.inert = false));
      document.removeEventListener("click", onLogo, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  // Finished animations hand over to the static state of the new phase (no flash in between).
  useLayoutEffect(() => {
    if (phase === "closed") stopAll();
    if (phase === "open") {
      stopAnimations();
      setLive(true);
      const first = items.current?.querySelector("a");
      if (first && !items.current?.contains(document.activeElement))
        first.focus();
    }
  }, [phase, stopAll, stopAnimations]);

  useEffect(() => {
    if (phase !== "closed" || !focusNext.current) return;
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "button") button.current?.focus();
    else document.getElementById("main")?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => () => stopAll(), [stopAll]);

  const expanded = phase !== "closed";
  const socials = [
    instagram?.url ? { ...instagram, kind: "instagram" as const } : null,
    facebook?.url ? { ...facebook, kind: "facebook" as const } : null,
  ].filter((s) => s !== null);

  return (
    <>
      <div
        id={MENU_ID}
        className={styles.overlay}
        data-state={phase}
        hidden={!expanded}
      >
        <div ref={pink} className={styles.pink} aria-hidden />
        <div ref={white} className={styles.white} aria-hidden />
        <div className={styles.scroller}>
          <div className={styles.content}>
            <nav aria-label="Menu" className={styles.nav}>
              <ul ref={items} className={styles.items}>
                {NAV_ITEMS.map((item, i) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={`${styles.item} type-menu-item`}
                      data-pressable="row"
                      aria-current={i === active ? "page" : undefined}
                      onClick={(e) => {
                        if (!isPlainClick(e)) return;
                        e.preventDefault();
                        select(i);
                      }}
                    >
                      <span
                        ref={(el) => {
                          words.current[i] = el;
                        }}
                        data-pressable-content
                        className={styles.word}
                      >
                        {item.label}
                      </span>
                      <span
                        ref={(el) => {
                          lines.current[i] = el;
                        }}
                        aria-hidden
                        data-line={i === lineItem ? "" : undefined}
                        className={styles.underline}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div ref={social} className={styles.social}>
              {socials.length > 0 && (
                <>
                  <p className={`${styles.socialHeading} type-menu-social`}>
                    Follow our social media
                  </p>
                  <ul className={styles.socialLinks}>
                    {socials.map((s) => (
                      <li key={s.kind}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener"
                          className={`${styles.socialLink} type-social`}
                          data-pressable=""
                        >
                          {s.kind === "instagram" ? (
                            <InstagramIcon />
                          ) : (
                            <FacebookIcon />
                          )}
                          {s.label}
                          <span className="visually-hidden">
                            {" "}
                            ({s.kind === "instagram" ? "Instagram" : "Facebook"}
                            , opens in a new tab)
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <button
        ref={button}
        type="button"
        className={styles.button}
        data-menu-button
        data-pressable=""
        data-open={expanded ? "" : undefined}
        aria-expanded={expanded}
        aria-controls={MENU_ID}
        aria-label={expanded ? "Close menu" : "Open menu"}
        onClick={() => (phaseRef.current === "closed" ? open() : close())}
      >
        <span className={`${styles.label} type-social`}>menu</span>
        <svg
          ref={arrow}
          className={styles.arrow}
          viewBox="0 0 4.0875 7.1763"
          aria-hidden
        >
          <path
            d="M0.398438 0.398438L3.6875 3.58813L0.398438 6.77783"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}

function InstagramIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 17 17" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.0625">
        <path d="M10.7833 2H5.68333C3.64908 2 2 3.64908 2 5.68333V10.7833C2 12.8176 3.64908 14.4667 5.68333 14.4667H10.7833C12.8176 14.4667 14.4667 12.8176 14.4667 10.7833V5.68333C14.4667 3.64908 12.8176 2 10.7833 2Z" />
        <path d="M8.90417 11.8083C10.5081 11.8083 11.8083 10.5081 11.8083 8.90417C11.8083 7.30024 10.5081 6 8.90417 6C7.30024 6 6 7.30024 6 8.90417C6 10.5081 7.30024 11.8083 8.90417 11.8083Z" />
      </g>
      <path
        fill="currentColor"
        d="M11.8146 5.62917C12.2645 5.62917 12.6292 5.26447 12.6292 4.81458C12.6292 4.3647 12.2645 4 11.8146 4C11.3647 4 11 4.3647 11 4.81458C11 5.26447 11.3647 5.62917 11.8146 5.62917Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 17 17" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.0625"
        strokeLinecap="round"
      >
        <path d="M8.23333 14.4667C11.6759 14.4667 14.4667 11.6759 14.4667 8.23333C14.4667 4.79076 11.6759 2 8.23333 2C4.79076 2 2 4.79076 2 8.23333C2 11.6759 4.79076 14.4667 8.23333 14.4667Z" />
        <path d="M10.825 6H9.7625C9.58576 6 9.41076 6.03481 9.24747 6.10245C9.08419 6.17008 8.93582 6.26921 8.81085 6.39419C8.68588 6.51916 8.58675 6.66752 8.51911 6.83081C8.45148 6.99409 8.41667 7.1691 8.41667 7.34583V14.7833M7 9.32917H10.1167" />
      </g>
    </svg>
  );
}
