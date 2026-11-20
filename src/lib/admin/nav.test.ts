import { describe, expect, it } from "vitest";
import { activeKey, activeTab, navFor } from "./nav";
import { conflictLine } from "./versions";

describe("admin places (§9.1)", () => {
  it("an Owner sees every place in the drawn order; a Helper Today and Orders", () => {
    expect(navFor("owner").map((n) => n.label)).toEqual([
      "Today",
      "Orders",
      "Money",
      "Enquiries",
      "Cakes",
      "Availability",
      "Content",
      "Gallery",
      "Google reviews",
      "Emails",
      "Settings",
      "Team",
    ]);
    expect(navFor("helper").map((n) => n.label)).toEqual(["Today", "Orders"]);
  });

  it("the active item is the screen or its parent; the phone tab follows it, else More", () => {
    expect(activeKey("/admin/orders/BBL-2026-0147/change")).toBe("orders");
    expect(activeKey("/admin/complaints/BBL-2026-C-0001")).toBe("enquiries");
    expect(activeKey("/admin/testimonials")).toBe("reviews");
    expect(activeTab("/admin/orders/new")).toBe("orders");
    expect(activeTab("/admin/cakes/12")).toBe("cakes");
    expect(activeTab("/admin/money")).toBe("more");
    expect(activeTab("/admin/more")).toBe("more");
  });
});

describe("two people at once (§9.1)", () => {
  it("says who changed it and when", () => {
    const at = new Date("2026-11-20T10:42:00Z");
    expect(conflictLine("member:Fiona", at)).toBe(
      "Fiona changed this at 10:42 — here is the new version",
    );
    expect(conflictLine("customer", at)).toBe(
      "The customer changed this at 10:42 — here is the new version",
    );
    expect(conflictLine("payment", at)).toBe(
      "A payment updated this at 10:42 — here is the new version",
    );
    expect(conflictLine("site", at)).toBe(
      "The site updated this at 10:42 — here is the new version",
    );
  });
});
