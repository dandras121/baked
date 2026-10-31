// The crops of the square card video (ANIMATIONS ANIM-11; claude/torta-video-szabalyrendszer.md §8). Every crop
// shares the video's bottom edge, so the turntable always sits on the picture's bottom edge.

export type Crop = { x0: number; y0: number; x1: number; y1: number };

export type CardKind = "desktop" | "tablet" | "phoneHome" | "phoneCatalogue";

/** The drawn crops (normalised square-video coordinates). Desktop and tablet share theirs. */
export const CARD_CROPS: Record<CardKind, { closed: Crop; open: Crop }> = {
  desktop: {
    closed: { x0: 0, y0: 0.3783, x1: 1, y1: 1 },
    open: { x0: 0.1136, y0: 0.36, x1: 0.8864, y1: 1 },
  },
  tablet: {
    closed: { x0: 0, y0: 0.3783, x1: 1, y1: 1 },
    open: { x0: 0.1136, y0: 0.36, x1: 0.8864, y1: 1 },
  },
  phoneHome: {
    closed: { x0: 0, y0: 0, x1: 1, y1: 1 },
    open: { x0: 0.18, y0: 0.1288, x1: 0.82, y1: 1 },
  },
  phoneCatalogue: {
    closed: { x0: 0, y0: 0, x1: 1, y1: 1 },
    open: { x0: 0.18, y0: 0.0988, x1: 0.82, y1: 1 },
  },
};

/**
 * The rule for any other picture size (ANIM-11): closed = the largest bottom-anchored crop of the picture's aspect;
 * open = width max(0.64, 0.64 × r), height = width / r, bottom edge y = 1, centred (r = open aspect w / h).
 */
export function closedCrop(aspect: number): Crop {
  if (aspect >= 1) {
    const h = 1 / aspect;
    return { x0: 0, y0: 1 - h, x1: 1, y1: 1 };
  }
  const w = aspect;
  return { x0: (1 - w) / 2, y0: 0, x1: (1 + w) / 2, y1: 1 };
}

export function openCrop(aspect: number): Crop {
  const r = Math.min(1.56, Math.max(0.64, aspect));
  const w = Math.max(0.64, 0.64 * r);
  const h = w / r;
  return { x0: (1 - w) / 2, y0: 1 - h, x1: (1 + w) / 2, y1: 1 };
}

/**
 * Where to put a square video of the box's width so that `crop` fills a box of `boxWidth` (top-left origin):
 * `translate(x, y) scale(s)` — a transform only, never a re-layout.
 */
export function cropTransform(crop: Crop, boxWidth: number) {
  const s = 1 / (crop.x1 - crop.x0);
  return { x: -crop.x0 * boxWidth * s, y: -crop.y0 * boxWidth * s, s };
}
