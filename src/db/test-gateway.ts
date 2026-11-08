// Tests only: a fake Stripe that counts what it is asked and lets a test say what happened to a PaymentIntent.
import type { Gateway, Intent } from "@/lib/payments";

export function countingGateway() {
  const intents = new Map<string, Intent>();
  const calls = { create: 0, update: 0 };
  /** Refunds asked for, and whether the next one fails. */
  const refunds: {
    paymentIntentId: string;
    amountPence: number;
    key: string;
  }[] = [];
  const refundControl = { fail: false };
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
    async createForChange(changeId, _number, amountPence) {
      calls.create++;
      const id = `pi_change_${changeId}`;
      if (!intents.has(id))
        intents.set(id, {
          id,
          clientSecret: `${id}_s`,
          amountPence,
          status: "requires_payment_method",
          amountReceivedPence: 0,
          kind: "change",
          draftId: null,
          changeId,
        });
      return intents.get(id)!;
    },
    async createForRedelivery(attemptId, _number, amountPence) {
      calls.create++;
      const id = `pi_redelivery_${attemptId}`;
      if (!intents.has(id))
        intents.set(id, {
          id,
          clientSecret: `${id}_s`,
          amountPence,
          status: "requires_payment_method",
          amountReceivedPence: 0,
          kind: "redelivery",
          draftId: null,
          attemptId,
        });
      return intents.get(id)!;
    },
    async cancel(id) {
      const i = intents.get(id);
      if (i && i.status !== "succeeded")
        intents.set(id, { ...i, status: "canceled" });
    },
    async refund(paymentIntentId, amountPence, key) {
      if (refundControl.fail) return { ok: false, error: "card_closed" };
      refunds.push({ paymentIntentId, amountPence, key });
      return { ok: true, id: `re_${refunds.length}`, status: "succeeded" };
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
  return { gw, calls, intents, succeed, orderNumbers, refunds, refundControl };
}
