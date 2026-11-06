import { describe, expect, it } from "vitest";
import { afterFailure, backoffMs, whenDue } from "./queue";

const t = (min: number) => new Date(Date.UTC(2026, 10, 6, 12, min));

describe("retries until the deadline (§8.4 Failures)", () => {
  it("backoff: 1, 2, 4, 8 … minutes, at most 30", () => {
    expect([1, 2, 3, 4, 6, 9].map((a) => backoffMs(a) / 60_000)).toEqual([
      1, 2, 4, 8, 30, 30,
    ]);
  });

  it("a failed attempt is retried while the next try is before the deadline; then “Failed”", () => {
    expect(afterFailure(1, t(0), t(10), true)).toEqual({
      status: "queued",
      nextAttemptAt: t(1),
    });
    expect(afterFailure(4, t(0), t(8), true).status).toBe("failed");
    expect(afterFailure(1, t(0), t(10), false).status).toBe("failed"); // a final answer (inactive recipient)
  });

  it("found after its deadline: “Failed — too late” when never tried, “Failed” when tried", () => {
    expect(whenDue({ attempts: 0, deadline: t(10) }, t(5))).toBe("send");
    expect(whenDue({ attempts: 0, deadline: t(10) }, t(10))).toBe(
      "failed-too-late",
    );
    expect(whenDue({ attempts: 2, deadline: t(10) }, t(11))).toBe("failed");
  });
});
