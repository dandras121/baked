import { describe, expect, it } from "vitest";
import {
  DETAILS_COPY,
  detailsDone,
  kitchenHelper,
  mobileE164,
  validateDetails,
  type DetailsInput,
} from "./details";

const ok: DetailsInput = {
  name: "Mairi Sinclair",
  email: "mairi@example.co.uk",
  phone: "07700 900 000",
  cakeFor: "Mairi's 30th",
  note: "",
  consent: false,
  terms: true,
  marketing: false,
};

describe("§5.3 phone: a mobile, UK or with its country code, stored in E.164", () => {
  it("UK mobiles in any spacing", () => {
    expect(mobileE164("07700 900 000")).toBe("+447700900000");
    expect(mobileE164("+44 7911 123456")).toBe("+447911123456");
  });
  it("international with the country code", () => {
    expect(mobileE164("+353 85 123 4567")).toBe("+353851234567");
    expect(mobileE164("+36 30 123 4567")).toBe("+36301234567");
    expect(mobileE164("0036 30 123 4567")).toBe("+36301234567");
  });
  it("not a UK landline, not too short, not without a country code", () => {
    expect(mobileE164("0131 496 0000")).toBeNull();
    expect(mobileE164("+44 131 496 0000")).toBeNull();
    expect(mobileE164("0770")).toBeNull();
    expect(mobileE164("")).toBeNull();
  });
});

describe("§5.3 the checks on Continue", () => {
  it("a complete form passes", () => {
    expect(validateDetails(ok)).toEqual({});
  });
  it("empty name, bad e-mail, short phone, no terms", () => {
    expect(
      validateDetails({
        ...ok,
        name: "",
        email: "mairi@",
        phone: "0770",
        terms: false,
      }),
    ).toEqual({
      name: DETAILS_COPY.nameMissing,
      email: DETAILS_COPY.emailInvalid,
      phone: DETAILS_COPY.phone,
      terms: DETAILS_COPY.termsMissing,
    });
  });
  it("name 2–80, who-for and note limits", () => {
    expect(validateDetails({ ...ok, name: "M" }).name).toBe(
      DETAILS_COPY.nameShort,
    );
    expect(validateDetails({ ...ok, name: "M".repeat(81) }).name).toBe(
      DETAILS_COPY.nameLong,
    );
    expect(validateDetails({ ...ok, cakeFor: "x".repeat(81) }).cakeFor).toBe(
      DETAILS_COPY.cakeForLong,
    );
    expect(
      validateDetails({ ...ok, note: "x".repeat(401), consent: true }).note,
    ).toBe(DETAILS_COPY.noteLong(401));
  });
  it("D16: an allergy note needs the consent tick; no note, no tick needed", () => {
    expect(
      validateDetails({ ...ok, note: "One guest cannot have nuts." }).consent,
    ).toBe(DETAILS_COPY.consentMissing);
    expect(
      validateDetails({
        ...ok,
        note: "One guest cannot have nuts.",
        consent: true,
      }),
    ).toEqual({});
    expect(validateDetails({ ...ok, note: "   ", consent: false })).toEqual({});
  });
});

describe("step 3 done, the kitchen helper", () => {
  it("needs name, e-mail, phone and the accepted terms", () => {
    const d = {
      customerName: "Mairi",
      email: "m@e.co",
      phoneE164: "+447700900000",
      termsAcceptedAt: new Date(),
    };
    expect(detailsDone(d)).toBe(true);
    expect(detailsDone({ ...d, termsAcceptedAt: null })).toBe(false);
    expect(detailsDone({ ...d, phoneE164: null })).toBe(false);
  });
  it("names the kitchen list from Settings", () => {
    expect(kitchenHelper(["tree nuts", "soya", "sesame"])).toBe(
      "I will always tell you what is in the cake, but I cannot promise a kitchen free of tree nuts, soya and sesame.",
    );
    expect(kitchenHelper([])).toBe(
      "I will always tell you what is in the cake.",
    );
  });
});
