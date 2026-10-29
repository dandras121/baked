import { describe, expect, it } from "vitest";
import data from "@/motion/keyframes.json";
import { activeIndexFor, NAV_ITEMS, NAV_LEFTS } from "./nav-items";

const label = (path: string) =>
  NAV_ITEMS[activeIndexFor(path)]?.label ?? "none";

describe("A§3.3 active navigation item per page", () => {
  it.each([
    ["/", "Home"],
    ["/cakes", "Cakes"],
    ["/cakes/the-lothian", "Cakes"],
    ["/order/when", "Cakes"],
    ["/order/details", "Cakes"],
    ["/order/pay", "Cakes"],
    ["/order/confirmed", "Cakes"],
    ["/bespoke", "Bespoke"],
    ["/bespoke/sent", "Bespoke"],
    ["/my-enquiry/abc123", "Bespoke"],
    ["/gallery", "Gallery"],
    ["/about", "About Linda"],
    ["/faq", "FAQ"],
    ["/contact", "Contact"],
    ["/contact/sent", "Contact"],
    ["/contact/", "Contact"],
  ])("%s → %s", (path, expected) => {
    expect(label(path)).toBe(expected);
  });

  it.each([
    "/find-my-order",
    "/terms",
    "/privacy",
    "/cookies",
    "/delivery-and-collection",
    "/cancellations",
    "/accessibility",
    "/complaints",
    "/complaints/sent",
    "/allergens",
    "/my-order/tok",
    "/my-order/tok/change",
    "/pay/tok",
    "/delivery/tok",
    "/unsubscribe/tok",
    "/no-such-page",
    "/cakesx",
    "/abouts",
  ])("%s has no active item", (path) => {
    expect(activeIndexFor(path)).toBe(-1);
  });
});

describe("A§8 STYLE-01 desktop navigation geometry", () => {
  it("seven items in the decided order with the drawn word widths", () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.width])).toEqual([
      ["Home", 40],
      ["Cakes", 40],
      ["Bespoke", 57],
      ["Gallery", 48],
      ["About Linda", 81],
      ["FAQ", 28],
      ["Contact", 53],
    ]);
  });

  it("items are 32 px apart and the group is 539 px wide", () => {
    const last = NAV_ITEMS.length - 1;
    expect(NAV_LEFTS[last] + NAV_ITEMS[last].width).toBe(539);
    expect(NAV_LEFTS[1] - (NAV_LEFTS[0] + NAV_ITEMS[0].width)).toBe(32);
  });

  it("in the 1280 header Cakes spans 776–816 and About Linda 1017–1098 (A§7F example)", () => {
    const groupLeft = 1243 - 539;
    expect(groupLeft + NAV_LEFTS[1]).toBe(776);
    expect(groupLeft + NAV_LEFTS[4] + 81).toBe(1098);
    expect(groupLeft + NAV_LEFTS[4]).toBe(1017);
  });
});

describe("ANIM-08 without the underline (Bohoka 2026-10-29)", () => {
  it("the clicked item still turns SemiBold at 210 ms (A§12)", () => {
    expect(data.navUnderlineSlide.weightSwitchMs).toBe(210);
  });
});
