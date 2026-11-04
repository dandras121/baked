// Payments behind a small adapter (CLAUDE.md §7): Stripe in test mode when its secret key is set; a fake for tests.
import Stripe from "stripe";

export type Intent = {
  id: string;
  clientSecret: string;
  amountPence: number;
  status: string;
};

export type Gateway = {
  /** One PaymentIntent per draft: the idempotency key `create-{draft id}` makes a repeat return the same one. */
  create(draftId: string, amountPence: number): Promise<Intent>;
  retrieve(id: string): Promise<Intent>;
  updateAmount(id: string, amountPence: number): Promise<Intent>;
};

const fromStripe = (pi: Stripe.PaymentIntent): Intent => ({
  id: pi.id,
  clientSecret: pi.client_secret ?? "",
  amountPence: pi.amount,
  status: pi.status,
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
            metadata: { kind: "checkout", draft_id: draftId },
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
      });
    return fakes.get(id)!;
  },
  async retrieve(id) {
    const i = fakes.get(id);
    if (!i) throw new Error(`No PaymentIntent ${id}`);
    return i;
  },
  async updateAmount(id, amountPence) {
    const i = { ...(await fakeGateway.retrieve(id)), amountPence };
    fakes.set(id, i);
    return i;
  },
};

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
