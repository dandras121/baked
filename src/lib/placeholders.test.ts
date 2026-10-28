import { describe, expect, it } from "vitest";
import {
  listInWords,
  placeholdersIn,
  placeholderValues,
  renderTemplate,
} from "./placeholders";
import { INITIAL_SETTINGS } from "./settings";

const values = placeholderValues(INITIAL_SETTINGS);

describe("§11.8 templates inside text", () => {
  it("fills business facts from Settings", () => {
    expect(
      renderTemplate("Call me on {phone} or e-mail {email}.", values),
    ).toBe("Call me on +44 7884 199103 or e-mail info@bakedbylinda.co.uk.");
    expect(
      renderTemplate(
        "{trading_name} is run by {legal_name} in {town}.",
        values,
      ),
    ).toBe("Baked by Linda is run by Linda Dávid-Vágvölgyi in Winchburgh.");
  });
  it("money and words are generated, never typed", () => {
    expect(values.delivery_charge).toBe("Free");
    expect(values.second_attempt_fee).toBe("£15");
    expect(values.bespoke_minimum).toBe("£160");
    expect(values.lead_time_words).toBe("five days");
    expect(values.bespoke_lead_time_words).toBe("three to four weeks");
  });
  it("§11.1 a delivery charge above £0 shows as money", () => {
    expect(
      placeholderValues({ ...INITIAL_SETTINGS, deliveryChargePence: 750 })
        .delivery_charge,
    ).toBe("£7.50");
  });
  it("an unknown placeholder is refused, so a typo never reaches a customer", () => {
    expect(() => renderTemplate("Call {phnoe}", values)).toThrow(
      "Unknown placeholder {phnoe}",
    );
  });
  it("lists the placeholders a text uses", () => {
    expect(placeholdersIn("{phone} and {email}")).toEqual(["phone", "email"]);
  });
  it("lists in words: “a, b and c”", () => {
    expect(listInWords(["nuts", "milk", "soya"])).toBe("nuts, milk and soya");
    expect(listInWords(["milk"])).toBe("milk");
  });
  it("every placeholder has a value", () => {
    for (const v of Object.values(values)) expect(v).not.toBe("");
  });
});
