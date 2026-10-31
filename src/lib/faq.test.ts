import { describe, expect, it } from "vitest";
import { FAQ_SEED, groupFaq, questionSlug, renderAnswer } from "./faq";
import { placeholderValues } from "./placeholders";
import { INITIAL_SETTINGS } from "./settings";

const values = placeholderValues(INITIAL_SETTINGS);

describe("FAQ (§4.4, §11.8)", () => {
  it("categories in the designed order; a category without questions is left out", () => {
    const rows = FAQ_SEED.filter((r) => r.category !== "after");
    expect(groupFaq(rows, values).map((g) => g.label)).toEqual([
      "Ordering",
      "Paying",
      "Food and allergens",
      "Delivery and collection",
      "About the kitchen",
    ]);
  });

  it("questions in Linda's order inside a category", () => {
    const shuffled = [...FAQ_SEED].reverse();
    const ordering = groupFaq(shuffled, values)[0];
    expect(ordering.items.map((i) => i.question)).toEqual([
      "How far ahead should I order?",
      "Can I change my order after paying?",
      "Do you take last-minute orders?",
      "How many people will it feed?",
    ]);
  });

  it("the seed has 16 questions and every business value is a placeholder", () => {
    expect(FAQ_SEED).toHaveLength(16);
    const all = FAQ_SEED.map((r) => r.answer).join(" ");
    for (const fact of [
      "Winchburgh",
      "West Lothian Council",
      "£15",
      "Pass",
      "Edinburgh",
    ])
      expect(all).not.toContain(fact);
  });

  it("answers are filled from Settings; a placeholder at a sentence start gets a capital", () => {
    const groups = groupFaq(FAQ_SEED, values);
    const answer = (q: string) =>
      groups.flatMap((g) => g.items).find((i) => i.question === q)!.answer;
    expect(answer("How far ahead should I order?")).toMatch(
      /^Five days for a ready-made design, three to four weeks for bespoke/,
    );
    expect(answer("Where do you deliver?")).toBe(
      `${INITIAL_SETTINGS.deliveryArea} — and delivery is free.`,
    );
    expect(answer("What if I am not in?")).toContain(
      `back to ${INITIAL_SETTINGS.town}`,
    );
    expect(answer("What if I am not in?")).toContain("for £15.");
    expect(answer("Are you registered and insured?")).toContain(
      `with ${INITIAL_SETTINGS.council}, Food Hygiene Information Scheme rating ${INITIAL_SETTINGS.hygieneRating}`,
    );
    expect(answer("Can I change my order after paying?")).toContain(
      "until 23:59 two days before your date", // Appendix A, not “48 hours”
    );
  });

  it("an unknown placeholder never reaches a customer", () => {
    expect(() => renderAnswer("Ring {phon}", values)).toThrow();
  });

  it("#anchors from the question", () => {
    expect(questionSlug("Can I change my order after paying?")).toBe(
      "can-i-change-my-order-after-paying",
    );
  });
});
