"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { SITE_URL } from "@/app/layout";
import { dayInfo } from "@/db/add-order-repo";
import { changeOrderFields } from "@/db/admin-change-repo";
import { connect } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { orders } from "@/db/schema";
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
  | { kind: "needs-link"; pence: number }
  | { kind: "nothing" }
  | { kind: "closed" }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Save changes (§9.7): checked again here; both roles (a Helper cannot book a full or closed day). */
export async function changeOrderAction(
  orderId: number,
  version: number,
  form: ChangeForm,
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
    const r = await changeOrderFields(db, gateway() ?? PAYMENTS_OFF, {
      orderId,
      seenVersion: version,
      by: member.name,
      owner: member.role === "owner",
      value: checked.value,
    });
    if (r.kind === "saved")
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
    revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    console.error("change order", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}
