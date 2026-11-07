import { describe, expect, it } from "vitest";
import { panelDate, statusCopy, statusState } from "./order-status";

const date = "2026-09-12"; // a Saturday
const o = (status = "confirmed") => ({ status, date });

describe("§6.2 which state shows — the first match wins", () => {
  it("A until 23:59 on D-2, B from 00:00 on D-1, B2 on the day, C after it", () => {
    expect(statusState(o(), "2026-09-01")).toBe("A");
    expect(statusState(o(), "2026-09-10")).toBe("A");
    expect(statusState(o(), "2026-09-11")).toBe("B");
    expect(statusState(o(), "2026-09-12")).toBe("B2");
    expect(statusState(o(), "2026-09-13")).toBe("C");
  });
  it("completed is C even on the day; cancelled or refunded is E before anything else", () => {
    expect(statusState(o("completed"), "2026-09-12")).toBe("C");
    expect(statusState(o("cancelled"), "2026-09-01")).toBe("E");
    expect(statusState(o("refunded"), "2026-09-20")).toBe("E");
  });
});

describe("§6.3 the words of each state", () => {
  const base = {
    date,
    today: "2026-09-01",
    handover: "delivery" as const,
    window: "morning",
    manual: false,
    completed: false,
    collectAt: "20 Church View, Winchburgh",
  };
  it("A: the NEXT box with date and window, and the last day to change (D-2)", () => {
    const c = statusCopy({ ...base, state: "A" });
    expect(c.nextTitle).toBe("Saturday 12 September, 9am – 12pm");
    expect(c.note).toBe(
      "Changes are possible until Thursday 10 September. After that the cake is already being made.",
    );
  });
  it("A for collection; manual orders go through Linda", () => {
    const c = statusCopy({
      ...base,
      state: "A",
      handover: "collection",
      window: null,
    });
    expect(c.nextTitle).toBe(
      "Saturday 12 September — collection time to agree",
    );
    expect(c.nextText).toBe(
      "I will have it boxed and ready at 20 Church View, Winchburgh.",
    );
    expect(statusCopy({ ...base, state: "B", manual: true }).note).toMatch(
      /bespoke cake go through me/,
    );
  });
  it("B2 says today; C keeps the link 30 days; handed over on the day", () => {
    expect(statusCopy({ ...base, state: "B2", today: date }).nextTitle).toBe(
      "Today, 9am – 12pm",
    );
    expect(statusCopy({ ...base, state: "C", today: "2026-09-14" }).note).toBe(
      "Keep this link if you like — it works until Monday 12 October.",
    );
    expect(
      statusCopy({ ...base, state: "C", today: date, completed: true }).eyebrow,
    ).toBe("Handed over");
  });
  it("the panel date: short weekday; “Today,” on the day", () => {
    expect(panelDate(date, "2026-09-01")).toBe("Sat 12 September");
    expect(panelDate(date, date)).toBe("Today, Sat 12 September");
  });
});
