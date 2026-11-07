"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { saveMessages } from "@/db/change-repo";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { orderForToken } from "@/db/order-link-repo";
import { mailTransport } from "@/lib/mail/transport";
import { UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";

export type ChangeState = {
  outcome: null | "stale" | "closed" | "nothing" | "invalid" | "failed";
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
  const messages: Record<number, string> = {};
  for (const [key, value] of form.entries())
    if (key.startsWith("message-"))
      messages[Number(key.slice(8))] = String(value).slice(0, 100);
  const { db, close } = connect();
  let changeId = 0;
  try {
    const found = await orderForToken(db, token);
    if (!found?.valid) redirect(`/my-order/${token}`);
    const r = await saveMessages(db, {
      orderId: found.order.id,
      version,
      messages,
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
