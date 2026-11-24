"use server";

import { revalidatePath } from "next/cache";
import { connect } from "@/db/client";
import {
  dismissNoOrder,
  keepDueFee,
  refundDueFee,
  retryRefund,
} from "@/db/money-flags-repo";
import { checkedDay } from "@/db/today-actions-repo";
import { memberForSave } from "@/lib/admin/session";
import { gateway } from "@/lib/payments";

export type FlagOutcome = { kind: "saved" | "failed" | "signed-out" | "gone" };

const PAYMENTS_OFF = {
  refund: async () => ({
    ok: false as const,
    error: "Payments are not switched on",
  }),
};

/** One Money flag action (§9.9, Owner); the screen is drawn again after it. */
async function act(
  run: (
    db: ReturnType<typeof connect>["db"],
    by: string,
  ) => Promise<boolean | string>,
): Promise<FlagOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const r = await run(db, member.name);
    revalidatePath("/admin", "layout");
    if (r === true || r === "refunded") return { kind: "saved" };
    if (r === "failed") return { kind: "failed" };
    return { kind: "gone" };
  } catch (e) {
    console.error("money flag", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

export async function dismissNoOrderAction(alertId: number) {
  return act((db, by) => dismissNoOrder(db, alertId, by));
}

export async function retryRefundAction(refundId: number) {
  return act((db, by) =>
    retryRefund(db, gateway() ?? PAYMENTS_OFF, refundId, by),
  );
}

export async function checkedDayAction(orderId: number) {
  return act((db, by) => checkedDay(db, orderId, by));
}

export async function refundFeeAction(attemptId: number) {
  return act((db, by) =>
    refundDueFee(db, gateway() ?? PAYMENTS_OFF, attemptId, by),
  );
}

export async function keepFeeAction(attemptId: number) {
  return act((db, by) => keepDueFee(db, attemptId, by));
}
