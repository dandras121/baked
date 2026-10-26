// WCAG 2.2 contrast ratio for the token colours (SITE-FLOWS §10.13).

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseColour(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/i.exec(
    value.trim(),
  );
  if (rgb) {
    return {
      r: +rgb[1],
      g: +rgb[2],
      b: +rgb[3],
      a: rgb[4] === undefined ? 1 : +rgb[4],
    };
  }
  throw new Error(`Not a colour this helper reads: ${value}`);
}

/** A see-through colour as it looks over an opaque background. */
export function flatten(colour: Rgba, background: Rgba): Rgba {
  const mix = (c: number, b: number) =>
    Math.round(c * colour.a + b * (1 - colour.a));
  return {
    r: mix(colour.r, background.r),
    g: mix(colour.g, background.g),
    b: mix(colour.b, background.b),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const bg = parseColour(background);
  const fg = flatten(parseColour(foreground), bg);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
