"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { eq } from "drizzle-orm";
import {
  applyChangePayment,
  dropChangePayment,
  prepareChangePayment,
  saveChanges,
} from "@/db/change-repo";
import { orderChanges } from "@/db/schema";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { orderForToken } from "@/db/order-link-repo";
import { mailTransport } from "@/lib/mail/transport";
import { UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { gateway } from "@/lib/payments";
import type { Answers } from "@/lib/cake-config";

/** Without Stripe keys a refund cannot go: it is recorded as failed and Linda is told (§6.4). */
const PAYMENTS_OFF = {
  refund: async () => ({
    ok: false as const,
    error: "Payments are not switched on",
  }),
};

export type ChangeState = {
  outcome:
    | null
    | "stale"
    | "closed"
    | "nothing"
    | "invalid"
    | "needs-payment"
    | "locked"
    | "failed";
  errors: Record<number, string>;
};

/**
 * Save changes (§6.4): only with this link's unlock cookie; the version and the change window are checked again on
 * the server. Saved → the status page with “Your change is saved.” and e-mail 12.
 */
export async function saveChange(
  token: string,
  version: number,
  _previous: ChangeState,
  form: FormData,
): Promise<ChangeState> {
  if (!unlockValid(token, (await cookies()).get(UNLOCK_COOKIE)?.value))
    redirect(`/my-order/${token}/change`);
  if (!databaseUrl()) return { outcome: "failed", errors: {} };
  const { messages, sizes, options } = editsFrom(form);
  const { db, close } = connect();
  let changeId = 0;
  try {
    const found = await orderForToken(db, token);
    if (!found?.valid) redirect(`/my-order/${token}`);
    const r = await saveChanges(db, gateway() ?? PAYMENTS_OFF, {
      orderId: found.order.id,
      version,
      messages,
      sizes,
      options,
    });
    if (r.kind === "invalid") return { outcome: "invalid", errors: r.errors };
    if (r.kind !== "saved") return { outcome: r.kind, errors: {} };
    changeId = r.changeId;
    await processMail(db, mailTransport(), SITE_URL).catch((e) =>
      console.error("change mail", e),
    );
  } finally {
    await close();
  }
  redirect(`/my-order/${token}?saved=${changeId}`);
}

export type PrepareState =
  | { kind: "pay"; clientSecret: string; changeId: number; amountPence: number }
  | {
      kind: "error";
      outcome: ChangeState["outcome"];
      errors: Record<number, string>;
    };

/** The edits as the form sends them (message-{line}, size-{line}). */
function editsFrom(form: FormData) {
  const messages: Record<number, string> = {};
  const sizes: Record<number, number> = {};
  const options: Record<number, Answers> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("message-"))
      messages[Number(key.slice(8))] = String(value).slice(0, 100);
    if (key.startsWith("size-")) sizes[Number(key.slice(5))] = Number(value);
    if (key.startsWith("options-")) {
      const a = answersFrom(String(value));
      if (a) options[Number(key.slice(8))] = a;
    }
  }
  return { messages, sizes, options };
}

/** Option answers as the page sends them (JSON); anything malformed is ignored. */
function answersFrom(raw: string): Answers | null {
  try {
    const v = JSON.parse(raw.slice(0, 5000)) as Answers;
    const picks: Answers["picks"] = {};
    const texts: Answers["texts"] = {};
    for (const [k, ids] of Object.entries(v.picks ?? {}))
      if (Array.isArray(ids))
        picks[Number(k)] = ids.map(Number).filter(Number.isFinite);
    for (const [k, t] of Object.entries(v.texts ?? {}))
      texts[Number(k)] = String(t).slice(0, 500);
    return { picks, texts };
  } catch {
    return null;
  }
}

async function openOrder(token: string) {
  if (!unlockValid(token, (await cookies()).get(UNLOCK_COOKIE)?.value))
    return null;
  return token;
}

/**
 * Pay £… and save (§6.4), step 1: the server checks the edits, the version and the window, locks the order and makes
 * the PaymentIntent for the difference. Nothing on the order changes yet.
 */
export async function prepareChange(
  token: string,
  version: number,
  form: FormData,
): Promise<PrepareState> {
  const gw = gateway();
  if (!(await openOrder(token)) || !gw || !databaseUrl())
    return { kind: "error", outcome: "failed", errors: {} };
  const { db, close } = connect();
  try {
    const found = await orderForToken(db, token);
    if (!found?.valid) return { kind: "error", outcome: "closed", errors: {} };
    const r = await prepareChangePayment(db, gw, {
      orderId: found.order.id,
      version,
      ...editsFrom(form),
    });
    if (r.kind === "pay") return r;
    if (r.kind === "invalid")
      return { kind: "error", outcome: "invalid", errors: r.errors };
    return {
      kind: "error",
      outcome: r.kind === "no-rise" ? "stale" : r.kind,
      errors: {},
    };
  } finally {
    await close();
  }
}

/**
 * Step 2, after Stripe answered in the browser: the payment is read from Stripe; succeeded → applied (the webhook may
 * have done it already) and the order page with the banner; still processing → wait; anything else → dropped, the
 * order open again, the edits still on the page.
 */
export async function finishChange(
  token: string,
  changeId: number,
): Promise<"saved" | "processing" | "failed"> {
  const gw = gateway();
  if (!(await openOrder(token)) || !gw || !databaseUrl()) return "failed";
  const { db, close } = connect();
  let outcome: "saved" | "processing" | "failed" = "failed";
  try {
    const found = await orderForToken(db, token);
    const [c] = await db
      .select()
      .from(orderChanges)
      .where(eq(orderChanges.id, changeId));
    if (!found || !c || c.orderId !== found.order.id || !c.paymentIntentId)
      return "failed";
    const intent = await gw.retrieve(c.paymentIntentId);
    if (intent.status === "succeeded") {
      const r = await applyChangePayment(db, gw, intent);
      outcome = r === "applied" || r === "already" ? "saved" : "failed";
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.error("change mail", e),
      );
    } else if (intent.status === "processing") outcome = "processing";
    else await dropChangePayment(db, c.orderId, c.id);
  } finally {
    await close();
  }
  if (outcome === "saved") redirect(`/my-order/${token}?saved=${changeId}`);
  return outcome;
}
