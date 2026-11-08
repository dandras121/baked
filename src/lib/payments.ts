// Payments behind a small adapter (CLAUDE.md §7): Stripe in test mode when its secret key is set; a fake for tests.
import Stripe from "stripe";

export type Intent = {
  id: string;
  clientSecret: string;
  amountPence: number;
  status: string;
  /** What Stripe took (0 until it succeeded). */
  amountReceivedPence: number;
  /** `metadata.kind` (§10.6): only `checkout` confirms an order. */
  kind: string | null;
  /** `metadata.draft_id`: the draft this PaymentIntent pays for. */
  draftId: string | null;
  /** `metadata.change_id`: a customer's size-up (kind `change`, §6.4). */
  changeId?: number | null;
  /** `metadata.attempt_id`: a redelivery fee (kind `redelivery`, §6.8). */
  attemptId?: number | null;
};

export type Gateway = {
  /** One PaymentIntent per draft: the idempotency key `create-{draft id}` makes a repeat return the same one. */
  create(draftId: string, amountPence: number): Promise<Intent>;
  retrieve(id: string): Promise<Intent>;
  updateAmount(id: string, amountPence: number): Promise<Intent>;
  /** At confirmation: the order number into metadata.order and the description (§10.6), so Stripe shows it. */
  setOrder(id: string, number: string): Promise<void>;
  /** Every PaymentIntent created since this time (the reconciliation job, §12). */
  listSince(since: Date): Promise<Intent[]>;
  /**
   * Money back on a PaymentIntent (§10.6). The key makes a repeat return the same refund. A failure is returned, not
   * thrown, so the caller can record it (§6.4 “Refund failed — try again”).
   */
  refund(
    paymentIntentId: string,
    amountPence: number,
    key: string,
  ): Promise<Refunded>;
  /** The payment for a customer's change (§6.4, metadata kind `change`): one per change (idempotency key). */
  createForChange(
    changeId: number,
    orderNumber: string,
    amountPence: number,
  ): Promise<Intent>;
  /** The redelivery fee (§6.8, metadata kind `redelivery`): one per delivery attempt (idempotency key). */
  createForRedelivery(
    attemptId: number,
    orderNumber: string,
    amountPence: number,
  ): Promise<Intent>;
  /** Stops a payment still in progress (Collect chosen meanwhile, §6.8). A finished one is left as it is. */
  cancel(id: string): Promise<void>;
};

export type Refunded =
  | { ok: true; id: string; status: "succeeded" | "pending" }
  | { ok: false; error: string };

const fromStripe = (pi: Stripe.PaymentIntent): Intent => ({
  id: pi.id,
  clientSecret: pi.client_secret ?? "",
  amountPence: pi.amount,
  status: pi.status,
  amountReceivedPence: pi.amount_received ?? 0,
  kind: pi.metadata?.kind ?? null,
  draftId: pi.metadata?.draft_id ?? null,
  changeId: pi.metadata?.change_id ? Number(pi.metadata.change_id) : null,
  attemptId: pi.metadata?.attempt_id ? Number(pi.metadata.attempt_id) : null,
});

