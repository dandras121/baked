// One cake in the order (SITE-FLOWS §5.1, §5.8): the inscription and option answers checked, and the line as the
// customer sees it. Pure; the browser checks first and the server checks again.
import type { Answers, OptionView } from "./cake-config";
import { chosen } from "./cake-config";
import { countCharacters, numberInWords } from "./words";

export const INSCRIPTION_MAX = 24;
/** An order holds at most five cakes (Decided D1, §10.4). */
export const MAX_CAKES = 5;

export const LINE_COPY = {
  tooLong: `That is a little too long — ${INSCRIPTION_MAX} characters fit on the cake.`,
  notPipeable:
    "Emoji and symbols cannot be piped — please use letters and numbers.",
  noEmoji: "Emoji cannot be used here — please use letters and numbers.",
  plainTitle: "Leave the cake plain?",
  plainText:
    "You have not written a message. That is completely fine — plenty of cakes go out plain.",
  noMessage: "No message — the cake goes out plain",
  failed:
    "The connection dropped before the cake reached your order. Check you are online and press Add to your order again.",
  gone: "This cake or size is no longer available. Reload the page to see what is on offer now.",
} as const;

/** Curly quotes made straight, NFC, trimmed; only spaces = empty (§5.1). */
export function normaliseText(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .normalize("NFC")
    .trim();
}

// Latin letters (accents included), digits, space and . , ! ? ' & - ( ) — what Linda can pipe (§5.1).
const PIPEABLE = /^[\p{Script=Latin}\p{M}0-9 .,!?'&()-]*$/u;
const EMOJI = /\p{Extended_Pictographic}/u;
const BREAK = /[\r\n\u2028\u2029]/;

/** The inscription's error, or null when it can go on the cake (empty is fine: the cake goes out plain). */
export function inscriptionError(text: string): string | null {
  const t = normaliseText(text);
  if (BREAK.test(t) || !PIPEABLE.test(t)) return LINE_COPY.notPipeable;
  if (countCharacters(t) > INSCRIPTION_MAX) return LINE_COPY.tooLong;
  return null;
}

/** Every option's error, keyed by option id (§5.8 Missing or invalid). */
export function optionErrors(
  options: OptionView[],
  answers: Answers,
): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const o of options) {
    const picks = (answers.picks[o.id] ?? []).filter((id) =>
      o.choices.some((c) => c.id === id),
    );
    const label = o.label.toLowerCase();
    if (o.type === "choice" && o.required && picks.length === 0)
      errors[o.id] = `Choose a ${label}.`;
    if (o.type === "choices") {
      if (picks.length < o.minPicks)
        errors[o.id] = `Pick at least ${o.minPicks}.`;
      else if (picks.length > o.maxPicks)
        errors[o.id] = `Pick up to ${o.maxPicks}.`;
    }
    if (o.type === "text") {
      const t = normaliseText(answers.texts[o.id] ?? "");
      if (o.required && !t) errors[o.id] = `Fill in ${label}.`;
      else if (BREAK.test(t) || EMOJI.test(t)) errors[o.id] = LINE_COPY.noEmoji;
      else if (countCharacters(t) > o.maxLength)
        errors[o.id] =
          `That is a little too long — ${o.maxLength} characters fit.`;
    }
  }
  return errors;
}

/** The answers as they are stored: picks limited to real choices, texts normalised, empty ones dropped. */
export function cleanAnswers(options: OptionView[], answers: Answers): Answers {
  const out: Answers = { picks: {}, texts: {} };
  for (const o of options) {
    const picks = (answers.picks[o.id] ?? []).filter((id) =>
      o.choices.some((c) => c.id === id),
    );
    if (o.type !== "text" && picks.length)
      out.picks[o.id] = [...new Set(picks)];
    const t = normaliseText(answers.texts[o.id] ?? "");
    if (o.type === "text" && t) out.texts[o.id] = t;
  }
  return out;
}

/**
 * The options after the size, in Linda's order (§5.8 Order line): “Sponge: Chocolate · Toppings: Fresh berries,
 * Gold leaf · Name on the topper: “Isla” · Gift box”. Unanswered optional options are left out.
 */
export function optionsLine(options: OptionView[], answers: Answers): string {
  const picked = chosen(options, answers);
  return options
    .map((o) => {
      if (o.type === "text") {
        const t = answers.texts[o.id];
        return t ? `${o.label}: “${t}”` : "";
      }
      const names = picked
        .filter((p) => p.option.id === o.id)
        .map((p) => p.choice.label);
      if (!names.length) return "";
      return o.type === "yesno" ? o.label : `${o.label}: ${names.join(", ")}`;
    })
    .filter(Boolean)
    .join(" · ");
}

/** “The Lothian · serves 24 · “Happy 30th, Mairi”” / “… · no message” (1096:9111). */
export function lineTitle(
  name: string,
  serves: number,
  inscription: { offered: boolean; text: string },
): string {
  const base = `${name} · serves ${serves}`;
  if (!inscription.offered) return base;
  return inscription.text
    ? `${base} · “${inscription.text}”`
    : `${base} · no message`;
}

/** “Five is the most one order can hold.” — the limit as a template (Appendix A, 1199:9250). */
export function capCopy(max = MAX_CAKES) {
  const n = numberInWords(max);
  const N = n[0].toUpperCase() + n.slice(1);
  const next =
    ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"][max] ??
    `${max + 1}th`;
  return {
    count: N,
    adding: `Adding a ${next}`,
    most: `${N} is the most one order can hold.`,
    why: `A ${next} cake would quietly eat most of a week, so orders stop at ${n}. Send me an enquiry instead and I'll plan it by hand.`,
  };
}
