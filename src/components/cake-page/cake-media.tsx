"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SliderIndicator } from "@/components/ui/slider-indicator";
import { mediaLabel, type MediaItem } from "@/lib/cake-page";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./cake-page.module.css";

const CROSSFADE = data.surfaceMotion.media.crossfadeMs;
const EASE = data.surfaceMotion.easeInOut;

/**
 * The cake page's photos and videos (§5.1, UI-08, ANIM-22; desktop 1282:9599, phone 815:5879 / 1281:9621).
 * Desktop and tablet: the main picture between ‹ › (stopping at the ends) and the thumbnail strip; a change
 * cross-fades in 240 ms. Phone: a native swipe row with the slider indicator (ANIM-10) and the hint. A video
 * plays muted and looping while it is the active item, a tap unmutes it and a second tap mutes it again; moving
 * on stops it; only one plays. Reduced motion: nothing autoplays — the cover shows a play button. One photo and no
 * video: no strip, arrows, dashes or hint. No photo yet: the placeholder.
 */
export function CakeMedia({
  items,
  name,
}: {
  items: MediaItem[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const [unmuted, setUnmuted] = useState(false);
  const [started, setStarted] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const several = items.length > 1;

  const go = (i: number) => {
    if (i < 0 || i >= items.length || i === active) return;
    setActive(i);
    setUnmuted(false);
    setStarted(null);
    // Phone: the row scrolls to the item (the swipe itself is native).
    const r = row.current;
    if (r && getComputedStyle(r).display !== "none")
      r.children[i]?.scrollIntoView({
        behavior: isMotionReduced() ? "auto" : "smooth",
        inline: "start",
        block: "nearest",
      });
  };

  // ANIM-22: the new main item cross-fades over the old one in 240 ms.
  useLayoutEffect(() => {
    const el = stage.current?.querySelector<HTMLElement>(
      `[data-item="${active}"]`,
    );
    if (!el || shown === active) return;
    setShown(active);
    if (isMotionReduced()) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: CROSSFADE,
      easing: EASE,
    });
    // `shown` follows `active`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Phone: a native swipe moves the active item with it.
  useEffect(() => {
    const r = row.current;
    if (!r) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(r.scrollLeft / r.clientWidth);
        setActive((a) => (a === i ? a : i));
      });
    };
    r.addEventListener("scroll", onScroll, { passive: true });
    return () => r.removeEventListener("scroll", onScroll);
  }, []);

  const view = (item: MediaItem | undefined, i: number) => {
    if (!item) return <div className={styles.placeholder} aria-hidden />;
    if (item.kind === "photo")
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.alt}
          className={styles.photo}
          style={{
            objectPosition: `${item.focalX * 100}% ${item.focalY * 100}%`,
          }}
          loading={i === 0 ? "eager" : "lazy"}
        />
      );
    return (
      <MediaVideo
        item={item}
        active={i === active}
        unmuted={i === active && unmuted}
        started={started === i}
        onTap={() => {
          if (isMotionReduced() && started !== i) setStarted(i);
          else setUnmuted((u) => !u);
        }}
      />
    );
  };

  return (
    <div
      className={styles.media}
      role="region"
      aria-label={`Photos and videos of ${name}`}
    >
      {/* Desktop and tablet: one main item. */}
      <div className={styles.stage} ref={stage}>
        {items.length === 0
          ? view(undefined, 0)
          : items.map((item, i) => (
              <div
                key={i}
                className={styles.item}
                data-item={i}
                hidden={i !== active}
                aria-hidden={i !== active || undefined}
              >
                {view(item, i)}
              </div>
            ))}
        {several && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              aria-label="Previous photo or video"
              disabled={active === 0}
              data-pressable
              onClick={() => go(active - 1)}
            >
              <svg viewBox="0 0 10 46" aria-hidden>
                <path d="M9 1 1 23l8 22" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              aria-label="Next photo or video"
              disabled={active === items.length - 1}
              data-pressable
              onClick={() => go(active + 1)}
            >
              <svg viewBox="0 0 10 46" aria-hidden>
                <path d="M1 1l8 22-8 22" />
              </svg>
            </button>
          </>
        )}
      </div>
      {several && (
        <div
          className={styles.thumbs}
          role="group"
          aria-label="Choose a photo or video"
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={styles.thumb}
              aria-label={mediaLabel(items, i)}
              aria-current={i === active || undefined}
              data-pressable
              onClick={() => go(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.kind === "photo" ? item.src : (item.poster ?? "")}
                alt=""
                loading="lazy"
              />
              {item.kind === "video" && (
                <span className={styles.play} aria-hidden />
              )}
            </button>
          ))}
        </div>
      )}
      {/* Phone: a swipe row. */}
      <div
        className={styles.row}
        ref={row}
        data-row
        role="group"
        aria-label="Swipe through the photos and videos"
        tabIndex={0}
      >
        {items.length === 0
          ? view(undefined, 0)
          : items.map((item, i) => (
              <div
                key={i}
                className={styles.slide}
                data-slide
                inert={i !== active}
              >
                {view(item, i)}
              </div>
            ))}
      </div>
      {several && (
        <div className={styles.dashes}>
          <SliderIndicator
            count={items.length}
            active={active}
            onSelect={go}
            label={(i) => mediaLabel(items, i)}
          />
          <p className={styles.hint}>
            Swipe left or right for more photos and videos
          </p>
        </div>
      )}
    </div>
  );
}

/** One video (UI-08): muted autoplay and loop while active; a tap toggles the sound; reduced motion: a play button. */
function MediaVideo({
  item,
  active,
  unmuted,
  started,
  onTap,
}: {
  item: Extract<MediaItem, { kind: "video" }>;
  active: boolean;
  unmuted: boolean;
  started: boolean;
  onTap: () => void;
}) {
  const el = useRef<HTMLVideoElement>(null);
  // Read after hydration: the server cannot know it, and the first render must match the server's.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(isMotionReduced());
  }, []);
  useEffect(() => {
    const v = el.current;
    if (!v) return;
    const visible = v.offsetParent !== null;
    // The setting itself, not the state: the state is still false on the first run after hydration.
    if (active && visible && (!isMotionReduced() || started))
      void v.play().catch(() => {});
    else {
      v.pause();
      if (!active) v.currentTime = 0;
    }
  }, [active, reduced, started]);
  return (
    <button
      type="button"
      className={styles.videoButton}
      aria-label={
        reduced && !started
          ? `Play: ${item.alt}`
          : unmuted
            ? `Mute: ${item.alt}`
            : `Unmute: ${item.alt}`
      }
      onClick={onTap}
    >
      <video
        ref={el}
        className={styles.photo}
        src={item.src}
        poster={item.poster ?? undefined}
        muted={!unmuted}
        loop
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
      />
      {reduced && !started && (
        <span className={`${styles.play} ${styles.playBig}`} aria-hidden />
      )}
    </button>
  );
}
