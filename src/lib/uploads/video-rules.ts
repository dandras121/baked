// The cake-video limits and words (§9.13, Proposal): checked in the browser before uploading and again on the server.
import { megabytes } from "./rules";

export const CAKE_VIDEO = {
  maxBytes: 500 * 1024 * 1024,
  maxSeconds: 60,
  width: 1080,
  height: 1640,
  max: 2,
} as const;

/** The words next to Add a video (§9.13; nothing is added). */
export const VIDEO_WORDS = {
  size: (bytes: number) =>
    `That video is ${megabytes(bytes)} — the limit is 500 MB. Nothing was added.`,
  long: "That video is longer than a minute. Nothing was added.",
  type: "That file is not an MP4 or MOV video. Nothing was added.",
  failed: "That video could not be prepared — nothing was added.",
  full: "Up to 8 photos and 2 videos — remove one first. Nothing was added.",
};

/** The browser's guess of a video's type when the file has none (a MOV from a phone, say). */
export const videoType = (name: string, type: string) =>
  type ||
  (name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4");

/** The card video (§9.13, Decided 2026-10-22; claude/torta-video-szabalyrendszer.md). The size limit is a Proposal. */
export const CARD_VIDEO = {
  maxBytes: 500 * 1024 * 1024,
  minSide: 1440,
  minSeconds: 4.9,
  maxSeconds: 5.1,
} as const;

export const CARD_VIDEO_WORDS = {
  wrong:
    "The card video must be a square video of about 5 seconds, at least 1440 × 1440.",
  size: (bytes: number) =>
    `That video is ${megabytes(bytes)} — the limit is 500 MB. Nothing was changed.`,
  failed: "That card video could not be prepared — nothing was changed.",
};
