import { describe, expect, it } from "vitest";
import {
  collectingCopy,
  collectOffer,
  deliveryPhase,
  nobodyCopy,
  redeliveryOffered,
} from "./delivery";
import { londonInstant } from "./london-time";
import { statusState } from "./order-status";

const day = "2026-09-12";
const attempt = {
  attempt: 1,
  outcome: "nobody-in",
  choice: "none",
  recordedOn: day,
  collectDay: null,
};

describe("Nobody was in (§6.8)", () => {
  it("choices are open until 23:59 on the recorded day, then closed; a choice is final", () => {
    expect(deliveryPhase(attempt, londonInstant(day, 23, 59))).toBe("choose");
    expect(deliveryPhase(attempt, londonInstant("2026-09-13", 0, 0))).toBe(
      "closed",
    );
    expect(
      deliveryPhase(
        { ...attempt, choice: "collect" },
        londonInstant("2026-09-20"),
      ),
    ).toBe("collect");
  });

  it("before 18:00 collect today before 6pm; from 18:00 tomorrow before 12 noon", () => {
    expect(collectOffer(day, londonInstant(day, 17, 59))).toEqual({
      day,
      when: "today",
      by: "6pm",
    });
    expect(collectOffer(day, londonInstant(day, 18, 0))).toEqual({
      day: "2026-09-13",
      when: "tomorrow",
      by: "12 noon",
    });
  });

  it("redelivery only on a first attempt with tomorrow open", () => {
    expect(redeliveryOffered(1, false)).toBe(true);
    expect(redeliveryOffered(1, true)).toBe(false);
    expect(redeliveryOffered(2, false)).toBe(false);
  });

  it("the words (1102:9106): today with the better-of-the-two line; late and no redelivery", () => {
    const base = {
      day,
      today: day,
      recordedOn: day,
      town: "Winchburgh",
      collectAt: "20 Church View, Winchburgh",
      feePence: 1500,
      offerRedelivery: true,
      phone: "+44 7884 199103",
    };
    const c = nobodyCopy({ ...base, now: londonInstant(day, 11) });
    expect(c.intro).toBe(
      "I waited fifteen minutes on Saturday 12 September, then brought your cake back to Winchburgh.",
    );
    expect(c.collectLine).toBe(
      "Collect it today — free, any time before 6pm, from 20 Church View, Winchburgh.",
    );
    expect(c.redeliverLine).toBe(
      "Or I run it out again tomorrow for £15, at a time that suits you.",
    );
    expect(c.redeliverButton).toBe("Try again tomorrow — £15");
    expect(c.bestLine).toMatch(/^A cake is always best/);
    const late = nobodyCopy({
      ...base,
      offerRedelivery: false,
      now: londonInstant(day, 19),
    });
    expect(late.collectButton).toBe("I will collect it tomorrow");
    expect(late.redeliverLine).toBeNull();
    expect(late.bestLine).toBeNull();
    expect(
      nobodyCopy({ ...base, feePence: 0, now: londonInstant(day, 9) })
        .redeliverButton,
    ).toBe("Try again tomorrow — free");
  });

  it("G and the NEXT box after choosing to collect", () => {
    const g = collectingCopy({
      collectDay: day,
      recordedOn: day,
      today: day,
      collectAt: "20 Church View, Winchburgh",
    });
    expect(g.noticeTitle).toBe("Collection today, confirmed");
    expect(g.ready).toBe("Any time before 6pm today");
    expect(
      collectingCopy({
        collectDay: "2026-09-13",
        recordedOn: day,
        today: day,
        collectAt: "x",
      }).nextTitle,
    ).toBe("Collect it tomorrow before 12 noon");
  });

  it("status page: Nobody was in comes right after E; the collection shows until its day has passed", () => {
    const o = { status: "confirmed", date: day };
    const nobody = { outcome: "nobody-in", choice: "none", collectDay: null };
    expect(statusState(o, day, nobody)).toBe("NOBODY");
    expect(statusState(o, "2026-09-14", nobody)).toBe("NOBODY");
    expect(statusState({ ...o, status: "cancelled" }, day, nobody)).toBe("E");
    const chose = { ...nobody, choice: "collect", collectDay: "2026-09-13" };
    expect(statusState(o, "2026-09-13", chose)).toBe("MISSED");
    expect(statusState(o, "2026-09-14", chose)).toBe("C");
    expect(statusState({ ...o, status: "completed" }, day, chose)).toBe("C");
  });
});
