// A cake video (§9.13, Decided 2026-10-17 + Proposal): MP4 or MOV (H.264 or HEVC), up to 500 MB and 60 s. The server
// converts it with ffmpeg to an H.264 + AAC MP4 of at most 1080 × 1640 that starts at once (faststart), and takes the
// first frame as its cover.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export { CAKE_VIDEO, VIDEO_WORDS } from "./video-rules";
import { CAKE_VIDEO, VIDEO_WORDS } from "./video-rules";

export class CakeVideoError extends Error {
  constructor(readonly words: string) {
    super(words);
  }
}

/** The ffmpeg binary: FFMPEG_PATH, else the one shipped with the app (ffmpeg-static), else the system's. */
export async function ffmpeg(): Promise<string> {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const shipped = (await import("ffmpeg-static")).default as unknown as
      string | null;
    if (shipped) return shipped;
  } catch {
    // Not installed: fall back to the system's ffmpeg.
  }
  return "ffmpeg";
}

/** Seconds, from ffmpeg's own report (“Duration: 00:00:05.00”); null when it is not a video ffmpeg can read. */
export function durationOf(report: string): number | null {
  const m = /Duration: (\d+):(\d\d):(\d\d(?:\.\d+)?)/.exec(report);
  if (!m || !/Stream #\d+:\d+[^:]*: Video:/.test(report)) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** The site's copy and its cover. Throws CakeVideoError with the words when it cannot be used. */
export async function processCakeVideo(
  input: Buffer,
): Promise<{ video: Buffer; cover: Buffer; seconds: number }> {
  if (input.length > CAKE_VIDEO.maxBytes)
    throw new CakeVideoError(VIDEO_WORDS.size(input.length));
  const bin = await ffmpeg();
  const dir = await mkdtemp(join(tmpdir(), "cake-video-"));
  try {
    const source = join(dir, "source");
    await writeFile(source, input);
    // ffmpeg -i with no output exits 1 but writes the stream report to stderr.
    const report = await run(bin, ["-hide_banner", "-i", source]).then(
      (r) => r.stderr,
      (e: { stderr?: string }) => e.stderr ?? "",
    );
    const seconds = durationOf(report);
    if (seconds === null) throw new CakeVideoError(VIDEO_WORDS.type);
    if (seconds > CAKE_VIDEO.maxSeconds + 0.5)
      throw new CakeVideoError(VIDEO_WORDS.long);
    const fit = `scale='min(${CAKE_VIDEO.width},iw)':'min(${CAKE_VIDEO.height},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;
    const out = join(dir, "site.mp4");
    const cover = join(dir, "cover.jpg");
    try {
      await run(
        bin,
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          source,
          "-map",
          "0:v:0",
          "-map",
          "0:a:0?",
          "-vf",
          fit,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          out,
        ],
        { maxBuffer: 16 * 1024 * 1024 },
      );
      await run(bin, [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        out,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        cover,
      ]);
    } catch {
      throw new CakeVideoError(VIDEO_WORDS.failed);
    }
    return {
      video: await readFile(out),
      cover: await readFile(cover),
      seconds,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
