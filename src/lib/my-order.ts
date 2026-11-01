// The “My order” button and panel (slice 4.2c, Bohoka 2026-11-01): what the panel shows, read from the draft.
import type { LineView } from "@/db/draft-repo";

export type MyOrderLine = {
  id: number;
  name: string;
  slug: string;
  detail: string;
  message: string | null;
  pricePence: number;
};

export type MyOrder = { lines: MyOrderLine[]; totalPence: number };

export const EMPTY_ORDER: MyOrder = { lines: [], totalPence: 0 };

export function myOrder(lines: LineView[]): MyOrder {
  return {
    lines: lines.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      detail: [l.sizeLine, l.options].filter(Boolean).join(" · "),
      message: l.message,
      pricePence: l.pricePence,
    })),
    totalPence: lines.reduce((s, l) => s + l.pricePence, 0),
  };
}

/** The button's label: “My order · 2” (the number of cakes). */
export const buttonLabel = (n: number) => `My order · ${n}`;

/** The button never shows on the checkout steps, which have their own summary. */
export const showsButton = (pathname: string, cakes: number) =>
  cakes > 0 && !pathname.startsWith("/order/");

/** Where a cake's Edit goes: its page in edit mode; Save comes back to step 2. */
export const editHref = (l: MyOrderLine) =>
  `/cakes/${l.slug}?line=${l.id}&from=when`;

/** Sent by the cake page after a cake was added, so the button shows at once. */
export const ORDER_CHANGED = "bbl:order-changed";
