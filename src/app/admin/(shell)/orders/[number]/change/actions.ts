"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { SITE_URL } from "@/app/layout";
import { dayInfo } from "@/db/add-order-repo";
import {
  cancelWaitingChange,
  changeOrder,
  type CakeEdits,
} from "@/db/admin-change-repo";
import { connect } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { editManualOrder, type EditResult } from "@/db/edit-order-repo";
import { orders } from "@/db/schema";
import { checkAddOrder, type AddOrderForm } from "@/lib/admin/add-order";
import type { DayInfo } from "@/lib/admin/add-order";
import { checkChange, type ChangeForm } from "@/lib/admin/change-order";
import { memberForSave } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";
import { mailTransport } from "@/lib/mail/transport";
import { gateway } from "@/lib/payments";
import { eq } from "drizzle-orm";

const PAYMENTS_OFF = {
  refund: async () => ({
    ok: false as const,
    error: "Payments are not switched on",
  }),
  cancel: async () => {},
};

/** The day's count for a move (§9.7): the order's own cakes do not count against the new day. Both roles. */
export async function changeDayInfoAction(
  orderId: number,
  date: string,
): Promise<DayInfo | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(await memberForSave()))
    return null;
  const { db, close } = connect();
  try {
    return await dayInfo(db, date, new Date(), orderId);
  } finally {
    await close();
  }
}

export type ChangeOutcome =
  | { kind: "saved"; emailed: boolean; refundOk: boolean }
  | { kind: "invalid"; errors: Partial<Record<keyof ChangeForm, string>> }
  | { kind: "conflict"; line: string }
  | { kind: "owner-only"; warnings: string[] }
  | { kind: "waiting"; pence: number }
  | { kind: "busy" }
  | { kind: "invalid-cakes"; errors: Record<number, string> }
  | { kind: "nothing" }
  | { kind: "closed" }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Save changes (§9.7): checked again here; both roles (a Helper cannot book a full or closed day). */
export async function changeOrderAction(
  orderId: number,
  version: number,
  form: ChangeForm,
  cakes: CakeEdits = {},
): Promise<ChangeOutcome> {
  const member = await memberForSave();
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!o) return { kind: "closed" };
    const checked = checkChange(
      form,
      { ...o, date: String(o.date), earliestDate: String(o.earliestDate) },
      londonDate(new Date()),
    );
    if (!checked.value) return { kind: "invalid", errors: checked.errors };
    const r = await changeOrder(db, gateway() ?? PAYMENTS_OFF, {
      cakes,
      orderId,
      seenVersion: version,
      by: member.name,
      owner: member.role === "owner",
      value: checked.value,
    });
    if (r.kind === "saved" || r.kind === "waiting")
      after(async () => {
        const c = connect();
        try {
          await processMail(c.db, mailTransport(), SITE_URL);
        } catch (e) {
          console.error("change mail", e);
        } finally {
          await c.close();
        }
      });
    // Only a save refreshes the screens: a refusal keeps the form as typed, with its line.
    if (r.kind === "saved" || r.kind === "waiting")
      revalidatePath("/admin", "layout");
    return r.kind === "invalid"
      ? { kind: "invalid-cakes", errors: r.errors }
      : r;
  } catch (e) {
    console.error("change order", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** Cancel this change (§9.7, Owner): withdraws its payment link; no e-mail. */
export async function cancelWaitingChangeAction(
  orderId: number,
): Promise<{ kind: "done" | "signed-out" | "failed" }> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    await cancelWaitingChange(
      db,
      gateway() ?? PAYMENTS_OFF,
      orderId,
      member.name,
    );
    revalidatePath("/admin", "layout");
    return { kind: "done" };
  } catch (e) {
    console.error("cancel waiting change", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

export type EditOutcome =
  | Exclude<EditResult, { kind: "saved" }>
  | { kind: "saved"; emailed: boolean; refundOk: boolean; handPence: number }
  | { kind: "invalid"; errors: Partial<Record<keyof AddOrderForm, string>> }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Edit the order (§9.7, manual orders): both roles; a total below what was paid asks first (confirmRefund). */
export async function editOrderAction(
  orderId: number,
  version: number,
  form: AddOrderForm,
  confirmRefund = false,
): Promise<EditOutcome> {
  const member = await memberForSave();
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!o) return { kind: "closed" };
    const checked = checkAddOrder(
      { ...form, paid: "0" },
      londonDate(new Date()),
      String(o.date),
    );
    if (!checked.value) return { kind: "invalid", errors: checked.errors };
    const r = await editManualOrder(db, gateway() ?? PAYMENTS_OFF, {
      orderId,
      seenVersion: version,
      by: member.name,
      owner: member.role === "owner",
      value: checked.value,
      confirmRefund,
    });
    if (r.kind === "saved")
      after(async () => {
        const c = connect();
        try {
          await processMail(c.db, mailTransport(), SITE_URL);
        } catch (e) {
          console.error("edit mail", e);
        } finally {
          await c.close();
        }
      });
    // Only a save refreshes the screens: the refund question keeps the form as typed.
    if (r.kind === "saved") revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.error("edit order", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}
