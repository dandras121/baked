import { describe, expect, it } from "vitest";
import {
  canText,
  collectionMinutes,
  missedLine,
  nobodyCopy,
  readyText,
  smsHref,
  startMinutes,
  todaySubtitle,
  whenLabel,
} from "./today";

describe("Today (§9.3)", () => {
  it("reads collection times as people type them", () => {
    expect(collectionMinutes("12 noon")).toBe(720);
    expect(collectionMinutes("14:30")).toBe(870);
    expect(collectionMinutes("2pm")).toBe(840);
    expect(collectionMinutes("2.30 pm")).toBe(870);
    expect(collectionMinutes("after school")).toBeNull();
    expect(collectionMinutes(null)).toBeNull();
  });

  it("orders by the window's start or the collection time; no time is last", () => {
    expect(
      startMinutes({
        handover: "delivery",
        window: "morning",
        collectionTime: null,
      }),
    ).toBe(540);
    expect(
      startMinutes({
        handover: "delivery",
        window: "evening",
        collectionTime: null,
      }),
    ).toBe(960);
    expect(
      startMinutes({
        handover: "collection",
        window: null,
        collectionTime: null,
      }),
    ).toBeNull();
    expect(
      whenLabel({
        handover: "delivery",
        window: "morning",
        collectionTime: null,
      }),
    ).toBe("9am – 12pm");
    expect(
      whenLabel({
        handover: "collection",
        window: null,
        collectionTime: "12 noon",
      }),
    ).toBe("12 noon");
  });

  it("the subtitle leaves out zeros; the payment part only for an Owner; the phone's short form", () => {
    expect(todaySubtitle({ out: 3, collections: 1, payments: 1 })).toBe(
      "Three going out today · one collection · one payment still open",
    );
    expect(todaySubtitle({ out: 3, collections: 1, payments: 1 }, true)).toBe(
      "Three going out · one collection · one payment open",
    );
    expect(todaySubtitle({ out: 2, collections: 0, payments: null })).toBe(
      "Two going out today",
    );
    expect(todaySubtitle({ out: 0, collections: 0, payments: 0 })).toBe("");
  });

  it("the ready-written texts, signed as Linda (Admin / 20)", () => {
    expect(
      readyText({
        name: "Mairi Sinclair",
        handover: "delivery",
        window: "morning",
        collectionTime: null,
        kitchen: "20 Church View, Winchburgh",
      }),
    ).toBe(
      "Hi Mairi, it’s Linda from Baked by Linda. Your cake is coming today — I’ll be with you between 9am and 12pm. Any problem, just reply to this text.",
    );
    expect(
      readyText({
        name: "Callum Reid",
        handover: "collection",
        window: null,
        collectionTime: "12 noon",
        kitchen: "20 Church View, Winchburgh",
      }),
    ).toBe(
      "Hi Callum, it’s Linda from Baked by Linda. Your cake is ready — see you at 12 noon at 20 Church View, Winchburgh. Running late? Just reply to this text.",
    );
    expect(
      readyText({
        name: "Callum Reid",
        handover: "collection",
        window: null,
        collectionTime: null,
        kitchen: "20 Church View, Winchburgh",
      }),
    ).toContain("see you today at 20 Church View");
  });

  it("texts only mobiles; the link works on iOS and Android", () => {
    expect(canText("+447700900000")).toBe(true);
    expect(canText("+441314960000")).toBe(false);
    expect(canText("+353851234567")).toBe(true);
    expect(canText(null)).toBe(false);
    expect(smsHref("+447700900000", "Hi Mairi")).toBe(
      "sms:+447700900000?&body=Hi%20Mairi",
    );
  });
});

describe("Nobody was in (8.3b)", () => {
  const day = "2026-09-12";
  const base = {
    name: "Mairi Sinclair",
    address: "48 Preston Road",
    town: "Linlithgow",
    window: "morning",
    feePence: 1500,
  };
  it("words the confirm as Admin / 21, the fee for an Owner only", () => {
    const c = nobodyCopy({ ...base, redeliver: true, owner: true });
    expect(c.label).toBe("Mairi Sinclair · 9am – 12pm");
    expect(c.title).toBe("Nobody in at 48 Preston Road?");
    expect(c.text).toContain("brought back tomorrow for £15.");
    expect(
      nobodyCopy({ ...base, redeliver: true, owner: false }).text,
    ).toContain("tomorrow (paid)");
  });
  it("offers free collection only when no redelivery can be offered", () => {
    const c = nobodyCopy({ ...base, redeliver: false, owner: true });
    expect(c.text).not.toContain("brought back");
    expect(c.text).toContain("collect it today for free");
  });
  it("the row line follows the customer's choice", () => {
    const d = (s: string) => `short ${s}`;
    const m = { choice: "none", redeliveryDay: null, feePaidPence: 0 };
    expect(missedLine(m, day, true, d)).toBe("Nobody was in · email sent");
    expect(missedLine({ ...m, choice: "collect" }, day, true, d)).toBe(
      "Nobody was in · collecting",
    );
    const r = {
      choice: "redeliver",
      redeliveryDay: "2026-09-13",
      feePaidPence: 1500,
    };
    expect(missedLine(r, day, true, d)).toBe(
      "Redelivery short 2026-09-13 · £15 paid",
    );
    expect(missedLine(r, day, false, d)).toBe(
      "Redelivery short 2026-09-13 · paid",
    );
  });
});