function stripeGateway(secret: string): Gateway {
  const stripe = new Stripe(secret);
  return {
    async create(draftId, amountPence) {
      return fromStripe(
        await stripe.paymentIntents.create(
          {
            amount: amountPence,
            currency: "gbp",
            // Cards only (§5.4): Apple Pay and Google Pay are card wallets; no Link, Klarna or bank redirects.
            allowed_payment_method_types: ["card"],
            // metadata.order is the draft id until confirmation, then the order number (§10.6).
            metadata: { kind: "checkout", draft_id: draftId, order: draftId },
            description: `Baked by Linda draft ${draftId}`,
          },
          { idempotencyKey: `create-${draftId}` },
        ),
      );
    },
    async retrieve(id) {
      return fromStripe(await stripe.paymentIntents.retrieve(id));
    },
    async updateAmount(id, amountPence) {
      return fromStripe(
        await stripe.paymentIntents.update(id, { amount: amountPence }),
      );
    },
    async setOrder(id, number) {
      await stripe.paymentIntents.update(id, {
        metadata: { order: number },
        description: `Baked by Linda order ${number}`,
      });
    },
    async createForChange(changeId, orderNumber, amountPence) {
      return fromStripe(
        await stripe.paymentIntents.create(
          {
            amount: amountPence,
            currency: "gbp",
            allowed_payment_method_types: ["card"],
            metadata: {
              kind: "change",
              change_id: String(changeId),
              order: orderNumber,
            },
            description: `Baked by Linda order ${orderNumber} — change`,
          },
          { idempotencyKey: `change-${changeId}` },
        ),
      );
    },
    async createForRedelivery(attemptId, orderNumber, amountPence) {
      return fromStripe(
        await stripe.paymentIntents.create(
          {
            amount: amountPence,
            currency: "gbp",
            allowed_payment_method_types: ["card"],
            metadata: {
              kind: "redelivery",
              attempt_id: String(attemptId),
              order: orderNumber,
            },
            description: `Baked by Linda order ${orderNumber} — redelivery`,
          },
          { idempotencyKey: `redelivery-${attemptId}` },
        ),
      );
    },
    async cancel(id) {
      try {
        await stripe.paymentIntents.cancel(id);
      } catch {
        // Already succeeded or cancelled: nothing to stop.
      }
    },
    async refund(paymentIntentId, amountPence, key) {
      try {
        const r = await stripe.refunds.create(
          { payment_intent: paymentIntentId, amount: amountPence },
          { idempotencyKey: `refund-${key}` },
        );
        if (r.status === "failed" || r.status === "canceled")
          return { ok: false, error: r.failure_reason ?? r.status };
        return {
          ok: true,
          id: r.id,
          status: r.status === "succeeded" ? "succeeded" : "pending",
        };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    async listSince(since) {
      const out: Intent[] = [];
      for await (const pi of stripe.paymentIntents.list({
        created: { gte: Math.floor(since.getTime() / 1000) },
        limit: 100,
      }))
        out.push(fromStripe(pi));
      return out;
    },
  };
}

/** In memory, for tests (BBL_PAYMENTS=fake): the same idempotency as Stripe's. */
const fakes = new Map<string, Intent>();
const fakeGateway: Gateway = {
  async create(draftId, amountPence) {
    const id = `pi_fake_${draftId.replace(/-/g, "").slice(0, 16)}`;
    if (!fakes.has(id))
      fakes.set(id, {
        id,
        clientSecret: `${id}_secret`,
        amountPence,
        status: "requires_payment_method",
        amountReceivedPence: 0,
        kind: "checkout",
        draftId,
      });
    return fakes.get(id)!;
  },
  async retrieve(id) {
    // A fake made by another server process (tests run several): still waiting for a payment method.
    return (
      fakes.get(id) ?? {
        id,
        clientSecret: `${id}_secret`,
        amountPence: 0,
        status: "requires_payment_method",
        amountReceivedPence: 0,
        kind: "checkout",
        draftId: null,
      }
    );
  },
  async updateAmount(id, amountPence) {
    const i = { ...(await fakeGateway.retrieve(id)), amountPence };
    fakes.set(id, i);
    return i;
  },
  async setOrder() {},
  async listSince() {
    return [...fakes.values()];
  },
  async createForChange(changeId, _orderNumber, amountPence) {
    const id = `pi_fake_change_${changeId}`;
    if (!fakes.has(id))
      fakes.set(id, {
        id,
        clientSecret: `${id}_secret`,
        amountPence,
        status: "requires_payment_method",
        amountReceivedPence: 0,
        kind: "change",
        draftId: null,
        changeId,
      });
    return fakes.get(id)!;
  },
  async createForRedelivery(attemptId, _orderNumber, amountPence) {
    const id = `pi_fake_redelivery_${attemptId}`;
    if (!fakes.has(id))
      fakes.set(id, {
        id,
        clientSecret: `${id}_secret`,
        amountPence,
        status: "requires_payment_method",
        amountReceivedPence: 0,
        kind: "redelivery",
        draftId: null,
        attemptId,
      });
    return fakes.get(id)!;
  },
  async cancel(id) {
    const i = fakes.get(id);
    if (i && i.status !== "succeeded")
      fakes.set(id, { ...i, status: "canceled" });
  },
  async refund(_paymentIntentId, _amountPence, key) {
    // A refund on the fake Stripe always goes through (the database tests try failures with their own gateway).
    return { ok: true, id: `re_fake_${key}`, status: "succeeded" };
  },
};

/** Tests only: what the fake Stripe says about a PaymentIntent (e.g. that it succeeded). */
export function setFakeIntent(id: string, patch: Partial<Intent>) {
  const i = fakes.get(id);
  if (i) fakes.set(id, { ...i, ...patch });
}

/**
 * A webhook event, only when its `Stripe-Signature` matches the endpoint's secret (§10.6); null otherwise. Checking
 * the signature needs no network call.
 */
export function verifiedEvent(
  body: string,
  signature: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
): Stripe.Event | null {
  if (!signature || !secret) return null;
  try {
    return Stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return null;
  }
}

/** The gateway, or null when payments are not switched on (no key): step 4 then says so. */
export function gateway(): Gateway | null {
  if (process.env.BBL_PAYMENTS === "fake") return fakeGateway;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Never live keys before launch (CLAUDE.md §3: test mode only until “indulhat”).
  if (!key.startsWith("sk_test_") && process.env.BBL_ALLOW_LIVE !== "1")
    throw new Error("Only Stripe test keys are allowed before launch");
  return stripeGateway(key);
}

export const PUBLISHABLE_KEY = () =>
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
