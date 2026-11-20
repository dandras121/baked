import { describe, expect, it } from "vitest";
import {
  canText,
  collectionMinutes,
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
