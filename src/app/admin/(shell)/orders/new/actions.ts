"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { SITE_URL } from "@/app/layout";
import { addOrder, dayInfo } from "@/db/add-order-repo";
import { connect } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import {
  checkAddOrder,
  type AddOrderForm,
  type DayInfo,
} from "@/lib/admin/add-order";
import { memberForSave } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";
import { mailTransport } from "@/lib/mail/transport";

/** The day's count under the date (§9.6): Owner only. */
export async function dayInfoAction(date: string): Promise<DayInfo | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!(await memberForSave("owner"))) return null;
  const { db, close } = connect();
  try {
    return await dayInfo(db, date);
  } finally {
    await close();
  }
}

export type AddOutcome =
  | { kind: "saved"; number: string }
  | { kind: "invalid"; errors: Partial<Record<keyof AddOrderForm, string>> }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Save the order (§9.6): checked again on the server, saved, e-mail 1 on its way. */
export async function addOrderAction(form: AddOrderForm): Promise<AddOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const checked = checkAddOrder(form, londonDate(new Date()));
  if (!checked.value) return { kind: "invalid", errors: checked.errors };
  const { db, close } = connect();
  try {
    const number = await addOrder(db, checked.value, member.name);
    after(async () => {
      const c = connect();
      try {
        await processMail(c.db, mailTransport(), SITE_URL);
      } catch (e) {
        console.error("add order mail", e);
      } finally {
        await c.close();
      }
    });
    revalidatePath("/admin", "layout");
    return { kind: "saved", number };
  } catch (e) {
    console.error("add order", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}
