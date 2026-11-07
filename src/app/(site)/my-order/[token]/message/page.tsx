import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LinkExpired } from "@/components/order-status/link-expired";
import { MessagePage } from "@/components/order-status/message-page";
import { OpenOrder } from "@/components/order-status/open-order";
import styles from "@/components/order-status/state.module.css";
import { connect, databaseUrl } from "@/db/client";
import { orderForToken } from "@/db/order-link-repo";
import { getSiteSettings } from "@/db/site-settings";
import { checkKind, UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { openOrder, resendLink } from "../actions";
import { sendMessage } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Message Linda",
  robots: { index: false, follow: false },
};

/** /my-order/[token]/message (§6.5): the check first when the link is not open yet; every state can message. */
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const settings = await getSiteSettings();
  const phone = settings?.phone ?? "";
  if (!databaseUrl()) redirect(`/my-order/${token}`);
  const unlocked = unlockValid(
    token,
    (await cookies()).get(UNLOCK_COOKIE)?.value,
  );
  const { db, close } = connect();
  const found = await orderForToken(db, token).finally(close);
  if (!found || !found.valid)
    return (
      <div className={styles.page}>
        <LinkExpired action={resendLink} phone={phone} />
      </div>
    );
  if (!unlocked)
    return (
      <div className={styles.page}>
        <OpenOrder
          action={openOrder.bind(null, token, "/message")}
          kind={checkKind(found.order.handover)}
          phone={phone}
        />
      </div>
    );
  return (
    <MessagePage
      token={token}
      number={found.order.number}
      businessEmail={settings?.email ?? ""}
      phone={phone}
      action={sendMessage.bind(null, token)}
    />
  );
}
