// The card video (§9.13, Decided 2026-10-22; claude/torta-video-szabalyrendszer.md): MP4 or MOV, square, at least
// 1440 × 1440, 4.9–5.1 s. The server keeps no sound and makes 1080 and 1440 square H.264 copies (key frame on frame 0,
// no B-frames, so there is no start delay and the loop is seamless) and a 1440 still of frame 0.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { durationOf, ffmpeg } from "./cake-video";
import { CARD_VIDEO, CARD_VIDEO_WORDS } from "./video-rules";

const run = promisify(execFile);

export class CardVideoError extends Error {
  constructor(readonly words: string) {
    super(words);
  }
}

/** The first video stream's size from ffmpeg's report (“Video: h264 …, 2160x2160 [SAR 1:1 …]”). */
export function sizeOf(report: string): { w: number; h: number } | null {
  const line = /Stream #\d+:\d+[^\n]*: Video:[^\n]*/.exec(report)?.[0];
  const m = line && /[ ,](\d{2,5})x(\d{2,5})[ ,\]]/.exec(line);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

/** Why a file cannot be the card video, or null when it can (§9.13: one sentence for every wrong file). */
export function cardVideoProblem(
  seconds: number | null,
  size: { w: number; h: number } | null,
): string | null {
  if (seconds === null || !size) return CARD_VIDEO_WORDS.wrong;
  const square = size.w === size.h;
  const long =
    seconds >= CARD_VIDEO.minSeconds && seconds <= CARD_VIDEO.maxSeconds;
  return square && size.w >= CARD_VIDEO.minSide && long
    ? null
    : CARD_VIDEO_WORDS.wrong;
}

export type CardVideoFiles = { v1080: Buffer; v1440: Buffer; still: Buffer };

/** The web copies and the still. Throws CardVideoError with the words when the file cannot be used. */
export async function processCardVideo(input: Buffer): Promise<CardVideoFiles> {
  if (input.length > CARD_VIDEO.maxBytes)
    throw new CardVideoError(CARD_VIDEO_WORDS.size(input.length));
  const bin = await ffmpeg();
  const dir = await mkdtemp(join(tmpdir(), "card-video-"));
  try {
    const source = join(dir, "source");
    await writeFile(source, input);
    const report = await run(bin, ["-hide_banner", "-i", source]).then(
      (r) => r.stderr,
      (e: { stderr?: string }) => e.stderr ?? "",
    );
    const problem = cardVideoProblem(durationOf(report), sizeOf(report));
    if (problem) throw new CardVideoError(problem);
    const web = (side: number, out: string) =>
      run(
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
          "-an",
          "-vf",
          `scale=${side}:${side}:flags=lanczos,setsar=1`,
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "21",
          "-pix_fmt",
          "yuv420p",
          "-bf",
          "0",
          "-g",
          "150",
          "-force_key_frames",
          "expr:eq(n,0)",
          "-movflags",
          "+faststart",
          out,
        ],
        { maxBuffer: 16 * 1024 * 1024 },
      );
    const v1080 = join(dir, "1080.mp4");
    const v1440 = join(dir, "1440.mp4");
    const frame = join(dir, "still.png");
    try {
      await web(1080, v1080);
      await web(1440, v1440);
      await run(bin, [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        v1440,
        "-frames:v",
        "1",
        frame,
      ]);
    } catch {
      throw new CardVideoError(CARD_VIDEO_WORDS.failed);
    }
    return {
      v1080: await readFile(v1080),
      v1440: await readFile(v1440),
      still: await sharp(await readFile(frame))
        .webp({ quality: 86 })
        .toBuffer(),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
