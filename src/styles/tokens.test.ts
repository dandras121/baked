import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, flatten, parseColour } from "@/lib/contrast";
import { parseTokens, tokenMap } from "@/lib/design-tokens";

const root = join(__dirname, "..", "..");
const tokensCss = readFileSync(join(__dirname, "tokens.css"), "utf8");
const tokens = tokenMap(parseTokens(tokensCss));
const t = (name: string) => {
  const value = tokens.get(name);
  if (!value) throw new Error(`Unknown token ${name}`);
  return value;
};
const over = (fg: string, bg: string) => {
  const flat = flatten(parseColour(t(fg)), parseColour(t(bg)));
  return `rgb(${flat.r} ${flat.g} ${flat.b})`;
};

// Text and background tokens that are drawn together in Figma.
const TEXT_PAIRS: [text: string, background: string, where: string][] = [
  ["--colour-ink", "--colour-white", "body, labels, buttons on cards"],
  ["--colour-ink", "--colour-paper", "body on the page"],
  ["--colour-ink-deep", "--colour-white", "footer small print"],
  ["--colour-display", "--colour-white", "headings, card titles"],
  ["--colour-display", "--colour-paper", "headings on the page"],
  ["--colour-accent", "--colour-white", "lead text, card description, links"],
  ["--colour-accent", "--colour-paper", "lead text on the page"],
  ["--colour-plum", "--colour-white", "highlighted line"],
  ["--colour-body", "--colour-white", "body copy, field labels"],
  ["--colour-body", "--colour-paper", "body copy on the page"],
  ["--colour-meta", "--colour-white", "meta, hints, placeholders"],
  ["--colour-meta", "--colour-paper", "meta on the page"],
  ["--colour-helper", "--colour-white", "lilac helper text"],
  ["--colour-error", "--colour-white", "error message"],
  ["--colour-ink-inverse", "--colour-ink", "solid button label"],
  ["--colour-display", "--colour-white", "secondary dialog button label"],
];

// Non-text parts that must stand out at 3 : 1 (WCAG 1.4.11).
const UI_PAIRS: [part: string, background: string, where: string][] = [
  ["--colour-dash-active", "--colour-white", "slider dash, active"],
  ["--colour-dash-neighbour", "--colour-white", "slider dash, neighbour"],
  ["--colour-dash-rest", "--colour-white", "slider dash, rest"],
  ["--colour-dash-rest", "--colour-paper", "slider dash, rest on the page"],
  ["--colour-focus-ring", "--colour-white", "keyboard focus ring"],
  ["--colour-focus-ring", "--colour-paper", "keyboard focus ring on the page"],
  ["--colour-ink", "--colour-white", "solid button, checked checkbox"],
  ["--colour-line-field", "--colour-white", "text field border"],
  [
    "--colour-line-field-active",
    "--colour-white",
    "text field border, pressed or focused",
  ],
  ["--colour-line-pill", "--colour-white", "pill border"],
  ["--colour-line-checkbox", "--colour-white", "empty checkbox"],
  ["--colour-line-button", "--colour-white", "light wallet button border"],
  ["--colour-focus-stroke", "--colour-white", "focused field stroke"],
  ["--colour-error-border", "--colour-white", "field border in error"],
  ["--colour-error-strong", "--colour-white", "checkbox border in error"],
];

// Drawn in Figma below 3 : 1 and kept as drawn: Bohoka's decision 2026-10-26 (DEVIATIONS.md). Must match exactly.
const UI_BELOW_3_KEPT_AS_DRAWN = [
  "--colour-line-field",
  "--colour-line-field-active",
  "--colour-line-pill",
  "--colour-line-checkbox",
  "--colour-line-button",
  "--colour-focus-stroke",
  "--colour-error-border",
];

describe("tokens (slice 0.2)", () => {
  it.each(TEXT_PAIRS)(
    "§10.13 text %s on %s (%s) is at least 4.5 : 1",
    (text, background) => {
      expect(contrastRatio(t(text), t(background))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("§10.13 text on the calm notice wash is at least 4.5 : 1", () => {
    const wash = over("--colour-calm-wash", "--colour-white");
    expect(contrastRatio(t("--colour-ink"), wash)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t("--colour-body"), wash)).toBeGreaterThanOrEqual(4.5);
  });

  it("§10.13 text on the error notice wash is at least 4.5 : 1", () => {
    const wash = over("--colour-error-wash", "--colour-white");
    expect(contrastRatio(t("--colour-error"), wash)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(t("--colour-body"), wash)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t("--colour-ink"), wash)).toBeGreaterThanOrEqual(4.5);
  });

  it("§10.13 non-text parts reach 3 : 1, except the drawn borders the owner kept", () => {
    const below = UI_PAIRS.filter(
      ([part, bg]) => contrastRatio(t(part), t(bg)) < 3,
    ).map(([part]) => part);
    expect(below).toEqual(UI_BELOW_3_KEPT_AS_DRAWN);
  });

  it("§10.13 meta grey is #756C82 and lilac helper text is #8957B8", () => {
    expect(t("--colour-meta").toLowerCase()).toBe("#756c82");
    expect(t("--colour-helper").toLowerCase()).toBe("#8957b8");
  });

  it("every --type token has a .type class", () => {
    const typography = readFileSync(join(__dirname, "typography.css"), "utf8");
    const styles = [...tokens.entries()]
      .filter(([n, v]) => n.startsWith("--type-") && v.includes("var(--font-"))
      .map(([n]) => n);
    for (const name of styles) {
      expect(typography).toContain(`.${name.slice(2)} {`);
    }
  });

  it("every declaration in tokens.css is read (one token per line)", () => {
    const declared = tokensCss.match(/^\s*--[a-z0-9-]+\s*:/gm) ?? [];
    expect(tokens.size).toBe(declared.length);
  });

  it("every token line has a description and a source", () => {
    for (const group of parseTokens(tokensCss)) {
      for (const token of group.tokens) {
        expect(token.description, token.name).not.toBe("");
        expect(token.source, token.name).not.toBe("");
      }
    }
  });
});

describe("no hard-coded colour or font size outside the token file (slice 0.2 done-when)", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(css|tsx?)$/.test(entry) && !/\.test\.tsx?$/.test(entry))
        files.push(path);
    }
  };
  walk(join(root, "src"));
  const allowed = new Set(["src/styles/tokens.css", "src/styles/fonts.css"]);

  it.each(files.map((f) => relative(root, f)).filter((f) => !allowed.has(f)))(
    "%s",
    (file) => {
      const text = readFileSync(join(root, file), "utf8");
      expect(text).not.toMatch(/#[0-9a-f]{3,8}\b(?![\w-])/i);
      expect(text).not.toMatch(/\brgba?\(|\bhsla?\(/i);
      expect(text).not.toMatch(/font-size\s*:\s*[\d.]+(px|rem|em)/i);
      expect(text).not.toMatch(/fontSize\s*:\s*["']?[\d.]/);
    },
  );
});
