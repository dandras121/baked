import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The seamless loop needs frame 0 to be a key frame and no start delay (ANIM-11 Video playback; the video rules
// §9). Checked on the synthetic test clip; needs ffprobe (skipped where it is not installed).
const has = (() => {
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!has)("the card test clip loops without a seam", () => {
  for (const size of ["1080", "1440"]) {
    it(`${size}: square, 30 fps, 150 frames, key frame at 0, starts at 0, no audio`, () => {
      const file = join(
        process.cwd(),
        "public/samples/card-video",
        `card-${size}.mp4`,
      );
      const probe = (args: string[]) =>
        execFileSync("ffprobe", ["-v", "error", ...args, file])
          .toString()
          .trim();
      const [w, h, rate, frames] = probe([
        "-select_streams",
        "v",
        "-show_entries",
        "stream=width,height,r_frame_rate,nb_frames",
        "-of",
        "csv=p=0",
      ]).split(",");
      expect([w, h]).toEqual([size, size]);
      expect(rate).toBe("30/1");
      expect(frames).toBe("150");
      expect(
        probe(["-show_entries", "format=start_time", "-of", "csv=p=0"]),
      ).toBe("0.000000");
      const first = probe([
        "-select_streams",
        "v",
        "-read_intervals",
        "%+#1",
        "-show_entries",
        "frame=key_frame",
        "-of",
        "csv=p=0",
      ]);
      expect(first.split("\n")[0].split(",")[0]).toBe("1");
      expect(
        probe([
          "-select_streams",
          "a",
          "-show_entries",
          "stream=index",
          "-of",
          "csv=p=0",
        ]),
      ).toBe("");
    });
  }
});
