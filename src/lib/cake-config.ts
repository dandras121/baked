// Configuring a cake on its page (SITE-FLOWS §5.1, §5.8): sizes, options, the live price and the allergen line.
// Pure; the cake page uses it in the browser and the order code will use it on the server.
import type { AllergenSet, OptionType } from "./cakes";
import { allergenLabel } from "./cakes";
import { UK_ALLERGENS, type Allergen } from "./constants";
import { formatPrice } from "./money";
import { listInWords } from "./placeholders";
import { numberInWords } from "./words";

export type SizeView = {
  id: number;
  serves: number;
  tiers: number;
  pricePence: number;
};

export type ChoiceView = AllergenSet & {
  id: number;
  label: string;
  pricePence: number;
};

export type OptionView = {
  id: number;
  type: OptionType;
  label: string;
  help: string;
  required: boolean;
  minPicks: number;
  maxPicks: number;
  maxLength: number;
  choices: ChoiceView[];
};

/** The customer's answers: chosen choice ids per option (Choice, Choices, Yes/no) and Text answers. */
export type Answers = {
  picks: Record<number, number[]>;
  texts: Record<number, string>;
};

export const NO_ANSWERS: Answers = { picks: {}, texts: {} };

/** “Single tier”, “Two tiers”, “Three tiers”, “{n} tiers” (§5.1 Sizes). */
export function tierWords(tiers: number): string {
  if (tiers === 1) return "Single tier";
  const n = tiers <= 99 ? numberInWords(tiers) : String(tiers);
  return `${n[0].toUpperCase()}${n.slice(1)} tiers`;
}

/** “TWO TIERS · SERVES 24”: the tier label above the name; it follows the chosen size. */
export function tierLine(size: Pick<SizeView, "tiers" | "serves">): string {
  return `${tierWords(size.tiers)} · serves ${size.serves}`.toUpperCase();
}

/** “included” at £0, otherwise “+£55” (§5.1 Sizes, §5.8 On the cake page). */
export function addOnLabel(pence: number): string {
  return pence === 0 ? "included" : `+${formatPrice(pence)}`;
}

/** Sizes in serves order; differences are always against the smallest, which shows “included”. */
export function sizeChoices(sizes: SizeView[]) {
  const sorted = [...sizes].sort((a, b) => a.serves - b.serves);
  const base = sorted[0]?.pricePence ?? 0;
  return sorted.map((s) => ({
    ...s,
    name: `Serves ${s.serves}`,
    extra: addOnLabel(s.pricePence - base),
  }));
}

/** The choices the answers point at, in Linda's order, with their option. */
export function chosen(options: OptionView[], answers: Answers) {
  return options.flatMap((o) => {
    const ids = answers.picks[o.id] ?? [];
    return o.choices
      .filter((c) => ids.includes(c.id))
      .map((c) => ({ option: o, choice: c }));
  });
}

/** Line price = size price + the add-ons of every chosen option (§5.8 Price). */
export function linePricePence(
  size: SizeView,
  options: OptionView[],
  answers: Answers,
): number {
  return chosen(options, answers).reduce(
    (sum, { choice }) => sum + choice.pricePence,
    size.pricePence,
  );
}

/** “Serves 24 · with inscription”, “… · plain” while the inscription is empty; no suffix without an inscription. */
export function priceDetail(
  size: SizeView,
  inscription: { offered: boolean; text: string },
): string {
  if (!inscription.offered) return `Serves ${size.serves}`;
  return `Serves ${size.serves} · ${inscription.text.trim() ? "with inscription" : "plain"}`;
}

/** The add-ons in the price: “Includes Fresh berries +£6 and Gift box +£8.” — empty when nothing is added. */
export function includesLine(options: OptionView[], answers: Answers): string {
  const paid = chosen(options, answers).filter(
    ({ choice }) => choice.pricePence > 0,
  );
  if (!paid.length) return "";
  const name = (o: OptionView, c: ChoiceView) =>
    o.type === "yesno" ? o.label : c.label;
  return `Includes ${listInWords(paid.map(({ option, choice }) => `${name(option, choice)} +${formatPrice(choice.pricePence)}`))}.`;
}

