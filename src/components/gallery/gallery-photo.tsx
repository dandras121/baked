"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./gallery.module.css";

/**
 * A gallery photo on its lilac base (§4.8). ANIM-23: once the image is decoded it fades in over the base in
 * 240 ms; an image already in the browser's cache shows at once. Lazy-loaded.
 */
export function GalleryPhoto({ src, alt }: { src: string; alt: string }) {
  const img = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"waiting" | "shown" | "instant">(
    "waiting",
  );
  useEffect(() => {
    const el = img.current;
    if (!el) return;
    // Cached: already complete when the page comes alive → no fade.
    if (el.complete && el.naturalWidth > 0) {
      setState("instant");
      return;
    }
    let live = true;
    const show = () =>
      el
        .decode()
        .catch(() => undefined)
        .then(() => live && setState("shown"));
    el.addEventListener("load", show, { once: true });
    return () => {
      live = false;
      el.removeEventListener("load", show);
    };
  }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={styles.photo}
      data-photo={state}
    />
  );
}
