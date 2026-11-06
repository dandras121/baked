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
};

const fromStripe = (pi: Stripe.PaymentIntent): Intent => ({
  id: pi.id,
  clientSecret: pi.client_secret ?? "",
  amountPence: pi.amount,
  status: pi.status,
  amountReceivedPence: pi.amount_received ?? 0,
  kind: pi.metadata?.kind ?? null,
  draftId: pi.metadata?.draft_id ?? null,
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
