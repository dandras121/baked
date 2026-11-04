import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const SECRET = "whsec_test_secret";
const signed = (payload: string, secret = SECRET) =>
  Stripe.webhooks.generateTestHeaderString({ payload, secret });

const post = (body: string, signature?: string) =>
  POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body,
      headers: signature ? { "stripe-signature": signature } : {},
    }),
  );

describe("the Stripe webhook (§10.6)", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });
  const event = (type: string) =>
    JSON.stringify({
      id: "evt_1",
      object: "event",
      type,
      data: { object: { id: "pi_1" } },
    });

  it("rejects an unsigned event and one signed with another secret", async () => {
    expect((await post(event("payment_intent.succeeded"))).status).toBe(400);
    const body = event("payment_intent.succeeded");
    expect((await post(body, signed(body, "whsec_other"))).status).toBe(400);
  });

  it("rejects a signed event whose body was changed", async () => {
    const body = event("payment_intent.succeeded");
    const sig = signed(body);
    expect((await post(body.replace("pi_1", "pi_2"), sig)).status).toBe(400);
  });

  it("answers 200 for an event it does not handle yet", async () => {
    const body = event("charge.refunded");
    const res = await post(body, signed(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      received: true,
      ignored: "charge.refunded",
    });
  });

  it("without a webhook secret nothing is accepted", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const body = event("payment_intent.succeeded");
    expect((await post(body, signed(body))).status).toBe(400);
  });
});
