"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { SITE_URL } from "@/app/layout";
import { adminCancelOrder } from "@/db/admin-cancel-repo";
import {
  cancelPayLink,
  sendPayLink,
  type SendResult,
} from "@/db/admin-pay-link-repo";
import { connect } from "@/db/client";
import {
  handToGiveBack,
  recordHandPayment,
  recordHandRefund,
  removeHandPayment,
} from "@/db/hand-money-repo";
import { moneyByOrder } from "@/db/money-repo";
import { orders } from "@/db/schema";
import { processMail } from "@/db/mail-repo";
import {
  deliveredAfterAll,
  recordTheirChoice,
  type MissedResult,
  type TheirChoice,
} from "@/db/missed-admin-repo";
import { checkHand, tooMuch, type HandForm } from "@/lib/admin/hand-money";
import { LINK_PURPOSES, type LinkPurpose } from "@/lib/admin/pay-link";
import { memberForSave } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";
import { mailTransport } from "@/lib/mail/transport";
import { eq } from "drizzle-orm";
import { gateway } from "@/lib/payments";

/** Without Stripe keys the refund (and a stop of a fee payment) is recorded as failed and Money flags it (§9.5). */
const PAYMENTS_OFF = {
  refund: async () => ({
    ok: false as const,
    error: "Payments are not switched on",
  }),
  cancel: async () => {},
};

export type CancelOutcome =
  | { kind: "cancelled"; refundOk: boolean }
  | { kind: "conflict"; line: string }
  | { kind: "already" }
  | { kind: "locked" }
  | { kind: "amount"; paidPence: number }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Cancel the order (§9.5, Owner): the version the page was drawn from, Linda's amount. */
export async function cancelOrderAction(
  orderId: number,
  seenVersion: number,
  amountPence: number,
): Promise<CancelOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const r = await adminCancelOrder(db, gateway() ?? PAYMENTS_OFF, {
      orderId,
      seenVersion,
      amountPence,
      by: member.name,
    });
    if (r.kind === "cancelled") {
      after(async () => {
        const c = connect();
        try {
          await processMail(c.db, mailTransport(), SITE_URL);
        } catch (e) {
          console.error("cancel mail", e);
        } finally {
          await c.close();
        }
      });
    }
    revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.error("admin cancel", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

export type MissedOutcome =
  MissedResult | { kind: "signed-out" } | { kind: "failed" };

async function missedSave(
  role: "any" | "owner",
  run: (
    db: ReturnType<typeof connect>["db"],
    by: string,
    owner: boolean,
  ) => Promise<MissedResult>,
): Promise<MissedOutcome> {
  const member = await memberForSave(role);
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const r = await run(db, member.name, member.role === "owner");
    revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.error("missed delivery", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** Delivered after all (§9.5): both roles. */
export async function deliveredAfterAllAction(
  orderId: number,
  seenVersion: number,
) {
  return missedSave("any", (db, by, owner) =>
    deliveredAfterAll(db, gateway() ?? PAYMENTS_OFF, {
      orderId,
      seenVersion,
      by,
      owner,
    }),
  );
}

/** Record their choice (§9.5): Owner. */
export async function recordChoiceAction(
  orderId: number,
  seenVersion: number,
  choice: TheirChoice,
) {
  return missedSave("owner", (db, by) =>
    recordTheirChoice(db, gateway() ?? PAYMENTS_OFF, {
      orderId,
      seenVersion,
      by,
      choice,
    }),
  );
}

export type SendLinkOutcome =
  SendResult | { kind: "signed-out" } | { kind: "failed" };

/** Send the link (§9.8, Owner): e-mail 15 with /pay/[token], also with customer e-mails off. */
export async function sendPayLinkAction(
  orderId: number,
  purpose: LinkPurpose,
  amount: string,
): Promise<SendLinkOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  if (!LINK_PURPOSES.some((p) => p.value === purpose))
    return { kind: "failed" };
  const { db, close } = connect();
  try {
    const r = await sendPayLink(db, {
      orderId,
      purpose,
      amount,
      by: member.name,
    });
    if (r.kind === "sent") {
      after(async () => {
        const c = connect();
        try {
          await processMail(c.db, mailTransport(), SITE_URL);
        } catch (e) {
          console.error("pay link mail", e);
        } finally {
          await c.close();
        }
      });
      revalidatePath("/admin", "layout");
    }
    return r;
  } catch (e) {
    console.error("send pay link", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** Cancel this link (§9.5, Owner): the link stops working; no e-mail. */
export async function cancelPayLinkAction(
  linkId: number,
): Promise<{ kind: "saved" | "signed-out" | "failed" }> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const ok = await cancelPayLink(db, gateway() ?? PAYMENTS_OFF, {
      linkId,
      by: member.name,
    });
    revalidatePath("/admin", "layout");
    return { kind: ok ? "saved" : "failed" };
  } catch (e) {
    console.error("cancel pay link", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

export type HandOutcome =
  | { kind: "saved" }
  | { kind: "invalid"; errors: Partial<Record<keyof HandForm, string>> }
  | { kind: "closed" }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Record a payment / Record a refund given back (§9.5, Owner): checked again here; no e-mail. */
export async function recordHandAction(
  orderId: number,
  kind: "payment" | "refund",
  form: HandForm,
): Promise<HandOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!o) return { kind: "closed" };
    const max =
      kind === "payment"
        ? ((await moneyByOrder(db, [o.id])).get(o.id)?.stillToPayPence ?? 0)
        : await handToGiveBack(db, o);
    if (max <= 0) return { kind: "closed" };
    const c = checkHand(form, max, kind, londonDate(new Date()));
    if (!c.value) return { kind: "invalid", errors: c.errors };
    const input = { orderId, value: c.value, by: member.name };
    const r =
      kind === "payment"
        ? await recordHandPayment(db, gateway() ?? PAYMENTS_OFF, input)
        : await recordHandRefund(db, input);
    if (r.kind === "too-much")
      return { kind: "invalid", errors: { amount: tooMuch(kind, r.maxPence) } };
    if (r.kind === "saved") revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.error("record hand money", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** Remove a by-hand payment line (§9.5, Owner): still to pay goes back up; it stays in HISTORY. */
export async function removeHandPaymentAction(
  lineId: number,
): Promise<{ kind: "saved" | "closed" | "signed-out" | "failed" }> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const r = await removeHandPayment(db, { lineId, by: member.name });
    revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.error("remove hand payment", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}
