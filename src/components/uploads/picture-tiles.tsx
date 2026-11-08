"use client";

import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/ui/notice";
import {
  PICTURE_COPY,
  PICTURES,
  pictureKind,
  sortPick,
  type PickNotice,
} from "@/lib/uploads/rules";
import styles from "./picture-tiles.module.css";

type Tile = {
  key: string;
  name: string;
  file: File;
  status: "uploading" | "done" | "failed";
  progress: number;
  id?: string;
  thumb?: string;
};

export type PicturesState = { ids: string[]; pending: number };

type Answer = { id: string; name: string; thumb: string } | { error: string };

/** Through the site: progress from the request itself. */
function sendThroughSite(
  file: File,
  fields: Record<string, string>,
  onProgress: (p: number) => void,
): Promise<Answer> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.set("file", file);
    for (const [k, v] of Object.entries(fields)) body.set(k, v);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/pictures");
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        // Not our answer (e.g. the host's own request limit): the upload simply did not go through.
        resolve({ error: "failed" });
      }
    };
    xhr.onerror = () => resolve({ error: "failed" });
    xhr.send(body);
  });
}

/** Straight to the private Blob store, then the server makes its copy. */
async function sendToStore(
  file: File,
  fields: { formKey: string; purpose: string },
  onProgress: (p: number) => void,
): Promise<Answer> {
  try {
    const { upload } = await import("@vercel/blob/client");
    const kind = pictureKind(file.name, file.type);
    const type = kind === "heic" ? "image/heic" : `image/${kind}`;
    const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "picture";
    const stored = await upload(`incoming/${fields.formKey}/${safe}`, file, {
      access: "private",
      handleUploadUrl: "/api/pictures/blob",
      clientPayload: JSON.stringify(fields),
      contentType: type,
      multipart: file.size > 5 * 1024 * 1024,
      onUploadProgress: (p) => onProgress(p.percentage / 100),
    });
    const r = await fetch("/api/pictures/blob", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fields,
        finish: stored.pathname,
        name: file.name,
      }),
    });
    return await r.json();
  } catch {
    return { error: "failed" };
  }
}

/**
 * Add up to three pictures (§7.1; tiles 660:4230 / phone 847:8173, J 975:9114; also on Complaints, §7.5). Each empty
 * tile is a “+” that opens the picker; a picked picture uploads at once with a progress ring, then shows its
 * thumbnail and ×; a failed one offers Try again. The add tiles are gone at three.
 */
export function PictureTiles({
  purpose,
  formKey,
  direct,
  onChange,
}: {
  purpose: "enquiry" | "complaint";
  /** The form's key (made on first use): the server binds each picture to it. */
  formKey: () => string;
  /** A Blob store is connected: upload straight to it. */
  direct: boolean;
  onChange: (state: PicturesState) => void;
}) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [notice, setNotice] = useState<PickNotice | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef<Tile[]>([]);
  // An upload ends long after the render that started it: tell the form through its latest callback.
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  });

  function commit(next: Tile[]) {
    latest.current = next;
    setTiles(next);
    report.current({
      ids: next.filter((t) => t.status === "done").map((t) => t.id!),
      pending: next.filter((t) => t.status === "uploading").length,
    });
  }

  function patch(key: string, change: Partial<Tile>) {
    commit(
      latest.current.map((t) => (t.key === key ? { ...t, ...change } : t)),
    );
  }

  async function start(tile: Tile) {
    const fields = { formKey: formKey(), purpose };
    const progress = (p: number) => patch(tile.key, { progress: p });
    const answer = await (direct
      ? sendToStore(tile.file, fields, progress)
      : sendThroughSite(tile.file, fields, progress));
    if ("id" in answer) {
      patch(tile.key, { status: "done", id: answer.id, thumb: answer.thumb });
      return;
    }
    if (answer.error === "failed") {
      patch(tile.key, { status: "failed" });
      setNotice({ title: PICTURE_COPY.failed(tile.name) });
      return;
    }
    commit(latest.current.filter((t) => t.key !== tile.key));
    setNotice(
      answer.error === "size"
        ? {
            title: PICTURE_COPY.tooBigTitle,
            text: PICTURE_COPY.tooBig(tile.name, tile.file.size),
          }
        : answer.error === "type"
          ? { title: PICTURE_COPY.wrongType(tile.name) }
          : { title: PICTURE_COPY.keptThree },
    );
  }

  function pick(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const { take, notice: said } = sortPick(files, latest.current.length);
    setNotice(said);
    const added = take.map((i) => ({
      key: crypto.randomUUID(),
      name: files[i].name,
      file: files[i],
      status: "uploading" as const,
      progress: 0,
    }));
    commit([...latest.current, ...added]);
    added.forEach(start);
  }

  function remove(tile: Tile) {
    commit(latest.current.filter((t) => t.key !== tile.key));
    setNotice(null);
    if (tile.id)
      fetch(`/api/pictures/${tile.id}?form=${formKey()}`, { method: "DELETE" });
  }

  function retry(tile: Tile) {
    setNotice(null);
    const again = { ...tile, status: "uploading" as const, progress: 0 };
    patch(tile.key, again);
    start(again);
  }

  const empty = PICTURES.max - tiles.length;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        type="file"
        accept={PICTURES.accept}
        multiple
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      <ul className={styles.tiles}>
        {tiles.map((t) => (
          <li key={t.key} className={styles.tile}>
            {t.status === "done" && t.thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.thumb} alt={t.name} className={styles.thumb} />
            )}
            {t.status === "uploading" && (
              <span className={styles.ring} role="status">
                <svg viewBox="0 0 36 36" aria-hidden>
                  <circle className={styles.track} cx="18" cy="18" r="15" />
                  <circle
                    className={styles.arc}
                    cx="18"
                    cy="18"
                    r="15"
                    pathLength={100}
                    strokeDasharray={`${Math.round(t.progress * 100)} 100`}
                  />
                </svg>
                <span className={styles.hidden}>
                  {PICTURE_COPY.uploading(t.name)}
                </span>
              </span>
            )}
            {t.status === "failed" && (
              <button
                type="button"
                className={styles.retry}
                data-pressable
                onClick={() => retry(t)}
              >
                <span className={styles.name}>{t.name}</span>
                {PICTURE_COPY.retry}
              </button>
            )}
            {t.status !== "uploading" && (
              <button
                type="button"
                className={styles.remove}
                data-pressable
                aria-label={PICTURE_COPY.remove(t.name)}
                onClick={() => remove(t)}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`add-${i}`} className={styles.tile}>
            <button
              type="button"
              className={styles.add}
              data-pressable
              aria-label={PICTURE_COPY.add}
              onClick={() => input.current?.click()}
            >
              +
            </button>
          </li>
        ))}
      </ul>
      {notice && (
        <div className={styles.notice}>
          <Notice tone="error" title={notice.title} urgent>
            {notice.text && <p>{notice.text}</p>}
          </Notice>
        </div>
      )}
    </div>
  );
}
