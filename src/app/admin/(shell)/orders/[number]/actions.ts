"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { SITE_URL } from "@/app/layout";
import { adminCancelOrder } from "@/db/admin-cancel-repo";
import { connect } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { memberForSave } from "@/lib/admin/session";
import { mailTransport } from "@/lib/mail/transport";
import { gateway } from "@/lib/payments";

/** Without Stripe keys the refund is recorded as failed and Money flags it (§9.5). */
const PAYMENTS_OFF = {
  refund: async () => ({ ok: false as const, error: "Payments are not switched on" }),
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
