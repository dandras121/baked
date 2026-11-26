// Add or edit a cake (§9.13): the form as typed, its checks with words next to each field, and the allergen line.
import { readPounds } from "@/lib/admin/cancel";
import { UK_ALLERGENS, type Allergen, type Occasion } from "@/lib/constants";
import { allergenLabel, CAKE_LIMITS, type AllergenSet } from "@/lib/cakes";
import { formatPrice } from "@/lib/money";

export type SizeRow = {
  id: number | null;
  serves: string;
  tiers: string;
  price: string;
};

export type CakeForm = {
  name: string;
  whatItIs: string;
  flavour: string;
  sizes: SizeRow[];
  allergens: Allergen[];
  glutenKinds: string;
  nutKinds: string;
  alsoContains: string;
  categories: Occasion[];
  visible: boolean;
};

/** Add: empty, one size row, Hidden until it has a photo (§9.13). */
export const EMPTY_CAKE: CakeForm = {
  name: "",
  whatItIs: "",
  flavour: "",
  sizes: [{ id: null, serves: "", tiers: "1", price: "" }],
  allergens: [],
  glutenKinds: "",
  nutKinds: "",
  alsoContains: "",
  categories: [],
  visible: false,
};

export type CakeValue = AllergenSet & {
  name: string;
  whatItIs: string;
  flavour: string;
  sizes: {
    id: number | null;
    serves: number;
    tiers: number;
    pricePence: number;
  }[];
  allergens: Allergen[];
  categories: Occasion[];
  visible: boolean;
};

export type CakeErrors = Partial<
  Record<
    | "name"
    | "whatItIs"
    | "flavour"
    | "glutenKinds"
    | "nutKinds"
    | "alsoContains"
    | "visible"
    | "sizes",
    string
  >
> & {
  rows?: Record<number, Partial<Record<"serves" | "price", string>>>;
};

const pounds = (p: number) =>
  p % 100 ? (p / 100).toFixed(2) : String(p / 100);

export function formFromCake(
  c: AllergenSet & {
    name: string;
    whatItIs: string;
    flavour: string;
    categories: string[];
    visible: boolean;
  },
  sizes: { id: number; serves: number; tiers: number; pricePence: number }[],
): CakeForm {
  return {
    name: c.name,
    whatItIs: c.whatItIs,
    flavour: c.flavour,
    sizes: [...sizes]
      .sort((a, b) => a.serves - b.serves)
      .map((s) => ({
        id: s.id,
        serves: String(s.serves),
        tiers: String(s.tiers),
        price: `£${pounds(s.pricePence)}`,
      })),
    allergens: c.allergens,
    glutenKinds: c.glutenKinds ?? "",
    nutKinds: c.nutKinds ?? "",
    alsoContains: c.alsoContains ?? "",
    categories: c.categories as Occasion[],
    visible: c.visible,
  };
}

const whole = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

