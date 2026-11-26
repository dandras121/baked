// The Options card (§5.8, §9.13): the four types, each option and its choices as typed, the checks and the folded line.
import { readPounds } from "@/lib/admin/cancel";
import { UK_ALLERGENS, type Allergen } from "@/lib/constants";
import { CAKE_LIMITS, type AllergenSet, type OptionType } from "@/lib/cakes";
import { formatPrice } from "@/lib/money";

export const OPTION_TYPES: { type: OptionType; name: string; hint: string }[] =
  [
    { type: "choice", name: "Choice", hint: "pick one" },
    { type: "choices", name: "Choices", hint: "tick several" },
    { type: "text", name: "Text", hint: "a short answer" },
    { type: "yesno", name: "Yes/no", hint: "one tick box" },
  ];
export const typeName = (t: OptionType) =>
  OPTION_TYPES.find((x) => x.type === t)!.name;

export type ChoiceForm = {
  id: number | null;
  label: string;
  price: string;
  allergens: Allergen[];
  glutenKinds: string;
  nutKinds: string;
  alsoContains: string;
};

export type OptionForm = {
  id: number | null;
  type: OptionType;
  label: string;
  help: string;
  required: boolean;
  minPicks: string;
  maxPicks: string;
  maxLength: string;
  /** Choice / Choices: the choices; Yes/no: its one tick (the price and allergens of ticking it). */
  choices: ChoiceForm[];
};

export const emptyChoice = (): ChoiceForm => ({
  id: null,
  label: "",
  price: "0",
  allergens: [],
  glutenKinds: "",
  nutKinds: "",
  alsoContains: "",
});

/** + Add an option: a new option of that type, open in its editor. */
export function emptyOption(type: OptionType): OptionForm {
  return {
    id: null,
    type,
    label: "",
    help: "",
    required: false,
    minPicks: "0",
    maxPicks: "10",
    maxLength: "40",
    choices: type === "text" ? [] : [emptyChoice()],
  };
}

const pounds = (p: number) =>
  p % 100 ? (p / 100).toFixed(2) : String(p / 100);

export function optionsFromCake(
  options: {
    id: number;
    type: string;
    label: string;
    help: string;
    required: boolean;
    minPicks: number;
    maxPicks: number;
    maxLength: number;
    position: number;
  }[],
  choices: (AllergenSet & {
    id: number;
    optionId: number;
    label: string;
    pricePence: number;
    position: number;
  })[],
): OptionForm[] {
  return [...options]
    .sort((a, b) => a.position - b.position)
    .map((o) => ({
      id: o.id,
      type: o.type as OptionType,
      label: o.label,
      help: o.help,
      required: o.required,
      minPicks: String(o.minPicks),
      maxPicks: String(o.maxPicks),
      maxLength: String(o.maxLength),
      choices: choices
        .filter((c) => c.optionId === o.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          id: c.id,
          label: c.label,
          price: pounds(c.pricePence),
          allergens: c.allergens,
          glutenKinds: c.glutenKinds ?? "",
          nutKinds: c.nutKinds ?? "",
          alsoContains: c.alsoContains ?? "",
        })),
    }));
}

export type OptionValue = {
  id: number | null;
  type: OptionType;
  label: string;
  help: string;
  required: boolean;
  minPicks: number;
  maxPicks: number;
  maxLength: number;
  choices: (AllergenSet & {
    id: number | null;
    label: string;
    pricePence: number;
    allergens: Allergen[];
  })[];
};

export type ChoiceErrors = Partial<
  Record<"label" | "price" | "allergens", string>
>;
export type OptionErrors = Partial<
  Record<"label" | "help" | "picks" | "maxLength" | "choices", string>
> & {
  choice?: Record<number, ChoiceErrors>;
};

const whole = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

