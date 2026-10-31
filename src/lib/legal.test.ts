import { describe, expect, it } from "vitest";
import { LEGAL_SEED } from "./legal-seed";
import { fillLegal, parseInline, parseLegal, updatedLabel } from "./legal";
import { placeholderValues } from "./placeholders";
import { INITIAL_SETTINGS as S } from "./settings";

const values = placeholderValues(S);
const page = (slug: string) => LEGAL_SEED.find((p) => p.slug === slug)!;

describe("legal pages (§4.5, §11.8)", () => {
  it("sections are numbered on the page; anchors from the heading without the number", () => {
    const sections = parseLegal(page("terms").body);
    expect(sections).toHaveLength(12);
    expect(sections[0]).toMatchObject({
      number: 1,
      heading: "Who I am",
      id: "who-i-am",
    });
    expect(sections[11]).toMatchObject({ number: 12, id: "governing-law" });
  });

  it("the Cookie policy's “Changing your mind” has the fixed id", () => {
    const s = parseLegal(page("cookies").body).find(
      (x) => x.heading === "Changing your mind",
    )!;
    expect(s.id).toBe("changing-your-mind");
  });

  it("paragraphs, lists, bold and links", () => {
    const essential = parseLegal(page("cookies").body)[1];
    expect(essential.blocks.map((b) => b.kind)).toEqual(["p", "ul"]);
    expect(parseInline("a **b** [c](mailto:d) e")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " " },
      { kind: "link", text: "c", href: "mailto:d" },
      { kind: "text", text: " e" },
    ]);
  });

  it("business values come from Settings, never typed (rule 11)", () => {
    const all = LEGAL_SEED.map((p) => p.intro + p.body).join("\n");
    for (const fact of [
      S.legalName,
      S.addressLine,
      S.postcode,
      S.email,
      S.phone,
      "Winchburgh",
      "£15",
    ])
      expect(all).not.toContain(fact);
    const terms = fillLegal(page("terms").body, values);
    expect(terms).toContain(
      `${S.tradingName} is the trading name of ${S.legalName}`,
    );
    expect(terms).toContain(`collect it from ${S.town} the same day`);
    expect(fillLegal(page("allergens").body, values)).toMatch(
      /\nNuts, cereals containing gluten/,
    );
  });

  it("Appendix A.1 corrections are in the seed", () => {
    const all = LEGAL_SEED.map((p) => p.body).join("\n");
    expect(all).not.toMatch(/48 hours/);
    expect(all).toContain("until 23:59 two days before your date");
    expect(page("accessibility").body).not.toContain("a quote");
    expect(page("cookies").body).not.toContain(
      "disappears when you close the browser",
    );
    expect(all).not.toMatch(
      /label that comes with the cake|written sheet comes with the cake/,
    );
  });

  it("“Last updated” reads D MONTH YYYY", () => {
    expect(updatedLabel("2026-08-24")).toBe("24 August 2026");
  });
});
