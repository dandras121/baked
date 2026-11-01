import { describe, expect, it } from "vitest";
import {
  calendarCaption,
  calendarMonths,
  canHold,
  dayState,
  firstOpenMonth,
  monthDays,
  nearestDates,
  weekCount,
  type CapacityInput,
} from "./capacity";

// Monday 2 November 2026; lead time 5 → the earliest day is Saturday 7 November.
const base: CapacityInput = {
  today: "2026-11-02",
  leadTimeDays: 5,
  dailyCap: 2,
  weeklyCap: 9,
  closed: new Set(),
  dayCounts: new Map(),
  ownHold: null,
};

describe("§10.4 a date is available", () => {
  it("past, too soon, then available from today + lead time", () => {
    expect(dayState("2026-11-01", base)).toBe("past");
    expect(dayState("2026-11-02", base)).toBe("too-soon");
    expect(dayState("2026-11-06", base)).toBe("too-soon");
    expect(dayState("2026-11-07", base)).toBe("available");
  });

  it("closed days and days at the daily cap are fully booked; one slot free is enough", () => {
    const c = {
      ...base,
      closed: new Set(["2026-11-09"]),
      dayCounts: new Map([
        ["2026-11-10", 2],
        ["2026-11-11", 1],
      ]),
    };
    expect(dayState("2026-11-09", c)).toBe("full");
    expect(dayState("2026-11-10", c)).toBe("full");
    expect(dayState("2026-11-11", c)).toBe("available");
  });

  it("the Monday–Sunday week at its cap fills every day of that week, not the next", () => {
    const counts = new Map([
      ["2026-11-09", 2],
      ["2026-11-10", 2],
      ["2026-11-11", 2],
      ["2026-11-12", 2],
      ["2026-11-13", 1],
    ]);
    const c = { ...base, dayCounts: counts };
    expect(weekCount("2026-11-15", counts)).toBe(9);
    expect(dayState("2026-11-14", c)).toBe("full");
    expect(dayState("2026-11-16", c)).toBe("available");
  });

  it("a 3-cake order on an empty day with a cap of 2 makes it full afterwards (all cakes count)", () => {
    const c = { ...base, dayCounts: new Map([["2026-11-07", 3]]) };
    expect(dayState("2026-11-07", c)).toBe("full");
  });

  it("the customer's own hold shows as Selected, above too soon and full (§10.3)", () => {
    const c = {
      ...base,
      ownHold: "2026-11-04",
      dayCounts: new Map([["2026-11-04", 5]]),
    };
    expect(dayState("2026-11-04", c)).toBe("selected");
    expect(canHold("2026-11-04", c)).toBe(true);
  });
});

describe("§5.2 the calendar", () => {
  it("the current month and the 12 following, across the year end", () => {
    const m = calendarMonths("2026-11-02");
    expect(m).toHaveLength(13);
    expect(m[0]).toEqual({ year: 2026, month: 11 });
    expect(m[2]).toEqual({ year: 2027, month: 1 });
    expect(m[12]).toEqual({ year: 2027, month: 11 });
  });

  it("a month's days with Monday first (November 2026 starts on a Sunday)", () => {
    const { lead, days } = monthDays({ year: 2026, month: 11 });
    expect(lead).toBe(6);
    expect(days).toHaveLength(30);
  });

  it("the days around the clock change stay whole calendar days (DST, Sunday 29 March 2026)", () => {
    const { days } = monthDays({ year: 2026, month: 3 });
    expect(days).toHaveLength(31);
    expect(days.slice(27, 30)).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
    expect(dayState("2026-03-29", { ...base, today: "2026-03-24" })).toBe(
      "available",
    );
  });

  it("opens on the first month with an available day", () => {
    const closedAll = new Set(monthDays({ year: 2026, month: 11 }).days);
    expect(firstOpenMonth({ ...base, closed: closedAll })).toEqual({
      year: 2026,
      month: 12,
    });
  });

  it("up to three nearest available dates either side, never before the earliest", () => {
    const c = { ...base, closed: new Set(["2026-11-08"]) };
    expect(nearestDates("2026-11-08", c)).toEqual([
      "2026-11-07",
      "2026-11-09",
      "2026-11-10",
    ]);
  });

  it("the caption names the lead time in words", () => {
    expect(calendarCaption(5)).toBe(
      "Greyed-out days are too soon (I need five days’ notice), already full, or closed.",
    );
  });
});
