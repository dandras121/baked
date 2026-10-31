// Cakes (SITE-FLOWS §9.13, §5.8, §11.3): the rules every cake keeps, whoever saves it (the seed now, the admin in
// 9.1), and the allergen wording (§9.13, Decided 2026-10-17).
import type { Allergen, Occasion } from "./constants";

export type OptionType = "choice" | "choices" | "text" | "yesno";

export type SizeInput = { serves: number; tiers: number; pricePence: number };

export type AllergenSet = {
  allergens: Allergen[];
  glutenKinds?: string;
  nutKinds?: string;
  alsoContains?: string;
};

export type ChoiceInput = AllergenSet & { label: string; pricePence: number };

export type OptionInput = {
  type: OptionType;
  label: string;
  help?: string;
  required?: boolean;
  minPicks?: number;
  maxPicks?: number;
  maxLength?: number;
  choices: ChoiceInput[];
};

export type CakeInput = AllergenSet & {
  name: string;
  whatItIs: string;
  flavour: string;
  categories: Occasion[];
  offerInscription?: boolean;
  visible: boolean;
  sizes: SizeInput[];
  options?: OptionInput[];
};

export const CAKE_LIMITS = {
  nameMin: 2,
  nameMax: 60,
  whatItIsMax: 300,
  flavourMax: 60,
  servesMin: 1,
  servesMax: 500,
  priceMinPence: 100,
  priceMaxPence: 500_000,
  options: 6,
  choices: 10,
  optionLabelMax: 40,
  optionHelpMax: 120,
  addOnMaxPence: 100_000,
  textMaxLength: 200,
  alsoContainsMax: 120,
  photos: 8,
  videos: 2,
} as const;

/** “From £…” on cards: the smallest size price, without options (§11.3, §5.8). */
export function fromPricePence(sizes: { pricePence: number }[]): number | null {
  return sizes.length ? Math.min(...sizes.map((s) => s.pricePence)) : null;
}

/** Sizes are kept sorted by serves (§9.13). */
export function sortSizes<T extends { serves: number }>(sizes: T[]): T[] {
  return [...sizes].sort((a, b) => a.serves - b.serves);
}

const between = (n: number, lo: number, hi: number) =>
  Number.isInteger(n) && n >= lo && n <= hi;

function allergenProblems(where: string, a: AllergenSet): string[] {
  const out: string[] = [];
  if (
    a.allergens.includes("cereals containing gluten") &&
    !a.glutenKinds?.trim()
  )
    out.push(`${where}: name the cereals containing gluten`);
  if (a.allergens.includes("nuts") && !a.nutKinds?.trim())
    out.push(`${where}: name the tree nuts`);
  if ((a.alsoContains ?? "").length > CAKE_LIMITS.alsoContainsMax)
    out.push(`${where}: “Also contains” is longer than 120`);
  return out;
}

/** Everything that keeps a cake from being saved (§9.13, §5.8); empty when it is fine. */
export function cakeProblems(c: CakeInput): string[] {
  const L = CAKE_LIMITS;
  const out: string[] = [];
  const name = c.name.trim();
  if (name.length < L.nameMin || name.length > L.nameMax)
    out.push("name: 2–60");
  if (!c.whatItIs.trim() || c.whatItIs.length > L.whatItIsMax)
    out.push("what it is: required, max 300");
  if (!c.flavour.trim() || c.flavour.length > L.flavourMax)
    out.push("flavour: required, max 60");
  if (c.sizes.length === 0) out.push("sizes: at least one");
  const serves = c.sizes.map((s) => s.serves);
  if (new Set(serves).size !== serves.length)
    out.push("sizes: two with the same serves");
  for (const s of c.sizes) {
    if (!between(s.serves, L.servesMin, L.servesMax))
      out.push("sizes: serves 1–500");
    if (!between(s.tiers, 1, 10)) out.push("sizes: tiers 1–10");
    if (!between(s.pricePence, L.priceMinPence, L.priceMaxPence))
      out.push("sizes: price £1–£5,000");
  }
  out.push(...allergenProblems("cake", c));
  const options = c.options ?? [];
  if (options.length > L.options) out.push("options: up to 6");
  for (const o of options) {
    const where = `option “${o.label}”`;
    if (!o.label.trim() || o.label.length > L.optionLabelMax)
      out.push(`${where}: label 1–40`);
    if ((o.help ?? "").length > L.optionHelpMax)
      out.push(`${where}: help line max 120`);
    if (o.choices.length > L.choices) out.push(`${where}: up to 10 choices`);
    if (o.type === "text" && o.choices.length)
      out.push(`${where}: a Text option has no choices`);
    if (o.type === "text" && !between(o.maxLength ?? 40, 1, L.textMaxLength))
      out.push(`${where}: max length 1–200`);
    if (o.type === "yesno" && o.choices.length !== 1)
      out.push(`${where}: a Yes/no has exactly one tick`);
    if ((o.type === "choice" || o.type === "choices") && o.choices.length === 0)
      out.push(`${where}: at least one choice`);
    if (o.type === "choices") {
      const min = o.minPicks ?? 0;
      const max = o.maxPicks ?? o.choices.length;
      if (!between(min, 0, 10) || !between(max, 0, 10) || min > max)
        out.push(`${where}: min / max picks 0–10`);
    }
    for (const ch of o.choices) {
      if (!ch.label.trim() || ch.label.length > L.optionLabelMax)
        out.push(`${where}: choice label 1–40`);
      if (!between(ch.pricePence, 0, L.addOnMaxPence))
        out.push(`${where}: add-on £0–£1,000`);
      out.push(...allergenProblems(`${where} · ${ch.label}`, ch));
    }
  }
  return out;
}

/** “gluten (wheat)”, “tree nuts (almonds)”, “eggs” … (§9.13, Decided 2026-10-17). */
export function allergenLabel(a: Allergen, set: AllergenSet): string {
  if (a === "cereals containing gluten")
    return set.glutenKinds?.trim()
      ? `gluten (${set.glutenKinds.trim()})`
      : "gluten";
  if (a === "nuts")
    return set.nutKinds?.trim()
      ? `tree nuts (${set.nutKinds.trim()})`
      : "tree nuts";
  return a;
}
