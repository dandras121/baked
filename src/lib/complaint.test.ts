import { describe, expect, it } from "vitest";
import {
  cleanComplaint,
  complaintErrors,
  complaintSummary,
  EMPTY_COMPLAINT,
  tidyOrderNumber,
} from "./complaint";

const ok = {
  ...EMPTY_COMPLAINT,
  name: "Alan Doyle",
  email: "alan.doyle@example.co.uk",
  body: "The bottom tier arrived cracked.",
};

describe("complaints (§7.5)", () => {
  it("tidies an order number loosely, and keeps anything else as typed", () => {
    expect(tidyOrderNumber(" bbl 2026 147 ")).toBe("BBL-2026-0147");
    expect(tidyOrderNumber("2026-0284")).toBe("BBL-2026-0284");
    expect(tidyOrderNumber("BBL-2026-0284")).toBe("BBL-2026-0284");
    expect(tidyOrderNumber("the one from June")).toBe("the one from June");
    expect(tidyOrderNumber("")).toBe("");
  });

  it("needs a name, an e-mail and what's wrong (400 at most); the order number is optional", () => {
    expect(complaintErrors(ok)).toEqual({});
    expect(complaintErrors(EMPTY_COMPLAINT)).toEqual({
      name: "Please tell me your name.",
      email: "Please give your email address so I can answer you.",
      body: "Please tell me what went wrong.",
    });
    expect(complaintErrors({ ...ok, body: "x".repeat(401) }).body).toBe(
      "401 of 400 characters — a little too long. Please shorten it, or email me.",
    );
    expect(
      complaintErrors({ ...ok, orderNumber: "x".repeat(41) }),
    ).toHaveProperty("orderNumber");
  });

  it("keeps only a drawn What would help pill", () => {
    expect(cleanComplaint({ ...ok, wanted: "Partial refund" }).wanted).toBe(
      "Partial refund",
    );
    expect(cleanComplaint({ ...ok, wanted: "A free holiday" }).wanted).toBe("");
    expect(cleanComplaint({ name: 3 }).name).toBe("");
  });

  it("the sent line: reference, matched order, the first 60 characters", () => {
    expect(
      complaintSummary({
        reference: "BBL-2026-C-0004",
        matchedOrder: "BBL-2026-0147",
        body: "The bottom tier arrived cracked across the icing and one of the sugar flowers had snapped off in transit.",
      }),
    ).toBe(
      "BBL-2026-C-0004 · order BBL-2026-0147 · The bottom tier arrived cracked across the icing and one of…",
    );
    expect(
      complaintSummary({
        reference: "BBL-2026-C-0005",
        matchedOrder: null,
        body: "Too sweet.",
      }),
    ).toBe("BBL-2026-C-0005 · Too sweet.");
  });
});
