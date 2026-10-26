import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractKeyframes } from "../../scripts/extract-keyframes.mjs";
import { createInputLock } from "./input-lock";
import data from "./keyframes.json";
import { rowsFor, startFrom, toKeyframes, type Row } from "./scale-rows";

const last = (rows: readonly Row[]) => rows[rows.length - 1][1];

describe("A§12 keyframe data has one source", () => {
  it("src/motion/keyframes.json equals the JSON appendix of ANIMATIONS.md (run `pnpm keyframes`)", () => {
    const doc = readFileSync(
      join(__dirname, "..", "..", "docs", "ANIMATIONS.md"),
      "utf8",
    );
    expect(data).toEqual(extractKeyframes(doc));
  });

  it("A§1.1 every sampled timeline ends before 1000 ms", () => {
    const walk = (v: unknown): number[] =>
      Array.isArray(v) &&
      v.length > 0 &&
      v.every((row) => Array.isArray(row) && typeof row[0] === "number")
        ? v.map((row) => row[0] as number) // a sampled table: [t, …] rows
        : Array.isArray(v)
          ? v.flatMap(walk)
          : v && typeof v === "object"
            ? Object.values(v).flatMap(walk)
            : [];
    const times = walk(data);
    expect(times.length).toBeGreaterThan(100);
    expect(Math.max(...times)).toBeLessThan(1000);
  });
});

describe("ANIM-07 pressable tables (A§7E)", () => {
  it("hover grows to 110 % in 240 ms and back to 100 % in 200 ms", () => {
    expect(rowsFor("button", "hoverIn", "mouse")!.at(-1)).toEqual([240, 1.1]);
    expect(rowsFor("button", "hoverOut", "mouse")!.at(-1)).toEqual([200, 1]);
  });
  it("desktop press returns to 100 % in 120 ms; release springs back to 110 % in 340 ms", () => {
    expect(rowsFor("button", "press", "mouse")!.at(-1)).toEqual([120, 1]);
    const release = rowsFor("button", "release", "mouse")!;
    expect(release.at(-1)).toEqual([340, 1.1]);
    expect(Math.max(...release.map((r) => r[1]))).toBeCloseTo(1.115);
  });
  it("phone press shrinks to 90 % in 120 ms; release springs to 100 % with a small overshoot", () => {
    expect(rowsFor("button", "press", "touch")!.at(-1)).toEqual([120, 0.9]);
    const release = rowsFor("button", "release", "touch")!;
    expect(release.at(-1)).toEqual([340, 1]);
    expect(Math.max(...release.map((r) => r[1]))).toBeCloseTo(1.02);
  });
  it("desktop navigation items grow 15 %", () => {
    expect(last(rowsFor("nav", "hoverIn", "mouse")!)).toBe(1.15);
    expect(last(rowsFor("nav", "release", "mouse")!)).toBe(1.15);
    expect(last(rowsFor("nav", "press", "mouse")!)).toBe(1);
  });
});

describe("ANIM-05 writable field tables (A§7C)", () => {
  it("hover and press as ANIM-07", () => {
    expect(rowsFor("field", "hoverIn", "mouse")).toEqual(
      rowsFor("button", "hoverIn", "mouse"),
    );
    expect(rowsFor("field", "press", "touch")).toEqual(
      rowsFor("button", "press", "touch"),
    );
  });
  it("desktop release: no bounce, the field stays at 100 %", () => {
    expect(rowsFor("field", "release", "mouse")).toBeNull();
  });
  it("phone release springs back to 100 %", () => {
    expect(last(rowsFor("field", "release", "touch")!)).toBe(1);
  });
});

describe("A§7E interruptions start from the current scale", () => {
  it("hover out from 1.05 ends at 1.00 and starts at 1.05", () => {
    const rows = startFrom(rowsFor("button", "hoverOut", "mouse")!, 1.05);
    expect(rows[0][1]).toBeCloseTo(1.05);
    expect(last(rows)).toBe(1);
    expect(rows.map((r) => r[0])).toEqual([0, 50, 100, 150, 200]);
  });
  it("the table is unchanged when it already starts at the current scale", () => {
    const rows = rowsFor("button", "hoverIn", "mouse")!;
    expect(startFrom(rows, 1)).toEqual(rows);
  });
  it("keyframes are linear between the samples (A§1.2)", () => {
    const { keyframes, duration } = toKeyframes(
      rowsFor("button", "hoverIn", "mouse")!,
    );
    expect(duration).toBe(240);
    expect(keyframes.map((k) => k.offset)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(keyframes.at(-1)!.transform).toBe("scale(1.1)");
  });
});

describe("A§1.5 input lock", () => {
  it("a second press while the first action runs is ignored", async () => {
    const lock = createInputLock();
    let runs = 0;
    let finish!: () => void;
    const task = () =>
      new Promise<void>((resolve) => {
        runs += 1;
        finish = resolve;
      });
    expect(lock.run(task)).toBe(true);
    await Promise.resolve();
    expect(lock.run(task)).toBe(false);
    expect(lock.locked).toBe(true);
    finish();
    await new Promise((r) => setTimeout(r, 0));
    expect(lock.locked).toBe(false);
    expect(lock.run(task)).toBe(true);
    await Promise.resolve();
    expect(runs).toBe(2);
  });
});
