import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { SITE_URL } from "@/app/layout";
import {
  applyChangePayment,
  dropChangePaymentByIntent,
} from "@/db/change-repo";
import { applyIntent } from "@/db/confirm-repo";
import { applyRedelivery } from "@/db/delivery-repo";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";
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
    const intent = await gw.retrieve(id);
    // A customer's size-up (§6.4): applied once paid; a failed one opens the order again.
    if (intent.kind === "change") {
      const done =
        event.type === "payment_intent.payment_failed"
          ? await dropChangePaymentByIntent(db, intent.id)
          : await applyChangePayment(db, gw, intent);
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.warn("[mail] after a change payment", e),
      );
      return NextResponse.json({ received: true, applied: done });
    }
    // A redelivery fee (§6.8): booked once paid; a failed payment changes nothing.
    if (intent.kind === "redelivery") {
      const done =
        event.type === "payment_intent.payment_failed"
          ? "nothing"
          : await applyRedelivery(db, gw, intent);
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.warn("[mail] after a redelivery payment", e),
      );
      return NextResponse.json({ received: true, applied: done });
    }
    const applied = await applyIntent(
      db,
      intent,
      new Date(),
      event.type === "payment_intent.payment_failed",
      gw,
    );
    // E-mail 1 goes at once (the mail job retries what fails, §8.4).
    if (applied === "confirmed")
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.warn("[mail] after confirmation", e),
      );
    return NextResponse.json({ received: true, applied });
  } finally {
    await close();
  }
}
