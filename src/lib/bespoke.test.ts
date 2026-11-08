import { describe, expect, it } from "vitest";
import {
  budgets,
  cleanEnquiry,
  dateAnswer,
  dateRange,
  dateWarning,
  EMPTY_ENQUIRY,
  hardErrors,
  longDate,
  missing,
  missingHeading,
  needsConsent,
  toggleDietary,
} from "./bespoke";

const today = "2026-11-08";
const full = {
  ...EMPTY_ENQUIRY,
  occasion: "Birthday",
  date: "2027-03-20",
  servings: "20 – 40",
  area: "Edinburgh",
  budget: "£250 – 400",
  finish: "Buttercream",
  flavour: "Vanilla",
  name: "Mairi Sinclair",
  email: "mairi@example.co.uk",
};

describe("bespoke enquiry (§7.1)", () => {
  it("budget: the first band starts at the minimum, hidden from £250", () => {
    expect(budgets(16000)[0]).toBe("£160 – 250");
    expect(budgets(25000)[0]).toBe("£250 – 400");
  });

  it("dietary: None clears the others, any other clears None; consent for anything but None", () => {
    expect(toggleDietary(["No nuts", "Vegan"], "None")).toEqual(["None"]);
    expect(toggleDietary(["None"], "Vegan")).toEqual(["Vegan"]);
    expect(toggleDietary(["Vegan"], "Vegan")).toEqual([]);
    expect(needsConsent(["None"])).toBe(false);
    expect(needsConsent(["No nuts"])).toBe(true);
  });

  it("dates: tomorrow to 24 months; the lead-time warning inside three weeks", () => {
    expect(dateRange(today)).toEqual({ min: "2026-11-09", max: "2028-11-08" });
    expect(
      dateWarning({ date: "2026-11-17", occasion: "Birthday" }, today, 3),
    ).toEqual({
      line: "That is nine days away — very soon for a bespoke cake. You can still send it; I will tell you within 24 hours whether I can fit it in.",
      wedding: false,
    });
    expect(
      dateWarning({ date: "2026-11-29", occasion: "Birthday" }, today, 3),
    ).toBeNull();
    expect(dateWarning({ date: "", occasion: "Wedding" }, today, 3)).toBeNull();
  });

  it("weddings: inside six months the month line; inside three weeks the lead line worded for a wedding", () => {
    expect(
      dateWarning({ date: "2027-04-14", occasion: "Wedding" }, today, 3)?.line,
    ).toBe(
      "That is five months away — weddings are usually booked about six months ahead.",
    );
    expect(
      dateWarning({ date: "2027-05-08", occasion: "Wedding" }, today, 3),
    ).toBeNull();
    expect(
      dateWarning({ date: "2026-11-20", occasion: "Wedding" }, today, 3)?.line,
    ).toMatch(/^That is twelve days away — very soon for a wedding cake\./);
    expect(
      dateWarning({ date: "2026-12-01", occasion: "Wedding" }, today, 3)?.line,
    ).toMatch(/^That is one month away/);
  });

  it("missing answers: the soft ones only, e-mail when only a phone was given", () => {
    expect(missing(full)).toEqual([]);
    expect(
      missing({ ...full, servings: "", date: "", flexible: true }),
    ).toEqual(["servings"]);
    expect(missing({ ...full, email: "", phone: "07700 900 000" })).toEqual([
      "email",
    ]);
    expect(missingHeading(1)).toBe("One thing still needs you");
    expect(missingHeading(2)).toBe("Two things still need you");
  });

  it("never skipped: name, a way to reach you, the phone for a call, the consent", () => {
    expect(hardErrors(full, today)).toEqual({});
    expect(hardErrors({ ...full, name: "M" }, today).name).toBeDefined();
    expect(hardErrors({ ...full, email: "" }, today).contact).toBeDefined();
    expect(
      hardErrors({ ...full, email: "", phone: "07700 900 000" }, today),
    ).toEqual({});
    expect(hardErrors({ ...full, callMe: true }, today).phone).toBe(
      "Add a phone number so I can ring you",
    );
    expect(
      hardErrors({ ...full, dietary: ["Vegan"] }, today).dietaryConsent,
    ).toBeDefined();
    expect(
      hardErrors({ ...full, dietary: ["Vegan"], dietaryConsent: true }, today),
    ).toEqual({});
    expect(
      hardErrors({ ...full, date: "2026-11-08" }, today).date,
    ).toBeDefined();
    expect(
      hardErrors({ ...full, anything: "x".repeat(1001) }, today).anything,
    ).toBeDefined();
  });

  it("only the drawn pills are kept; the date reads as stored", () => {
    const c = cleanEnquiry(
      {
        occasion: "Hack",
        dietary: ["Vegan", "Spam", "None"],
        servings: "20 – 40",
      },
      16000,
    );
    expect(c.occasion).toBe("");
    expect(c.dietary).toEqual(["None"]);
    expect(c.servings).toBe("20 – 40");
    expect(longDate("2027-06-20", today)).toBe("Sunday 20 June 2027");
    expect(dateAnswer({ date: "", flexible: true }, today)).toBe(
      "Flexible — no date yet",
    );
    expect(dateAnswer({ date: "2027-06-20", flexible: true }, today)).toBe(
      "Sunday 20 June 2027 · flexible",
    );
    expect(dateAnswer({ date: "", flexible: false }, today)).toBe(
      "Not answered",
    );
  });
});
