import { describe, expect, it } from "vitest";
import {
  barLine,
  collectionText,
  handoverCharge,
  deliveryAreaText,
  handoverErrors,
  handoverRow,
  HANDOVER_COPY,
  inDistricts,
  isUkPostcode,
  normalisePostcode,
  outwardCode,
} from "./handover";

const DISTRICTS = "EH1–EH42, EH47–EH55";
const ok = {
  handover: "delivery",
  address: "48 Preston Road",
  town: "Linlithgow",
  postcode: "eh49 6hh",
  window: "morning",
};

describe("§5.2 postcode", () => {
  it("is normalised to upper case with one space", () => {
    expect(normalisePostcode(" eh52  6sz ")).toBe("EH52 6SZ");
    expect(normalisePostcode("eh526sz")).toBe("EH52 6SZ");
  });
  it("UK format", () => {
    for (const p of ["EH52 6SZ", "eh1 1aa", "SW1A 1AA", "G2 3AB", "M1 1AE"])
      expect(isUkPostcode(p)).toBe(true);
    for (const p of ["EH52", "12345", "EH52 66Z", ""])
      expect(isUkPostcode(p)).toBe(false);
    expect(outwardCode("eh49 6hh")).toBe("EH49");
  });
});

describe("§11.1 postcode districts", () => {
  it("a district in a range, inclusive; other letters or numbers outside", () => {
    expect(inDistricts("EH1", DISTRICTS)).toBe(true);
    expect(inDistricts("EH42", DISTRICTS)).toBe(true);
    expect(inDistricts("EH43", DISTRICTS)).toBe(false);
    expect(inDistricts("EH46", DISTRICTS)).toBe(false);
    expect(inDistricts("EH47", DISTRICTS)).toBe(true);
    expect(inDistricts("EH55", DISTRICTS)).toBe(true);
    expect(inDistricts("EH56", DISTRICTS)).toBe(false);
    expect(inDistricts("G2", DISTRICTS)).toBe(false);
  });
  it("single districts and a plain hyphen work too", () => {
    expect(inDistricts("KY11", "EH1-EH9, KY11")).toBe(true);
    expect(inDistricts("EH5", "EH1-EH9")).toBe(true);
  });
});

describe("§5.2 the checks on Continue", () => {
  it("delivery needs the address, town, a postcode in the area and a window", () => {
    expect(handoverErrors(ok, DISTRICTS)).toEqual({});
    expect(
      handoverErrors(
        { ...ok, address: "x", town: "", postcode: "nope", window: "" },
        DISTRICTS,
      ),
    ).toEqual({
      address: HANDOVER_COPY.address,
      town: HANDOVER_COPY.town,
      postcode: HANDOVER_COPY.postcode,
      window: HANDOVER_COPY.window,
    });
    expect(
      handoverErrors({ ...ok, postcode: "G2 3AB" }, DISTRICTS).postcode,
    ).toBe("outside");
  });
  it("collection asks for nothing more; no choice asks for one", () => {
    expect(
      handoverErrors(
        { ...ok, handover: "collection", address: "", postcode: "" },
        DISTRICTS,
      ),
    ).toEqual({});
    expect(handoverErrors({ ...ok, handover: "" }, DISTRICTS)).toEqual({
      handover: HANDOVER_COPY.handover,
    });
  });
  it("the notice names the outward code and the area", () => {
    expect(HANDOVER_COPY.outsideTitle("G2", "Edinburgh & the Lothians")).toBe(
      "I do not deliver to G2 — it is outside Edinburgh & the Lothians.",
    );
  });
});

describe("§5.2 copy from Settings", () => {
  it("the delivery area and the collection line are templates", () => {
    expect(deliveryAreaText(0, "Edinburgh & the Lothians")).toBe(
      "Free across Edinburgh & the Lothians.",
    );
    expect(deliveryAreaText(800, "Edinburgh & the Lothians")).toBe(
      "£8 across Edinburgh & the Lothians.",
    );
    expect(collectionText("20 Church View, Winchburgh")).toBe(
      "20 Church View, Winchburgh — free, at a time we agree",
    );
  });
  it("the summary's handover row", () => {
    expect(handoverRow("delivery", "morning", 0)).toEqual({
      label: "Delivery · morning",
      value: "Free",
    });
    expect(handoverRow("delivery", "evening", 800)).toEqual({
      label: "Delivery · evening",
      value: "£8",
    });
    expect(handoverRow("collection", null, 800)).toEqual({
      label: "Collection time",
      value: "Agreed with Linda",
    });
  });
  it("the charge joins the total for delivery only; the phone bar line", () => {
    expect(handoverCharge("delivery", 800)).toBe(800);
    expect(handoverCharge("collection", 800)).toBe(0);
    expect(handoverCharge(null, 800)).toBe(0);
    expect(barLine(1, null, 0)).toBe("1 cake · delivery free");
    expect(barLine(2, "collection", 800)).toBe("2 cakes · collection free");
    expect(barLine(3, "delivery", 800)).toBe("3 cakes · delivery £8");
  });
});
