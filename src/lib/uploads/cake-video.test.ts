import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  CAKE_VIDEO,
  CakeVideoError,
  durationOf,
  processCakeVideo,
  VIDEO_WORDS,
} from "./cake-video";

const run = promisify(execFile);
const ffmpeg = (ffmpegPath as unknown as string) ?? "ffmpeg";

/** A synthetic clip from ffmpeg's test pattern, with a tone. */
async function clip(seconds: number, w: number, h: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "bbl-clip-"));
  try {
    const out = join(dir, "clip.mp4");
    await run(ffmpeg, [
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=${w}x${h}:rate=10:duration=${seconds}`,
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

/** What ffmpeg says about a file. */
async function report(data: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbl-probe-"));
  try {
    const f = join(dir, "x.mp4");
    await writeFile(f, data);
    const r = await run(ffmpeg, ["-hide_banner", "-i", f]).catch(
      (e: { stderr: string }) => e,
    );
    return r.stderr;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("a cake video (§9.13)", () => {
  it("reads the length from ffmpeg's report, and only for a video", () => {
    expect(
      durationOf(
        "Duration: 00:01:02.50, start: 0\n Stream #0:0[0x1](und): Video: h264",
      ),
    ).toBe(62.5);
    expect(durationOf("Duration: 00:00:05.00\n Stream #0:0: Audio: aac")).toBe(
      null,
    );
    expect(durationOf("Invalid data found")).toBe(null);
  });

  it("converts to H.264 + AAC within 1080 × 1640, even sizes, and takes the first frame as the cover", async () => {
    const r = await processCakeVideo(await clip(2, 1440, 2560));
    expect(r.seconds).toBeCloseTo(2, 0);
    const info = await report(r.video);
    expect(info).toMatch(/Video: h264/);
    expect(info).toMatch(/Audio: aac/);
    const [, w, h] = /, (\d+)x(\d+)/.exec(info)!.map(Number);
    expect(w).toBeLessThanOrEqual(CAKE_VIDEO.width);
    expect(h).toBeLessThanOrEqual(CAKE_VIDEO.height);
    expect((w % 2) + (h % 2)).toBe(0);
    const cover = await sharp(r.cover).metadata();
    expect(cover.format).toBe("jpeg");
    expect([cover.width, cover.height]).toEqual([w, h]);
  }, 60_000);

  it("keeps a small video at its own size", async () => {
    const r = await processCakeVideo(await clip(1, 640, 480));
    expect(await report(r.video)).toMatch(/640x480/);
  }, 60_000);

  it("refuses one longer than a minute, and a file that is not a video, with the words", async () => {
    await expect(processCakeVideo(await clip(61, 64, 64))).rejects.toEqual(
      new CakeVideoError(VIDEO_WORDS.long),
    );
    await expect(
      processCakeVideo(Buffer.from("not a video at all")),
    ).rejects.toBeInstanceOf(CakeVideoError);
  }, 60_000);

  it("names the limits in Linda's words", () => {
    expect(VIDEO_WORDS.size(620 * 1024 * 1024)).toBe(
      "That video is 620 MB — the limit is 500 MB. Nothing was added.",
    );
    expect(VIDEO_WORDS.long).toBe(
      "That video is longer than a minute. Nothing was added.",
    );
    expect(VIDEO_WORDS.failed).toBe(
      "That video could not be prepared — nothing was added.",
    );
  });
});
