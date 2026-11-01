"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import { DRAFT_COOKIE, removeLine } from "@/db/draft-repo";

const STEPS = ["when", "details", "pay"];

/**
 * Remove a cake (§5.4 Line Remove): the line goes and the same step shows again — with the last cake gone, “There is
 * nothing in your order”. (Releasing or shrinking the date hold arrives with the hold, 4.2a.)
 */
export async function removeFromOrder(form: FormData): Promise<void> {
  const step = String(form.get("step") ?? "");
  const back = `/order/${STEPS.includes(step) ? step : "when"}`;
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const id = (await cookies()).get(DRAFT_COOKIE)?.value;
      await removeLine(db, id, Number(form.get("line")));
    } finally {
      await close();
    }
  }
  redirect(back);
}
