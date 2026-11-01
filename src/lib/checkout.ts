// The checkout steps (SITE-FLOWS §5, §10.2): their order, names, addresses and which one a draft may open.

export type StepKey = "cake" | "when" | "details" | "pay";

export const STEPS: { n: 1 | 2 | 3 | 4; key: StepKey; label: string }[] = [
  { n: 1, key: "cake", label: "The cake" },
  { n: 2, key: "when", label: "When & where" },
  { n: 3, key: "details", label: "Your details" },
  { n: 4, key: "pay", label: "Payment" },
];

/** The step headings (h1, §5 Focus). */
export const STEP_TITLES: Record<Exclude<StepKey, "cake">, string> = {
  when: "Name a day.",
  details: "A few details left.",
  pay: "One last look.",
};

/** Page titles; step 4's is “Review & pay” though its stepper label is “Payment” (§5). */
export const STEP_PAGE_TITLES: Record<Exclude<StepKey, "cake">, string> = {
  when: "When & where",
  details: "Your details",
  pay: "Review & pay",
};

export const stepPath = (key: StepKey) => `/order/${key}`;

/** “Step 2 of 4” on the phone stepper (812:5951). */
export const stepCount = (n: number) => `Step ${n} of ${STEPS.length}`;

/** What the draft has done so far; later fields arrive with 4.2a–4.3. */
export type DraftProgress = {
  cakes: number;
  /** Step 2 is complete: a held date and a handover (delivery with its address and window, or collection). */
  whenDone: boolean;
  /** Step 3 is complete: the required details and the terms box. */
  detailsDone: boolean;
};

/**
 * The step a draft may open (§10.2 Opening a step directly): a later step before an earlier one is complete goes to
 * the first incomplete step.
 */
export function allowedStep(
  want: Exclude<StepKey, "cake">,
  p: DraftProgress,
): Exclude<StepKey, "cake"> {
  if (want === "details" && !p.whenDone) return "when";
  if (want === "pay") {
    if (!p.whenDone) return "when";
    if (!p.detailsDone) return "details";
  }
  return want;
}

/** Steps the customer has completed are links back (§5 Stepper); the rest are plain. */
export function stepState(
  n: number,
  current: number,
): "done" | "current" | "todo" {
  if (n < current) return "done";
  return n === current ? "current" : "todo";
}
