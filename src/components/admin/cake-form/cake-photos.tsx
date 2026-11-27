"use client";

import { useEffect, useRef, useState } from "react";
import {
  makeMainPhotoAction,
  removeMediaAction,
  reorderMediaAction,
  updatePhotoAction,
  videoStatusAction,
} from "@/app/admin/(shell)/cakes/actions";
import form from "@/components/admin/add-order/add-order.module.css";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import type { AdminMedia } from "@/db/cake-media-repo";
import { CAKE_LIMITS } from "@/lib/cakes";
import type { BlobMode } from "@/lib/storage";
import { CAKE_VIDEO, VIDEO_WORDS } from "@/lib/uploads/video-rules";
import styles from "./photos.module.css";
import { upload, videoLength } from "./upload";

const position = (m: AdminMedia) =>
  `${Math.round(m.focalX * 100)}% ${Math.round(m.focalY * 100)}%`;

/**
 * THE PHOTOS (§9.13; 940:8507, phone 950:8886): the main photo in the fixed 4 : 5 crop — drag (or the arrow keys) sets
 * its focal point —, Replace the main photo, Describe this photo, the other tiles (× Remove, Make the main photo, ⠿
 * order), Add photos. Every change saves at once. A new cake gets its photos once it is saved.
 */
export function CakePhotos({
  cakeId,
  cakeName,
  initial,
  direct,
}: {
  cakeId: number | null;
  cakeName: string;
  initial: AdminMedia[];
  direct: BlobMode;
}) {
  const [media, setMedia] = useState(initial);
  const [selected, setSelected] = useState<number | null>(
    initial.find((m) => m.kind === "photo")?.id ?? null,
  );
  const [line, setLine] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AdminMedia | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const replacer = useRef<HTMLInputElement>(null);
  const videoPicker = useRef<HTMLInputElement>(null);
  const coverPicker = useRef<HTMLInputElement>(null);
  const coverFor = useRef<number | null>(null);
  const photos = media.filter((m) => m.kind === "photo");
  const main = photos[0] ?? null;
  const rest = media.filter((m) => m.id !== main?.id);
  const chosen = media.find((m) => m.id === selected) ?? main;
  const full = photos.length >= CAKE_LIMITS.photos;
  const videos = media.filter((m) => m.kind === "video");
  const videosFull = videos.length >= CAKE_VIDEO.max;
  const waiting = media
    .filter((m) => m.kind === "video" && m.status !== "ready")
    .map((m) => m.id)
    .join(",");

  // While a video is preparing, ask every 4 seconds; a ready one gets its cover, a failed one leaves with its words.
  useEffect(() => {
    if (!waiting || cakeId === null) return;
    const ids = waiting.split(",").map(Number);
    let stop = false;
    const ask = async () => {
      const r = await videoStatusAction(cakeId, ids);
      if (stop || !r) return;
      const failed = r.filter((v) => v.state === "failed");
      setMedia((all) =>
        all
          .filter((m) => !failed.some((v) => v.id === m.id))
          .map((m) => {
            const v = r.find((x) => x.id === m.id);
            return v?.state === "ready" ? v.media : m;
          }),
      );
      if (failed.length)
        setLine(
          failed.map((v) => (v.state === "failed" ? v.words : "")).join(" "),
        );
    };
    const first = setTimeout(
      ask,
      media.some((m) => m.status === "failed") ? 0 : 4000,
    );
    const every = setInterval(ask, 4000);
    return () => {
      stop = true;
      clearTimeout(first);
      clearInterval(every);
    };
    // Only the list of waiting videos restarts the question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, cakeId]);

  const said = (r: { kind: string }) => {
    if (r.kind === "saved") return true;
    setLine(
      r.kind === "last-photo"
        ? "Hide the cake first — a cake on the site needs a photo."
        : r.kind === "signed-out"
          ? "You are signed out — sign in again. Nothing was changed."
          : "Nothing was changed — please try again.",
    );
    return false;
  };

  if (cakeId === null)
    return (
      <>
        <span className={styles.mainSlot} aria-hidden />
        <p className={form.hint}>
          Add the photos once the cake is saved — it stays hidden until it has
          one.
        </p>
      </>
    );

  const addFiles = async (files: File[], replaceMain = false) => {
    setLine(null);
    const room = CAKE_LIMITS.photos - photos.length;
    const take = replaceMain
      ? files.slice(0, 1)
      : files.slice(0, Math.max(room, 0));
    const added: AdminMedia[] = [];
    const words: string[] = [];
    for (const [i, f] of take.entries()) {
      setBusy(
        take.length > 1
          ? `Uploading ${i + 1} of ${take.length}…`
          : "Uploading…",
      );
      const r = await upload(f, cakeId, direct);
      if (r.media) added.push(r.media);
      else words.push(r.words ?? "Nothing was added — please try again.");
    }
    if (files.length > take.length)
      words.push("Up to 8 photos and 2 videos — the rest were not added.");
    let next = [...media, ...added];
    if (replaceMain && added[0] && main) {
      await makeMainPhotoAction(cakeId, added[0].id);
      const removed = await removeMediaAction(cakeId, main.id);
      next = [
        added[0],
        ...next.filter(
          (m) =>
            m.id !== added[0].id &&
            (removed.kind !== "saved" || m.id !== main.id),
        ),
      ];
      setSelected(added[0].id);
    } else if (!main && added[0]) setSelected(added[0].id);
    setMedia(next);
    setBusy(null);
    // No refresh here: it would draw the form again and lose these words; the tiles are already up to date.
    if (words.length) setLine(words.join(" "));
  };

  const addVideo = async (file: File) => {
    setLine(null);
    if (file.size > CAKE_VIDEO.maxBytes)
      return setLine(VIDEO_WORDS.size(file.size));
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["mp4", "mov", "m4v"].includes(ext) && !file.type.startsWith("video/"))
      return setLine(VIDEO_WORDS.type);
    setBusy("Uploading the video…");
    const seconds = await videoLength(file);
    if (seconds !== null && seconds > CAKE_VIDEO.maxSeconds + 0.5) {
      setBusy(null);
      return setLine(VIDEO_WORDS.long);
    }
    const r = await upload(file, cakeId, direct, "video");
    setBusy(null);
    if (r.media) setMedia((all) => [...all, r.media!]);
    else setLine(r.words ?? VIDEO_WORDS.failed);
  };

  const changeCover = async (file: File, id: number) => {
    setLine(null);
    setBusy("Uploading the cover…");
    const r = await upload(file, cakeId, direct, "cover", id);
    setBusy(null);
    if (r.poster)
      setMedia((all) =>
        all.map((m) => (m.id === id ? { ...m, poster: r.poster! } : m)),
      );
    else setLine(r.words ?? "Nothing was changed — please try again.");
  };

  const saveOrder = async (next: AdminMedia[]) => {
    const before = media;
    setMedia(next);
    const r = await reorderMediaAction(
      cakeId,
      next.map((m) => m.id),
    );
    if (!said(r)) setMedia(before);
  };

  // The focal point: drag on the main photo (or pinch — the first finger counts), arrow keys move it 5 %.
  const setFocal = (x: number, y: number, save: boolean) => {
    if (!main) return;
    const fx = Math.min(1, Math.max(0, x));
    const fy = Math.min(1, Math.max(0, y));
    setMedia((all) =>
      all.map((m) => (m.id === main.id ? { ...m, focalX: fx, focalY: fy } : m)),
    );
    if (save)
      void updatePhotoAction(cakeId, main.id, { focalX: fx, focalY: fy }).then(
        said,
      );
  };
  const dragFocal = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!main) return;
    const box = e.currentTarget.getBoundingClientRect();
    const at = (ev: { clientX: number; clientY: number }) =>
      [
        (ev.clientX - box.left) / box.width,
        (ev.clientY - box.top) / box.height,
      ] as const;
    e.currentTarget.setPointerCapture(e.pointerId);
    let last = at(e);
    setFocal(...last, false);
    const el = e.currentTarget;
    const move = (ev: PointerEvent) => {
      last = at(ev);
      setFocal(...last, false);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setFocal(...last, true);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  // The tiles' order: drag ⠿ onto another tile, or the arrow keys on a focused ⠿.
  const moveTile = (id: number, by: number) => {
    const i = media.findIndex((m) => m.id === id);
    const j = i + by;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    const [x] = next.splice(i, 1);
    next.splice(j, 0, x);
    void saveOrder(next);
    requestAnimationFrame(() =>
      document.getElementById(`tile-move-${id}`)?.focus(),
    );
  };
  const dragTile = (e: React.PointerEvent, id: number) => {
    e.preventDefault();
    let target = id;
    const move = (ev: PointerEvent) => {
      const el = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest("[data-tile]") as HTMLElement | null;
      if (el) target = Number(el.dataset.tile);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (target === id) return;
      const next = media.filter((m) => m.id !== id);
      next.splice(
        next.findIndex((m) => m.id === target) +
          (media.findIndex((m) => m.id === id) <
          media.findIndex((m) => m.id === target)
            ? 1
            : 0),
        0,
        media.find((m) => m.id === id)!,
      );
      void saveOrder(next);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <>
      {main ? (
        <div
          className={styles.main}
          tabIndex={0}
          role="group"
          aria-label={`The main photo — drag or use the arrow keys to set what the crop keeps (now ${position(main)})`}
          onPointerDown={dragFocal}
          onKeyDown={(e) => {
            const step = 0.05;
            const d = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            }[e.key];
            if (!d) return;
            e.preventDefault();
            setFocal(main.focalX + d[0], main.focalY + d[1], true);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main.src}
            alt={main.alt || cakeName}
            style={{ objectPosition: position(main) }}
            draggable={false}
          />
          <span
            className={styles.focal}
            style={{
              left: `${main.focalX * 100}%`,
              top: `${main.focalY * 100}%`,
            }}
            aria-hidden
          />
        </div>
      ) : (
        <span className={styles.mainSlot} aria-hidden />
      )}
      <p className={form.hint}>
        Pinch or drag to reposition. The 4 : 5 crop is fixed — it is what the
        card on the site uses.
      </p>
      <input
        ref={replacer}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void addFiles([f], !!main);
        }}
      />
      <Button
        variant="outline"
        className={styles.wideButton}
        disabled={!!busy}
        onClick={() => replacer.current?.click()}
      >
        {main ? "Replace the main photo" : "Add the main photo"}
      </Button>

      {chosen?.kind === "photo" && (
        <div className={form.field}>
          <label htmlFor="photo-alt" className={form.label}>
            Describe this photo (alt text)
          </label>
          <input
            id="photo-alt"
            key={chosen.id}
            className={form.input}
            defaultValue={chosen.alt}
            maxLength={150}
            onBlur={(e) => {
              const alt = e.target.value;
              if (alt === chosen.alt) return;
              setMedia((all) =>
                all.map((m) => (m.id === chosen.id ? { ...m, alt } : m)),
              );
              void updatePhotoAction(cakeId, chosen.id, { alt }).then(said);
            }}
          />
          <p className={form.hint}>
            For the photo you have selected — tap a tile to describe it. Read
            aloud by screen readers and shown when email images are blocked.
            Empty = the cake’s name.
          </p>
        </div>
      )}

      <h3 className={form.section}>More photos and videos</h3>
      {rest.length > 0 && (
        <ul className={styles.tiles}>
          {rest.map((m) => (
            <li key={m.id} className={styles.tile} data-tile={m.id}>
              <div className={styles.thumbWrap}>
                <button
                  type="button"
                  className={`${styles.thumb} ${selected === m.id ? styles.selected : ""}`}
                  aria-pressed={selected === m.id}
                  aria-label={`Select ${m.alt || (m.kind === "photo" ? "this photo" : "this video")} to describe it`}
                  onClick={() => setSelected(m.id)}
                >
                  {!(m.kind === "video" && m.status !== "ready") && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.kind === "photo" ? m.src : (m.poster ?? "")}
                        alt=""
                        style={{ objectPosition: position(m) }}
                      />
                      {m.kind === "video" && (
                        <span className={styles.play} aria-hidden />
                      )}
                    </>
                  )}
                </button>
                <button
                  id={`tile-move-${m.id}`}
                  type="button"
                  className={styles.tileMove}
                  aria-label={`Move ${m.alt || "this tile"} — arrow keys`}
                  onPointerDown={(e) => dragTile(e, m.id)}
                  onKeyDown={(e) => {
                    const by = {
                      ArrowLeft: -1,
                      ArrowUp: -1,
                      ArrowRight: 1,
                      ArrowDown: 1,
                    }[e.key];
                    if (by) {
                      e.preventDefault();
                      moveTile(m.id, by);
                    }
                  }}
                >
                  ≡
                </button>
                <button
                  type="button"
                  className={styles.tileRemove}
                  aria-label={`Remove ${m.alt || (m.kind === "photo" ? "this photo" : "this video")}`}
                  onClick={() => setRemoving(m)}
                >
                  ×
                </button>
              </div>
              {m.kind === "photo" && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={async () => {
                    const r = await makeMainPhotoAction(cakeId, m.id);
                    if (said(r))
                      setMedia([m, ...media.filter((x) => x.id !== m.id)]);
                  }}
                >
                  Make the main photo
                </button>
              )}
              {m.kind === "video" && m.status !== "ready" && (
                <span className={styles.preparing} role="status">
                  Preparing the video…
                </span>
              )}
              {m.kind === "video" && m.status === "ready" && (
                <button
                  type="button"
                  className={styles.textButton}
                  disabled={!!busy}
                  onClick={() => {
                    coverFor.current = m.id;
                    coverPicker.current?.click();
                  }}
                >
                  Change the cover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <input
        ref={picker}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) void addFiles(files);
        }}
      />
      <input
        ref={videoPicker}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void addVideo(f);
        }}
      />
      <input
        ref={coverPicker}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f && coverFor.current) void changeCover(f, coverFor.current);
        }}
      />
      <div className={styles.addRow}>
        <Button
          variant="outline"
          disabled={full || !!busy}
          onClick={() => picker.current?.click()}
        >
          Add photos
        </Button>
        <Button
          variant="outline"
          disabled={videosFull || !!busy}
          onClick={() => videoPicker.current?.click()}
        >
          Add a video
        </Button>
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
      <p className={form.hint}>
        {full && videosFull
          ? "Up to 8 photos and 2 videos"
          : "Up to 8 photos and 2 videos. The first photo is the card photo — shown in the catalogue. Videos autoplay muted when visible; tapping unmutes. Each video gets a cover from its first frame; Change the cover replaces it."}
      </p>
      <p className={form.hint}>
        Photos: JPG, PNG or HEIC, up to 15 MB, at least 1600 pixels on the long
        side. Videos: MP4 or MOV, up to 500 MB and a minute.
      </p>

      <Overlay
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this photo?"
        description="Orders already placed keep their copy."
        classNames={{ body: styles.removeBody }}
      >
        <Button
          onClick={async () => {
            if (!removing) return;
            const r = await removeMediaAction(cakeId, removing.id);
            if (said(r)) {
              setMedia((all) => all.filter((m) => m.id !== removing.id));
              if (selected === removing.id) setSelected(main?.id ?? null);
            }
            setRemoving(null);
          }}
        >
          Remove it
        </Button>
        <Button variant="outline" onClick={() => setRemoving(null)}>
          Keep it
        </Button>
      </Overlay>
    </>
  );
}