const ORDER = new Map(UK_ALLERGENS.map((a, i) => [a, i]));
const byLaw = (a: Allergen, b: Allergen) => ORDER.get(a)! - ORDER.get(b)!;
const kinds = (...texts: (string | undefined)[]) =>
  [
    ...new Set(
      texts
        .flatMap((t) => (t ?? "").split(","))
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].join(", ");

/** The allergens of a line: the cake's own plus those of every chosen option (§5.8 Allergens). */
export function lineAllergens(
  cake: AllergenSet,
  options: OptionView[],
  answers: Answers,
): AllergenSet {
  const picked = chosen(options, answers).map(({ choice }) => choice);
  const all = new Set<Allergen>([
    ...(cake.allergens as Allergen[]),
    ...picked.flatMap((c) => c.allergens as Allergen[]),
  ]);
  return {
    allergens: [...all].sort(byLaw),
    glutenKinds: kinds(cake.glutenKinds, ...picked.map((c) => c.glutenKinds)),
    nutKinds: kinds(cake.nutKinds, ...picked.map((c) => c.nutKinds)),
    alsoContains: [cake.alsoContains, ...picked.map((c) => c.alsoContains)]
      .map((t) => (t ?? "").trim())
      .filter(Boolean)
      .join(", "),
  };
}

/**
 * The allergen line (§5.1, Decided D17; §5.8): “Contains {allergens, then ‘Also contains’ as written}. Made in a
 * kitchen that also handles {kitchen list minus these}, so I cannot rule out traces of those.” Allergens that only a
 * chosen option brings are named after a dash: “— the soya comes with the chocolate sponge”.
 */
export function allergenLine(
  cake: AllergenSet,
  options: OptionView[],
  answers: Answers,
  kitchen: readonly Allergen[],
): string {
  const set = lineAllergens(cake, options, answers);
  const has = set.allergens as Allergen[];
  const named = has.map((a) => allergenLabel(a, set));
  const also = set.alsoContains?.trim() ?? "";
  const rest = kitchen
    .filter((a) => !has.includes(a))
    .map((a) => allergenLabel(a, { allergens: [] }));

  let first: string;
  if (!has.length && !also)
    first = "Contains none of the 14 regulated allergens.";
  else if (!has.length)
    first = `Contains none of the 14 regulated allergens. Also contains ${also}.`;
  else {
    const fromOptions = optionSources(cake, options, answers);
    first = `Contains ${listInWords(also ? [...named, also] : named)}${fromOptions}.`;
  }
  if (!rest.length) return first;
  return `${first} Made in a kitchen that ${has.length ? "also " : ""}handles ${listInWords(rest)}, so I cannot rule out traces of those.`;
}

/** “ — the soya comes with the chocolate sponge” for allergens the cake itself does not have. */
function optionSources(
  cake: AllergenSet,
  options: OptionView[],
  answers: Answers,
): string {
  const own = new Set(cake.allergens);
  const parts: string[] = [];
  for (const { option, choice } of chosen(options, answers)) {
    const added = (choice.allergens as Allergen[])
      .filter((a) => !own.has(a))
      .sort(byLaw);
    if (!added.length) continue;
    added.forEach((a) => own.add(a));
    const what = added.map((a) => allergenLabel(a, choice));
    const source =
      option.type === "choice"
        ? `${choice.label} ${option.label}`
        : option.type === "yesno"
          ? option.label
          : choice.label;
    parts.push(
      `the ${listInWords(what)} ${what.length === 1 ? "comes" : "come"} with the ${source.toLowerCase()}`,
    );
  }
  return parts.length ? ` — ${listInWords(parts)}` : "";
}

/** Choice and Choices take a pick from the pills / boxes; Yes/no is its one choice. */
export function togglePick(
  option: OptionView,
  answers: Answers,
  choiceId: number,
): Answers {
  const now = answers.picks[option.id] ?? [];
  let next: number[];
  if (option.type === "choice")
    // A required Choice keeps its pick; an optional one is cleared by tapping the selected pill again.
    next = now.includes(choiceId) ? (option.required ? now : []) : [choiceId];
  else
    next = now.includes(choiceId)
      ? now.filter((id) => id !== choiceId)
      : [...now, choiceId];
  return { ...answers, picks: { ...answers.picks, [option.id]: next } };
}
