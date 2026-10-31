// Numbers in words for generated copy (§11.2 ops/lead-time-words: “three”–“sixty”, never typed) and plurals (§10.7).
const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

export function numberInWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99)
    throw new Error(`numberInWords supports 0–99, got ${n}`);
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? t : `${t}-${ONES[n % 10]}`;
}

/** “five days” from ops/lead-time-days. */
export function leadTimeWords(days: number): string {
  return `${numberInWords(days)} ${days === 1 ? "day" : "days"}`;
}

/** “1 cake” / “3 cakes”, “1 more minute” / “4 more minutes”. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Characters as the customer sees them (§5.1): emoji and accented letters count once. */
export function countCharacters(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [
      ...new Intl.Segmenter("en-GB", { granularity: "grapheme" }).segment(
        text.normalize("NFC"),
      ),
    ].length;
  }
  return [...text.normalize("NFC")].length;
}
