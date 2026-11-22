import { describe, expect, it } from "vitest";
import {
  changeRows,
  checkChange,
  formFromOrder,
  newCharge,
  newEarliest,
} from "./change-order";

const o = {
  date: "2026-09-12",
  earliestDate: "2026-09-12",
  deliveryWindow: "morning",
  handover: "delivery",
  address: "48 Preston Road",
  town: "Linlithgow",
  postcode: "EH49 6HH",
  collectionTime: null,
  customerName: "Mairi Sinclair",
  email: "mairi@example.co.uk",
  phone: "07700 900 000",
};
const today = "2026-09-01";

describe("Change the order — the order's own fields (§9.7)", () => {
  it("starts from the order and finds nothing changed", () => {
    const v = checkChange(formFromOrder(o), o, today).value!;
    expect(changeRows(o, v, today)).toEqual({ rows: [], contact: [] });
  });
  it("old → new rows for the customer; name, e-mail and phone apart", () => {
    const f = {
      ...formFromOrder(o),
      date: "2026-09-19",
      window: "evening",
      phone: "07700 900 111",
      name: "Mairi Ross",
    };
    const { rows, contact } = changeRows(
      o,
      checkChange(f, o, today).value!,
      today,
    );
    expect(rows).toEqual([
      ["Date", "Saturday 12 September", "Saturday 19 September"],
      ["Window", "9am – 12pm", "4 – 7pm"],
    ]);
    expect(contact.map((c) => c[0])).toEqual(["Name", "Phone"]);
  });
  it("a switch to collection: the address goes, the phone is needed", () => {
    const f = {
      ...formFromOrder(o),
      handover: "collection" as const,
      phone: "",
    };
    expect(checkChange(f, o, today).errors.phone).toMatch(
      /A collection needs a phone/,
    );
    const v = checkChange(
      { ...f, phone: "07700 900 000", collectionTime: "12 noon" },
      o,
      today,
    ).value!;
    expect(v).toMatchObject({
      address: null,
      postcode: null,
      deliveryWindow: null,
      collectionTime: "12 noon",
    });
    expect(changeRows(o, v, today).rows).toEqual([
      ["Handover", "Delivery", "Collection"],
      ["Collection time", "Agreed with Linda", "12 noon"],
    ]);
  });
  it("the date: from today on, an unchanged past date may stay", () => {
    expect(
      checkChange({ ...formFromOrder(o), date: "2026-08-30" }, o, today).errors
        .date,
    ).toBe("Pick a day from today on.");
    expect(
      checkChange(formFromOrder(o), o, "2026-09-20").errors.date,
    ).toBeUndefined();
  });
  it("the earliest date: a later move the customer did not ask for counts from the new date (Decided 2026-10-17)", () => {
    expect(newEarliest(o, "2026-09-19", false)).toBe("2026-09-19");
    expect(newEarliest(o, "2026-09-19", true)).toBe("2026-09-12");
    expect(newEarliest(o, "2026-09-05", false)).toBe("2026-09-05");
    expect(
      newEarliest(
        { date: "2026-09-19", earliestDate: "2026-09-12" },
        "2026-09-15",
        false,
      ),
    ).toBe("2026-09-12");
  });
  it("the delivery charge follows a handover switch", () => {
    expect(
      newCharge(
        { handover: "collection", deliveryChargePence: 0 },
        "delivery",
        500,
      ),
    ).toBe(500);
    expect(
      newCharge(
        { handover: "delivery", deliveryChargePence: 400 },
        "collection",
        500,
      ),
    ).toBe(0);
    expect(
      newCharge(
        { handover: "delivery", deliveryChargePence: 400 },
        "delivery",
        500,
      ),
    ).toBe(400);
  });
});