/** The checks of §5.8 per option; the words show next to each field of the open editor. */
export function checkOptions(list: OptionForm[]): {
  values: OptionValue[];
  errors: Record<number, OptionErrors>;
} {
  const L = CAKE_LIMITS;
  const errors: Record<number, OptionErrors> = {};
  const values: OptionValue[] = [];
  list.forEach((o, i) => {
    const e: OptionErrors = {};
    const label = o.label.trim();
    if (!label || label.length > L.optionLabelMax)
      e.label = "Give the option a label — up to 40 characters.";
    if (o.help.length > L.optionHelpMax) e.help = "Up to 120 characters.";
    const min = whole(o.minPicks) ?? -1;
    const max = whole(o.maxPicks) ?? -1;
    if (
      o.type === "choices" &&
      (min < 0 || max < 0 || min > 10 || max > 10 || min > max)
    )
      e.picks = "Min and max picks are 0 to 10, and min is no more than max.";
    const maxLength = whole(o.maxLength) ?? 0;
    if (o.type === "text" && (maxLength < 1 || maxLength > L.textMaxLength))
      e.maxLength = "Max length 1 to 200.";
    if ((o.type === "choice" || o.type === "choices") && o.choices.length === 0)
      e.choices = "Add at least one choice.";
    const choiceErrors: Record<number, ChoiceErrors> = {};
    const choices: OptionValue["choices"] = [];
    const own =
      o.type === "text"
        ? []
        : o.type === "yesno"
          ? o.choices.slice(0, 1)
          : o.choices;
    own.forEach((c, j) => {
      const ce: ChoiceErrors = {};
      const cl = o.type === "yesno" ? label : c.label.trim();
      if (o.type !== "yesno" && (!cl || cl.length > L.optionLabelMax))
        ce.label = "Name the choice — up to 40 characters.";
      const price = c.price.trim() === "" ? 0 : readPounds(c.price);
      if (price === null || price > L.addOnMaxPence) ce.price = "£0 to £1,000.";
      if (
        c.allergens.includes("cereals containing gluten") &&
        !c.glutenKinds.trim()
      )
        ce.allergens = "Name which cereals, for example wheat.";
      else if (c.allergens.includes("nuts") && !c.nutKinds.trim())
        ce.allergens = "Name which nuts, for example almonds.";
      else if (c.alsoContains.length > L.alsoContainsMax)
        ce.allergens = "Also contains: up to 120 characters.";
      if (Object.keys(ce).length) choiceErrors[j] = ce;
      else
        choices.push({
          id: c.id,
          label: cl,
          pricePence: price!,
          allergens: UK_ALLERGENS.filter((a) => c.allergens.includes(a)),
          glutenKinds: c.allergens.includes("cereals containing gluten")
            ? c.glutenKinds.trim()
            : "",
          nutKinds: c.allergens.includes("nuts") ? c.nutKinds.trim() : "",
          alsoContains: c.alsoContains.trim(),
        });
    });
    if (Object.keys(choiceErrors).length) e.choice = choiceErrors;
    if (Object.keys(e).length) errors[i] = e;
    else
      values.push({
        id: o.id,
        type: o.type,
        label,
        help: o.help.trim(),
        required: o.type === "choice" || o.type === "text" ? o.required : false,
        minPicks: o.type === "choices" ? min : 0,
        maxPicks: o.type === "choices" ? max : 10,
        maxLength: o.type === "text" ? maxLength : 40,
        choices,
      });
  });
  return { values, errors };
}

/** “Allergens: Milk, Egg, Soya” or “Allergens: none” (the link on a choice row, 1713:11890). */
export function choiceAllergens(
  c: Pick<ChoiceForm, "allergens" | "alsoContains">,
) {
  const names: Record<string, string> = {
    eggs: "Egg",
    "cereals containing gluten": "Gluten",
    nuts: "Nuts",
  };
  const list = UK_ALLERGENS.filter((a) => c.allergens.includes(a)).map(
    (a) => names[a] ?? a.charAt(0).toUpperCase() + a.slice(1),
  );
  if (c.alsoContains.trim()) list.push(c.alsoContains.trim());
  return `Allergens: ${list.length ? list.join(", ") : "none"}`;
}

const plus = (s: string) => {
  const p = s.trim() === "" ? 0 : readPounds(s);
  return p === null ? "+£?" : `+${formatPrice(p)}`;
};

/** The folded line after Done (1713:11890): “required · Vanilla, Chocolate (+£0), Lemon (+£5)”. */
export function optionSummary(o: OptionForm): string {
  const min = Number(o.minPicks) || 0;
  const need =
    o.type === "choice" || o.type === "text"
      ? o.required
        ? "required"
        : "optional"
      : o.type === "choices" && min > 0
        ? `at least ${min}`
        : "optional";
  if (o.type === "text") return `${need} · max ${o.maxLength} characters`;
  if (o.type === "yesno")
    return `${plus(o.choices[0]?.price ?? "0")} · optional`;
  // Neighbours with the same add-on share it: “Vanilla, Chocolate (+£0)”.
  const parts: string[] = [];
  o.choices.forEach((c, i) => {
    const next = o.choices[i + 1];
    const name = c.label.trim() || "…";
    parts.push(
      next && plus(next.price) === plus(c.price)
        ? name
        : `${name} (${plus(c.price)})`,
    );
  });
  return `${need} · ${parts.join(", ")}`;
}
