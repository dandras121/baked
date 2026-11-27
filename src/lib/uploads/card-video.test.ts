import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  cardVideoProblem,
  CardVideoError,
  processCardVideo,
  sizeOf,
} from "./card-video";
import { CARD_VIDEO_WORDS } from "./video-rules";

const run = promisify(execFile);
const ffmpeg = (ffmpegPath as unknown as string) ?? "ffmpeg";
const WRONG =
  "The card video must be a square video of about 5 seconds, at least 1440 × 1440.";

/** A synthetic 30 fps clip with a tone (the card video keeps no sound). */
async function clip(seconds: number, w: number, h: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "bbl-card-"));
  try {
    const out = join(dir, "clip.mp4");
    await run(ffmpeg, [
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=${w}x${h}:rate=30:duration=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:duration=${seconds}`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      "-y",
      out,
    ]);
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** ffmpeg's report and its per-frame info (showinfo) for a web copy. */
async function inspect(video: Buffer) {
  const dir = await mkdtemp(join(tmpdir(), "bbl-card-"));
  try {
    const f = join(dir, "v.mp4");
    await writeFile(f, video);
    const { stderr } = await run(
      ffmpeg,
      ["-hide_banner", "-i", f, "-vf", "showinfo", "-f", "null", "-"],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    return stderr;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("card video (§9.13, claude/torta-video-szabalyrendszer.md)", () => {
  it("uses the one sentence of §9.13 for every wrong file", () => {
    expect(CARD_VIDEO_WORDS.wrong).toBe(WRONG);
    const sq = (s: number) => ({ w: s, h: s });
    expect(cardVideoProblem(5, sq(2160))).toBeNull();
    expect(cardVideoProblem(4.9, sq(1440))).toBeNull();
    expect(cardVideoProblem(5.1, sq(1440))).toBeNull();
    expect(cardVideoProblem(4.85, sq(2160))).toBe(WRONG);
    expect(cardVideoProblem(5.2, sq(2160))).toBe(WRONG);
    expect(cardVideoProblem(5, sq(1080))).toBe(WRONG);
    expect(cardVideoProblem(5, { w: 2160, h: 2158 })).toBe(WRONG);
    expect(cardVideoProblem(null, null)).toBe(WRONG);
  });

  it("reads the video's size from ffmpeg's report", () => {
    expect(
      sizeOf(
        "  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 2160x2160 [SAR 1:1 DAR 1:1], 30 fps",
      ),
    ).toEqual({ w: 2160, h: 2160 });
    expect(sizeOf("Stream #0:0: Audio: aac, 44100 Hz")).toBeNull();
  });

  it("makes 1080 and 1440 copies without sound, key frame on frame 0, no B-frames, and a 1440 still", async () => {
    const r = await processCardVideo(await clip(5, 2160, 2160));
    for (const [v, side] of [
      [r.v1080, 1080],
      [r.v1440, 1440],
    ] as const) {
      const report = await inspect(v);
      expect(sizeOf(report)).toEqual({ w: side, h: side });
      expect(report).not.toMatch(/Stream #\d+:\d+[^\n]*: Audio:/);
      const frames = report.split("\n").filter((l) => /\bn:\s*\d+/.test(l));
      expect(frames).toHaveLength(150);
      expect(frames[0]).toMatch(/iskey:1/);
      expect(frames[0]).toMatch(/type:I/);
      expect(frames.some((l) => /type:B/.test(l))).toBe(false);
    }
    const still = await sharp(r.still).metadata();
    expect([still.format, still.width, still.height]).toEqual([
      "webp",
      1440,
      1440,
    ]);
  }, 120_000);

  it("refuses a wrong file with the exact words and makes nothing", async () => {
    for (const [s, w, h] of [
      [5, 1080, 1080],
      [5, 1920, 1440],
      [3, 1440, 1440],
    ] as const) {
      const e = await processCardVideo(await clip(s, w, h)).catch((x) => x);
      expect(e).toBeInstanceOf(CardVideoError);
      expect((e as CardVideoError).words).toBe(WRONG);
    }
    const e = await processCardVideo(Buffer.from("not a video")).catch(
      (x) => x,
    );
    expect((e as CardVideoError).words).toBe(WRONG);
  }, 120_000);
});
