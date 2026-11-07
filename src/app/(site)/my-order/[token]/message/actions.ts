"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { sendOrderMessage } from "@/db/message-repo";
import { orderForToken } from "@/db/order-link-repo";
import { mailTransport } from "@/lib/mail/transport";
import { UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";

export type MessageState = {
  message: string;
  outcome: null | "empty" | "too-long" | "limit" | "failed";
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Send message (§6.5): only with this link's unlock cookie. Kept on the order and e-mailed to Linda; then the status
 * page with “Message sent.”.
 */
export async function sendMessage(
  token: string,
  _previous: MessageState,
  form: FormData,
): Promise<MessageState> {
  const page = `/my-order/${token}`;
  if (!unlockValid(token, (await cookies()).get(UNLOCK_COOKIE)?.value))
    redirect(`${page}/message`);
  const message = String(form.get("message") ?? "");
  if (!message.trim()) return { message, outcome: "empty" };
  if (!databaseUrl()) return { message, outcome: "failed" };
  const given = String(form.get("formKey") ?? "");
  const { db, close } = connect();
  let to = "";
  try {
    const found = await orderForToken(db, token);
    if (!found?.valid) redirect(page);
    const r = await sendOrderMessage(db, {
      orderId: found.order.id,
      body: message,
      formKey: UUID.test(given) ? given : null,
    });
    if (r.kind === "missing") redirect(page);
    if (r.kind !== "sent") return { message, outcome: r.kind };
    await processMail(db, mailTransport(), SITE_URL).catch((e) =>
      console.error("message mail", e),
    );
    to = `${page}?message=${r.messageId}`;
  } catch (e) {
    // redirect() throws on purpose; anything else is a failed send (§10.8).
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("send message", e);
    return { message, outcome: "failed" };
  } finally {
    await close();
  }
  redirect(to);
}
