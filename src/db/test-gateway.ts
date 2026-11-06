// Tests only: a fake Stripe that counts what it is asked and lets a test say what happened to a PaymentIntent.
import type { Gateway, Intent } from "@/lib/payments";

export function countingGateway() {
  const intents = new Map<string, Intent>();
  const calls = { create: 0, update: 0 };
  const orderNumbers = new Map<string, string>();
  const gw: Gateway = {
    async create(draftId, amountPence) {
      calls.create++;
      const id = `pi_${draftId.slice(0, 8)}`;
      if (!intents.has(id))
        intents.set(id, {
          id,
          clientSecret: `${id}_s`,
          amountPence,
          status: "requires_payment_method",
          amountReceivedPence: 0,
          kind: "checkout",
          draftId,
        });
      return intents.get(id)!;
    },
    async retrieve(id) {
      return intents.get(id)!;
    },
    async updateAmount(id, amountPence) {
      calls.update++;
      const i = { ...intents.get(id)!, amountPence };
      intents.set(id, i);
      return i;
    },
    async setOrder(id, number) {
      orderNumbers.set(id, number);
    },
    async listSince() {
      return [...intents.values()];
    },
  };
  /** Stripe took the payment: succeeded with the amount received. */
  const succeed = (id: string, received?: number) => {
    const i = intents.get(id)!;
    intents.set(id, {
      ...i,
      status: "succeeded",
      amountReceivedPence: received ?? i.amountPence,
    });
  };
  return { gw, calls, intents, succeed, orderNumbers };
}
