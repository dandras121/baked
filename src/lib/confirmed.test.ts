import { describe, expect, it } from "vitest";
import { londonInstant } from "./london-time";
import { CONFIRMED_COPY, whatHappensNext } from "./confirmed";

const base = {
  email: "mairi@example.co.uk",
  date: "2026-09-12",
  today: "2026-09-01",
  confirmedAt: londonInstant("2026-09-01", 14),
  now: londonInstant("2026-09-01", 14),
  handover: "delivery" as const,
  window: "morning",
  collectionAddress: "20 Church View, Winchburgh",
};

describe("Order confirmed: what happens next (§5.6)", () => {
  it("delivery: right now, two days before with the D-2 date, the date with the window", () => {
    const { rows, changeUntil } = whatHappensNext(base);
    expect(rows).toEqual([
      {
        label: "Right now",
        text: CONFIRMED_COPY.rightNow("mairi@example.co.uk"),
      },
      {
        label: "Two days before",
        text: "Thursday 10 September is the last day to change or cancel online.",
      },
      {
        label: "Saturday 12 September",
        text: "Delivery between 9am and 12pm. I will text you that morning with a tighter window.",
      },
    ]);
    expect(changeUntil).toBe("Thursday 10 September");
  });

  it("collection: the address from Settings, no text line", () => {
    const { rows } = whatHappensNext({
      ...base,
      handover: "collection",
      window: null,
    });
    expect(rows.at(-1)!.text).toBe(
      "Collection from 20 Church View, Winchburgh, at a time we agree. I will be in touch to arrange it.",
    );
  });

  it("confirmed after 08:00 on D-2: no two-days-before row; online changes open until 23:59 that day", () => {
    const at = londonInstant("2026-09-10", 8, 1);
    const r = whatHappensNext({ ...base, confirmedAt: at, now: at });
    expect(r.rows.map((x) => x.label)).toEqual([
      "Right now",
      "Saturday 12 September",
    ]);
    expect(r.changeUntil).toBe("Thursday 10 September");
    const late = whatHappensNext({
      ...base,
      now: londonInstant("2026-09-11", 0),
    });
    expect(late.changeUntil).toBeNull();
  });

  it("a date in another year carries the year", () => {
    const { rows } = whatHappensNext({
      ...base,
      date: "2027-01-09",
      today: "2026-12-20",
    });
    expect(rows.at(-1)!.label).toBe("Saturday 9 January 2027");
  });
});
