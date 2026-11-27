"use client";

import { useEffect, useRef, useState } from "react";
import {
  cardVideoChangedAction,
  removeCardVideoAction,
} from "@/app/admin/(shell)/cakes/actions";
import form from "@/components/admin/add-order/add-order.module.css";
import { Button } from "@/components/ui/button";
import { CARD_CROPS, type Crop } from "@/lib/card-crop";
import type { CardVideo } from "@/lib/home-content";
import type { BlobMode } from "@/lib/storage";
import { CARD_VIDEO, CARD_VIDEO_WORDS } from "@/lib/uploads/video-rules";
import styles from "./card-video.module.css";
import { upload, videoMeta } from "./upload";

const SIGNED_OUT = "You are signed out — sign in again. Nothing was changed.";
const AGAIN = "Nothing was changed — please try again.";

/** The square video placed so that `crop` fills the box, bottom-anchored like the card (ANIM-11). */
function Preview({
  crop,
  caption,
  children,
}: {
  crop: Crop;
  caption: string;
  children?: React.ReactNode;
}) {
  const w = crop.x1 - crop.x0;
  const aspect = w / (crop.y1 - crop.y0);
  return (
    <figure className={styles.crop} style={{ flexGrow: aspect }}>
      <div className={styles.box} style={{ aspectRatio: aspect }}>
        {children && (
          <div
            className={styles.square}
            style={{
              width: `${100 / w}%`,
              left: `${(-crop.x0 / w) * 100}%`,
              top: `${((-crop.y0 * aspect) / w) * 100}%`,
            }}
          >
            {children}
          </div>
        )}
      </div>
      <figcaption className={form.hint}>{caption}</figcaption>
    </figure>
  );
}

/**
 * CARD VIDEO (§9.13, Decided 2026-10-22; 1801:13221): one per cake, only on the cake card. The closed and open card
 * crops side by side (the desktop card's); Add photo / video, or Replace and Remove. Every change saves at once.
 */
export function CardVideoCard({
  cakeId,
  initial,
  direct,
}: {
  cakeId: number | null;
  initial: CardVideo | null;
  direct: BlobMode;
}) {
  const [video, setVideo] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [still, setStill] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // Reduced motion: the open crop shows the still instead of the turning video.
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(q.matches);
    set();
    q.addEventListener("change", set);
    return () => q.removeEventListener("change", set);
  }, []);

  const add = async (file: File) => {
    if (cakeId === null) return;
    setLine(null);
    if (file.size > CARD_VIDEO.maxBytes)
      return setLine(CARD_VIDEO_WORDS.size(file.size));
    const meta = await videoMeta(file);
    // The browser cannot read every video (HEVC on some computers): then only the server checks it.
    if (
      meta &&
      meta.w > 0 &&
      (meta.w !== meta.h ||
        meta.w < CARD_VIDEO.minSide ||
        meta.seconds < CARD_VIDEO.minSeconds ||
        meta.seconds > CARD_VIDEO.maxSeconds)
    )
      return setLine(CARD_VIDEO_WORDS.wrong);
    setBusy("Preparing the card video…");
    const r = await upload(file, cakeId, direct, "card");
    if (r.card) {
      setVideo(r.card);
      const s = await cardVideoChangedAction(cakeId);
      if (s.kind === "signed-out") setLine(SIGNED_OUT);
    } else setLine(r.words ?? AGAIN);
    setBusy(null);
  };

  const remove = async () => {
    if (cakeId === null) return;
    setLine(null);
    setBusy("Removing…");
    const r = await removeCardVideoAction(cakeId);
    if (r.kind === "saved") setVideo(null);
    else setLine(r.kind === "signed-out" ? SIGNED_OUT : AGAIN);
    setBusy(null);
  };

  return (
    <section className={form.card} aria-labelledby="card-video-h">
      <h2 id="card-video-h" className={form.section}>
        Card video
      </h2>
      <p className={form.hint}>
        Only on the cake card: its first frame, still, when the card is closed;
        turning when it is open. Never on the Customise a design page.
      </p>
      {cakeId === null ? (
        <p className={form.hint}>Add the card video once the cake is saved.</p>
      ) : (
        <>
          <div className={styles.previews}>
            <Preview
              crop={CARD_CROPS.desktop.closed}
              caption="Closed crop · 8:5"
            >
              {video && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.still} alt="" />
              )}
            </Preview>
            <Preview crop={CARD_CROPS.desktop.open} caption="Open crop · 1.2:1">
              {video &&
                (still ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.still} alt="" />
                ) : (
                  <video
                    key={video.v1080}
                    src={video.v1080}
                    poster={video.still}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-hidden
                  />
                ))}
            </Preview>
          </div>
          <p className={form.hint}>
            Square MP4 or MOV, at least 1440 × 1440, 4.9–5.1 seconds, made to
            the card-video rules.
          </p>
          <input
            ref={picker}
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void add(f);
            }}
          />
          <div className={styles.buttons}>
            {video ? (
              <>
                <Button
                  disabled={!!busy}
                  onClick={() => picker.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => void remove()}
                >
                  Remove
                </Button>
              </>
            ) : (
              <Button disabled={!!busy} onClick={() => picker.current?.click()}>
                Add photo / video
              </Button>
            )}
          </div>
          {busy && (
            <p className={form.hint} role="status">
              {busy}
            </p>
          )}
          {line && (
            <p className={styles.error} role="alert">
              {line}
            </p>
          )}
        </>
      )}
    </section>
  );
}
