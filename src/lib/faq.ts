// FAQ rules (§4.4, §11.8): the category order, the question anchors and the answers' placeholders.
import { renderTemplate, type Placeholder } from "./placeholders";

/** The designed order (§4.4); a category with no question is not shown. */
export const FAQ_CATEGORIES = [
  { key: "ordering", label: "Ordering" },
  { key: "paying", label: "Paying" },
  { key: "food", label: "Food and allergens" },
  { key: "delivery", label: "Delivery and collection" },
  { key: "after", label: "After it arrives" },
  { key: "kitchen", label: "About the kitchen" },
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number]["key"];

export type FaqRow = {
  category: FaqCategory;
  question: string;
  answer: string;
  position: number;
};

export type FaqItem = { slug: string; question: string; answer: string };
export type FaqGroup = { key: FaqCategory; label: string; items: FaqItem[] };

/** “Can I change my order after paying?” → “can-i-change-my-order-after-paying” (the #anchor, §4.4). */
export function questionSlug(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** An answer with its placeholders filled; a placeholder at the start of a sentence gets a capital. */
export function renderAnswer(
  answer: string,
  values: Record<Placeholder, string>,
): string {
  return renderTemplate(answer, values).replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_, before: string, letter: string) => before + letter.toUpperCase(),
  );
}

/** Rows grouped by category in the designed order, each group in Linda's order; empty groups left out. */
export function groupFaq(
  rows: FaqRow[],
  values: Record<Placeholder, string>,
): FaqGroup[] {
  const seen = new Set<string>();
  return FAQ_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    items: rows
      .filter((r) => r.category === key)
      .sort((a, b) => a.position - b.position)
      .map((r) => {
        let slug = questionSlug(r.question);
        while (seen.has(slug)) slug += "-2";
        seen.add(slug);
        return {
          slug,
          question: r.question,
          answer: renderAnswer(r.answer, values),
        };
      }),
  })).filter((g) => g.items.length > 0);
}

/**
 * The starting FAQ (§4.4 Seed content): the Figma answers, corrected by Appendix A, with every business value
 * as a placeholder (§11.8). Linda edits them in the admin (§9.12).
 */
export const FAQ_SEED: FaqRow[] = [
  {
    category: "ordering",
    position: 1,
    question: "How far ahead should I order?",
    answer:
      "{lead_time_words} for a ready-made design, {bespoke_lead_time_words} for bespoke, and six months or more for a wedding.",
  },
  {
    category: "ordering",
    position: 2,
    question: "Can I change my order after paying?",
    answer:
      "Yes, until 23:59 two days before your date. After that the cake is already being made — ring me.",
  },
  {
    category: "ordering",
    position: 3,
    question: "Do you take last-minute orders?",
    answer:
      "Sometimes. The calendar shows what is genuinely free — if your date is close, send an enquiry anyway.",
  },
  {
    category: "ordering",
    position: 4,
    question: "How many people will it feed?",
    answer:
      "Each design lists its serving count. As a rule, a single tier serves 12 to 16 and two tiers 20 to 24.",
  },
  {
    category: "paying",
    position: 1,
    question: "How do I pay?",
    answer:
      "Ready-made cakes are paid in full when you order, by card, Apple Pay or Google Pay. For bespoke cakes I send you a payment link once we have agreed the details.",
  },
  {
    category: "paying",
    position: 2,
    question: "Is a deposit needed for bespoke?",
    answer:
      "For a bespoke cake we agree the details by e-mail first. Then I send you a secure payment link — for a deposit or the full price, as we agreed.",
  },
  {
    category: "paying",
    position: 3,
    question: "What if my card is declined?",
    answer:
      "Nothing is taken, and your date stays held for whatever is left of the twenty-minute hold while you try again.",
  },
  {
    category: "food",
    position: 1,
    question: "Can you make a cake without gluten?",
    answer:
      "No. My kitchen handles wheat every week, so I cannot call a cake gluten-free or promise it is safe for coeliac disease. I can bake without gluten-containing ingredients and use separate equipment, and I will be straight about the risk that is left.",
  },
  {
    category: "food",
    position: 2,
    question: "Can you guarantee no traces?",
    answer:
      "No. My kitchen handles {kitchen_handles}, so I cannot promise a cake is free from traces. I will always be straight with you about what is safe.",
  },
  {
    category: "delivery",
    position: 1,
    question: "Where do you deliver?",
    answer: "{delivery_area} — and delivery is {delivery_charge}.",
  },
  {
    category: "delivery",
    position: 2,
    question: "Can I collect instead?",
    answer: "Yes, free, from my kitchen in {town} at a time we agree.",
  },
  {
    category: "delivery",
    position: 3,
    question: "What if I am not in?",
    answer:
      "Someone needs to be in. I wait fifteen minutes, then take the cake back to {town} — you can collect it that day free, or I can run it out again the next day for {second_attempt_fee}.",
  },
  {
    category: "after",
    position: 1,
    question: "How do I store it?",
    answer:
      "Level, cool and out of direct sun. Do not refrigerate a fresh buttercream cake unless I have told you to.",
  },
  {
    category: "after",
    position: 2,
    question: "How long does it keep?",
    answer:
      "Three days at its best, up to five for a chocolate sponge. Sponge dries once it is cut.",
  },
  {
    category: "after",
    position: 3,
    question: "Is everything on it edible?",
    answer:
      "Not always. Wires, dowels and supports are pointed out on handover and must come off before serving.",
  },
  {
    category: "kitchen",
    position: 1,
    question: "Are you registered and insured?",
    answer:
      "Yes. Registered as a food business with {council}, Food Hygiene Information Scheme rating {hygiene_rating}, Level 3 Food Hygiene certified, and covered by public liability insurance. Venues can have a copy on request.",
  },
];
