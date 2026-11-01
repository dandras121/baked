import { describe, expect, it } from "vitest";
import {
  allowedStep,
  stepCount,
  stepState,
  STEPS,
  STEP_TITLES,
} from "./checkout";

const none = { cakes: 1, whenDone: false, detailsDone: false };
const when = { cakes: 1, whenDone: true, detailsDone: false };
const all = { cakes: 1, whenDone: true, detailsDone: true };

describe("§10.2 opening a step directly", () => {
  it("a later step before an earlier one is complete goes to the first incomplete step", () => {
    expect(allowedStep("when", none)).toBe("when");
    expect(allowedStep("details", none)).toBe("when");
    expect(allowedStep("pay", none)).toBe("when");
    expect(allowedStep("details", when)).toBe("details");
    expect(allowedStep("pay", when)).toBe("details");
    expect(allowedStep("pay", all)).toBe("pay");
  });
});

describe("§5 the stepper", () => {
  it("four steps with their names; headings per step", () => {
    expect(STEPS.map((s) => s.label)).toEqual([
      "The cake",
      "When & where",
      "Your details",
      "Payment",
    ]);
    expect(STEP_TITLES).toEqual({
      when: "Name a day.",
      details: "A few details left.",
      pay: "One last look.",
    });
    expect(stepCount(2)).toBe("Step 2 of 4");
  });

  it("completed steps are done, the current one current, later ones to do", () => {
    expect([1, 2, 3, 4].map((n) => stepState(n, 3))).toEqual([
      "done",
      "done",
      "current",
      "todo",
    ]);
  });
});
