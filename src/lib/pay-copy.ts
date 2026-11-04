// What the customer reads when a payment does not go through (SITE-FLOWS §5.5; states 983:9181, 983:9273).

/** “, or use Apple Pay” — only the wallet the device offers; nothing when it offers none (§5.5 Declined). */
export function walletClause(w: { applePay?: boolean; googlePay?: boolean }) {
  if (w.applePay && w.googlePay) return ", or use Apple Pay or Google Pay";
  if (w.applePay) return ", or use Apple Pay";
  if (w.googlePay) return ", or use Google Pay";
  return "";
}

/** “18 more minutes” / “1 more minute”; nothing to say once the hold has run out. */
export function minutesLeft(ms: number): string | null {
  if (ms <= 0) return null;
  const n = Math.max(1, Math.ceil(ms / 60_000));
  return n === 1 ? "1 more minute" : `${n} more minutes`;
}

const held = (dateLabel: string, ms: number) => {
  const left = minutesLeft(ms);
  return left
    ? `${dateLabel} is still held for ${left}`
    : `${dateLabel} is still held`;
};

export const PAY_COPY = {
  declinedTitle: "Your bank declined the payment",
  /** “Nothing has been taken and Saturday 12 September is still held for 18 more minutes. Try another card, or use Apple Pay.” */
  declinedText: (dateLabel: string, ms: number, wallets: string) =>
    `Nothing has been taken and ${held(dateLabel, ms)}. Try another card${wallets}.`,
  callMe: (phone: string) =>
    `or call me on ${phone} and I will take it another way`,
  notConfirmedTitle: "Not confirmed",
  /** The bank check was cancelled or timed out (§5.5 G, cancel copy). */
  notConfirmedText: (dateLabel: string, ms: number) =>
    `The bank check was not completed, so nothing has been taken. ${held(dateLabel, ms)}.`,
  tryAgain: "Try again",
  anotherTab:
    "This order is being paid in another tab — changes are paused until that payment finishes.",
  heldOut:
    "Your time to pay has run out, so nothing has been taken. Pick the day again above to pay.",
  doNotClose: "Do not close this window or press back.",
};

/** Stripe's error codes that mean the bank check (3D Secure) was not completed, not a decline. */
export const isAuthenticationFailure = (code: string | undefined) =>
  code === "payment_intent_authentication_failure";
