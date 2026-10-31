// Legal pages (§4.5): the editor's small format turned into sections, with placeholders filled from Settings (§11.8).
//   "## Heading" starts a section (numbered on the page, not typed); "## Heading {#id}" fixes its anchor;
//   a blank line separates paragraphs; "- " lines are a list; **bold**; [text](href).
import { questionSlug } from "./faq";
import { renderTemplate, type Placeholder } from "./placeholders";

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string };
export type Block =
  { kind: "p"; inline: Inline[] } | { kind: "ul"; items: Inline[][] };
export type LegalSection = {
  id: string;
  number: number;
  heading: string;
  blocks: Block[];
};

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last)
      out.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "bold", text: m[1] });
    else out.push({ kind: "link", text: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

const capitaliseSentences = (s: string) =>
  s.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_, a: string, b: string) => a + b.toUpperCase(),
  );

/** Fills the placeholders; a placeholder that starts a sentence gets a capital. */
export function fillLegal(
  text: string,
  values: Record<Placeholder, string>,
): string {
  return text
    .split("\n")
    .map((line) => {
      const filled = renderTemplate(line, values);
      return line.startsWith("{") ? capitaliseSentences(filled) : filled;
    })
    .join("\n");
}

export function parseLegal(body: string): LegalSection[] {
  const sections: LegalSection[] = [];
  const used = new Set<string>();
  for (const chunk of body.split(/^## /m).slice(1)) {
    const [first, ...rest] = chunk.split("\n");
    const fixed = first.match(/\s*\{#([a-z0-9-]+)\}\s*$/);
    const heading = (fixed ? first.slice(0, fixed.index) : first).trim();
    let id = fixed ? fixed[1] : questionSlug(heading);
    while (used.has(id)) id += "-2";
    used.add(id);
    const blocks: Block[] = [];
    for (const para of rest.join("\n").split(/\n\s*\n/)) {
      const lines = para.split("\n").filter((l) => l.trim() !== "");
      if (lines.length === 0) continue;
      const text = lines.filter((l) => !l.startsWith("- "));
      const items = lines.filter((l) => l.startsWith("- "));
      if (text.length)
        blocks.push({ kind: "p", inline: parseInline(text.join(" ")) });
      if (items.length)
        blocks.push({
          kind: "ul",
          items: items.map((l) => parseInline(l.slice(2))),
        });
    }
    sections.push({ id, number: sections.length + 1, heading, blocks });
  }
  return sections;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** “2026-08-24” → “24 August 2026” (shown in capitals: “LAST UPDATED 24 AUGUST 2026”). */
export function updatedLabel(isoDate: string): string {
  return DATE.format(new Date(`${isoDate}T00:00:00Z`));
}
