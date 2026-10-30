import { describe, expect, it } from "vitest";
import {
  cakeCard,
  homeCakes,
  homeSquares,
  type CakeRow,
  type GalleryRow,
} from "./home-content";

const cake = (n: number, over: Partial<CakeRow> = {}): CakeRow => ({
  slug: `cake-${n}`,
  name: `Cake ${n}`,
  flavour: "Vanilla sponge",
  visible: true,
  deleted: false,
  position: n,
  sizes: [{ serves: 24, tiers: 2, pricePence: 18500 }],
  ...over,
});

describe("Home cake row (§4.1, §11.3)", () => {
  it("first five visible designs in Linda's order", () => {
    const rows = [
      cake(7),
      cake(1),
      cake(3, { visible: false }),
      cake(2),
      cake(5),
      cake(4, { deleted: true }),
      cake(6),
      cake(8),
    ];
    expect(homeCakes(rows).map((c) => c.slug)).toEqual([
      "cake-1",
      "cake-2",
      "cake-5",
      "cake-6",
      "cake-7",
    ]);
  });

  it("no visible design → an empty row (the block is not rendered)", () => {
    expect(homeCakes([cake(1, { visible: false })])).toEqual([]);
  });

  it("tier line of the smallest size, From = the smallest price", () => {
    const c = cakeCard(
      cake(1, {
        sizes: [
          { serves: 40, tiers: 3, pricePence: 26000 },
          { serves: 12, tiers: 1, pricePence: 9550 },
          { serves: 24, tiers: 2, pricePence: 18500 },
        ],
      }),
    )!;
    expect(c.tiers).toBe("One tier");
    expect(c.serves).toBe("Serves 12");
    expect(c.from).toBe("From £95.50");
  });

  it("the drawn sample reads TWO TIERS · SERVES 24 · From £185", () => {
    const c = cakeCard(cake(1))!;
    expect([c.tiers, c.serves, c.from]).toEqual([
      "Two tiers",
      "Serves 24",
      "From £185",
    ]);
  });
});

const photo = (id: number, over: Partial<GalleryRow> = {}): GalleryRow => ({
  id,
  caption: `Caption ${id}`,
  altText: "",
  imagePath: `/g/${id}.jpg`,
  showing: true,
  homeOrder: null,
  createdAt: new Date(2026, 0, id),
  ...over,
});

describe("Special idea squares (§4.1, §9.18)", () => {
  it("Linda's picks in her order, then the newest showing photos", () => {
    const rows = [
      photo(1, { homeOrder: 2 }),
      photo(2),
      photo(3),
      photo(4, { homeOrder: 1 }),
      photo(5, { showing: false }),
    ];
    expect(homeSquares(rows).squares.map((s) => s?.id)).toEqual([4, 1, 3, 2]);
  });

  it("hidden photos never show, even when picked; fewer than four → empty squares", () => {
    const { squares, galleryLink } = homeSquares([
      photo(1, { homeOrder: 1, showing: false }),
      photo(2),
    ]);
    expect(squares.map((s) => s?.id ?? null)).toEqual([2, null, null, null]);
    expect(galleryLink).toBe(true);
  });

  it("no showing photo → four empty squares and no gallery link", () => {
    expect(homeSquares([photo(1, { showing: false })])).toEqual({
      squares: [null, null, null, null],
      galleryLink: false,
    });
  });

  it("alt text = the photo's alt text, or its caption", () => {
    const { squares } = homeSquares([
      photo(1, { altText: "A tall white cake" }),
      photo(2),
    ]);
    expect(squares.map((s) => s?.alt)).toEqual([
      "Caption 2",
      "A tall white cake",
      undefined,
      undefined,
    ]);
  });
});
