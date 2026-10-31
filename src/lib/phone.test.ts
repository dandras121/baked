import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("§10.8 phone numbers: any UK number, or international with its country code, stored in E.164", () => {
  it.each([
    ["07884 199103", "+447884199103"],
    ["+44 7884 199103", "+447884199103"],
    ["0131 496 0000", "+441314960000"],
    ["+353 85 123 4567", "+353851234567"],
    ["00353 85 123 4567", "+353851234567"],
    ["07700 900 000", "+447700900000"], // Ofcom's example range, shown by the site itself
  ])("%s → %s", (input, e164) => expect(toE164(input)).toBe(e164));

  it.each(["", "12345", "phone me", "07700 9000"])(
    "%j is not a number",
    (input) => expect(toE164(input)).toBeNull(),
  );
});
