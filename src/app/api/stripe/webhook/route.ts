import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { applyIntent } from "@/db/confirm-repo";
import { gateway, verifiedEvent } from "@/lib/payments";

const HANDLED = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
]);

/**
 * POST /api/stripe/webhook (§10.6): only events signed with the endpoint's secret are read. The PaymentIntent is
 * read again from Stripe and its current status applied, so a replay or events out of order change nothing.
 * Refund and dispute events arrive with the phases that use them.
 */
export async function POST(req: Request) {
  const event = verifiedEvent(
    await req.text(),
    req.headers.get("stripe-signature"),
  );
  if (!event)
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  if (!HANDLED.has(event.type))
    return NextResponse.json({ received: true, ignored: event.type });
  const gw = gateway();
  if (!gw || !databaseUrl())
    // Stripe retries a failed delivery for three days; the reconciliation job catches up as well.
    return NextResponse.json({ error: "Payments are off" }, { status: 503 });
  const id = (event.data.object as { id: string }).id;
  const { db, close } = connect();
  try {
    const applied = await applyIntent(
      db,
      await gw.retrieve(id),
      new Date(),
      event.type === "payment_intent.payment_failed",
      gw,
    );
    return NextResponse.json({ received: true, applied });
  } finally {
    await close();
  }
}