/** The checks of §9.13, with the words shown next to each field (nothing is saved while one fails). */
export function checkCakeForm(
  f: CakeForm,
): { value: CakeValue; errors: null } | { value: null; errors: CakeErrors } {
  const L = CAKE_LIMITS;
  const e: CakeErrors = {};
  const name = f.name.trim();
  if (name.length < L.nameMin || name.length > L.nameMax)
    e.name = "Type a name — 2 to 60 characters.";
  if (!f.whatItIs.trim() || f.whatItIs.length > L.whatItIsMax)
    e.whatItIs = "Say what it is — up to 300 characters.";
  if (!f.flavour.trim() || f.flavour.length > L.flavourMax)
    e.flavour = "Name the flavour — up to 60 characters.";
  if (
    f.allergens.includes("cereals containing gluten") &&
    !f.glutenKinds.trim()
  )
    e.glutenKinds = "Name which cereals, for example wheat.";
  if (f.allergens.includes("nuts") && !f.nutKinds.trim())
    e.nutKinds = "Name which nuts, for example almonds.";
  if (f.alsoContains.length > L.alsoContainsMax)
    e.alsoContains = "Up to 120 characters.";
  const rows: NonNullable<CakeErrors["rows"]> = {};
  const sizes: CakeValue["sizes"] = [];
  f.sizes.forEach((r, i) => {
    const serves = whole(r.serves);
    const price = readPounds(r.price);
    const tiers = whole(r.tiers) ?? 1;
    const re: Partial<Record<"serves" | "price", string>> = {};
    if (serves === null || serves < L.servesMin || serves > L.servesMax)
      re.serves = "Serves 1 to 500.";
    if (price === null || price < L.priceMinPence || price > L.priceMaxPence)
      re.price = "£1 to £5,000.";
    if (Object.keys(re).length) rows[i] = re;
    else sizes.push({ id: r.id, serves: serves!, tiers, pricePence: price! });
  });
  if (!f.sizes.length) e.sizes = "A cake needs at least one size.";
  const seen = new Map<number, number>();
  f.sizes.forEach((r, i) => {
    const s = whole(r.serves);
    if (s === null) return;
    if (seen.has(s))
      rows[i] = { ...rows[i], serves: `Two sizes serve ${s} — change one.` };
    else seen.set(s, i);
  });
  if (Object.keys(rows).length) e.rows = rows;
  if (Object.keys(e).length) return { value: null, errors: e };
  return {
    value: {
      name,
      whatItIs: f.whatItIs.trim(),
      flavour: f.flavour.trim(),
      sizes: sizes.sort((a, b) => a.serves - b.serves),
      allergens: UK_ALLERGENS.filter((a) => f.allergens.includes(a)),
      glutenKinds: f.allergens.includes("cereals containing gluten")
        ? f.glutenKinds.trim()
        : "",
      nutKinds: f.allergens.includes("nuts") ? f.nutKinds.trim() : "",
      alsoContains: f.alsoContains.trim(),
      categories: f.categories,
      visible: f.visible,
    },
    errors: null,
  };
}

/** The 14 as drawn in the picker (1801:13494): short names, in two columns. */
export const PICKER: { key: Allergen; label: string }[] = [
  { key: "celery", label: "Celery" },
  { key: "crustaceans", label: "Crustaceans" },
  { key: "eggs", label: "Egg" },
  { key: "fish", label: "Fish" },
  { key: "cereals containing gluten", label: "Gluten" },
  { key: "lupin", label: "Lupin" },
  { key: "milk", label: "Milk" },
  { key: "molluscs", label: "Molluscs" },
  { key: "mustard", label: "Mustard" },
  { key: "nuts", label: "Nuts" },
  { key: "peanuts", label: "Peanuts" },
  { key: "sesame", label: "Sesame" },
  { key: "soya", label: "Soya" },
  { key: "sulphites", label: "Sulphites" },
];

/** The field's line: “Gluten (wheat), eggs, milk · also: rosewater”, or “None of the 14”. */
export function allergenSummary(
  f: Pick<CakeForm, "allergens" | "glutenKinds" | "nutKinds" | "alsoContains">,
) {
  const named = UK_ALLERGENS.filter((a) => f.allergens.includes(a)).map((a) =>
    allergenLabel(a, f),
  );
  const text = named.length ? named.join(", ") : "None of the 14";
  const line = f.alsoContains.trim()
    ? `${text} · also: ${f.alsoContains.trim()}`
    : text;
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** Next to the first size: “Smallest size — the site shows “From £185”” (940:8507). */
export const smallestNote = (f: CakeForm) => {
  const prices = f.sizes
    .map((r) => readPounds(r.price))
    .filter((p): p is number => p !== null && p > 0);
  return prices.length
    ? `Smallest size — the site shows “From ${formatPrice(Math.min(...prices))}”`
    : "Smallest size — the site shows its price as “From £…”";
};
