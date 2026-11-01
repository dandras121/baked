import { describe, expect, it } from "vitest";
import { buttonLabel, editHref, myOrder, showsButton } from "./my-order";
import type { LineView } from "@/db/draft-repo";

const line = (id: number, pricePence: number): LineView => ({
  id,
  title: "The Lothian",
  options: "Sponge: Chocolate",
  pricePence,
  name: "The Lothian",
  slug: "the-lothian",
  sizeLine: "Two tiers · serves 24",
  message: "Happy 30th",
});

describe("slice 4.2c My order", () => {
  it("shows once the order has a cake, never on the checkout steps", () => {
    expect(showsButton("/", 0)).toBe(false);
    expect(showsButton("/", 1)).toBe(true);
    expect(showsButton("/cakes/the-lothian", 2)).toBe(true);
    for (const p of ["/order/when", "/order/details", "/order/pay"])
      expect(showsButton(p, 2)).toBe(false);
  });
  it("lists every cake with its price and the total", () => {
    const o = myOrder([line(1, 18500), line(2, 9500)]);
    expect(o.totalPence).toBe(28000);
    expect(o.lines[0]).toMatchObject({
      detail: "Two tiers · serves 24 · Sponge: Chocolate",
      message: "Happy 30th",
    });
    expect(buttonLabel(2)).toBe("My order · 2");
    expect(editHref(o.lines[1])).toBe("/cakes/the-lothian?line=2&from=when");
  });
});
