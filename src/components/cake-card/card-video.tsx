"use client";

import { useEffect, useRef, useState } from "react";
import type { CardVideo as CardVideoData } from "@/lib/home-content";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";

const OPEN_MS = data.cakeCard.openMs;
const FADE_MS = data.cakeCard.closeFadeMs;

/**
 * The card video (ANIM-11, §9.13): fetched only on the first open (`preload="none"`; 1080 on phones and tablets,
 * 1440 on desktop); it starts from frame 0 when the card is fully open — or, if it is not loaded yet, as soon as
 * it can play through — muted, inline, looping, without controls, and it cannot be paused by the visitor. It pauses
 * while the card is off screen or the tab is hidden and resumes where it was. Closing stops it and cross-fades its
 * frame back to the still in 120 ms. Reduced motion: it never starts; the open card shows the still.
 */
export function CardVideo({
  video,
  open,
}: {
  video: CardVideoData;
  open: boolean;
}) {
  const el = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  // Fully open (the open motion has ended) and allowed to play.
  const ready = useRef(false);
  const visible = useRef(true);
  // The first open chooses the size and starts loading during the opening (not with reduced motion).
  if (open && !src && typeof window !== "undefined" && !isMotionReduced())
    setSrc(window.innerWidth >= 1120 ? video.v1440 : video.v1080);

  const start = () => {
    const v = el.current;
    if (!v || !ready.current || !visible.current || document.hidden) return;
    if (v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA)
      void v.play().catch(() => {});
    else v.addEventListener("canplaythrough", start, { once: true });
  };

  useEffect(() => {
    const v = el.current;
    if (!v) return;
    if (!open) {
      ready.current = false;
      if (v.paused && !playing) return;
      v.pause();
      // The current frame cross-fades to the still, then the video waits at frame 0.
      const fade = v.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: isMotionReduced() ? 0 : FADE_MS,
        fill: "forwards",
      });
      fade.finished.then(
        () => {
          setPlaying(false);
          fade.cancel();
          v.currentTime = 0;
        },
        () => {},
      );
      return;
    }
    if (isMotionReduced()) return;
    const timer = setTimeout(() => {
      ready.current = true;
      start();
    }, OPEN_MS);
    return () => clearTimeout(timer);
    // `start` reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Off screen or a hidden tab: pause; back: resume where it was.
  useEffect(() => {
    const v = el.current;
    if (!v) return;
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (!entry.isIntersecting) v.pause();
      else start();
    });
    io.observe(v.parentElement!);
    const onVisibility = () => (document.hidden ? v.pause() : start());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
      ref={el}
      src={src ?? undefined}
      poster={video.still}
      // Nothing is fetched until the first open; then it loads during the opening.
      preload={src ? "auto" : "none"}
      muted
      playsInline
      loop
      disablePictureInPicture
      aria-hidden
      tabIndex={-1}
      data-playing={playing ? "" : undefined}
      onPlaying={() => setPlaying(true)}
      onLoadedData={() => {
        if (el.current && ready.current === false && !open) el.current.pause();
      }}
    />
  );
}
