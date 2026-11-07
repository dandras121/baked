import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { LinkExpired } from "@/components/order-status/link-expired";
import { OpenOrder } from "@/components/order-status/open-order";
import styles from "@/components/order-status/state.module.css";
import { connect, databaseUrl } from "@/db/client";
import { orderForToken } from "@/db/order-link-repo";
import { getSiteSettings } from "@/db/site-settings";
import { checkKind, UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { openOrder, resendLink } from "./actions";

// The status link (§6.1, §10.5): read on every visit, never prerendered; noindex and no-referrer (next.config).
export const instant = false;

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const phone = (await getSiteSettings())?.phone ?? "";
  let found: Awaited<ReturnType<typeof orderForToken>> = null;
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      found = await orderForToken(db, token);
    } finally {
      await close();
    }
  }
  // Expired, unknown or tampered: D — it reveals nothing about whether an order exists.
  if (!found || !found.valid)
    return (
      <div className={styles.page}>
        <LinkExpired action={resendLink} phone={phone} />
      </div>
    );
  const unlocked = unlockValid(
    token,
    (await cookies()).get(UNLOCK_COOKIE)?.value,
  );
  if (!unlocked)
    return (
      <div className={styles.page}>
        <OpenOrder
          action={openOrder.bind(null, token, "")}
          kind={checkKind(found.order.handover)}
          phone={phone}
        />
      </div>
    );
  // The status page itself (states A–E, the order panel) arrives with 6.1b.
  return (
    <div className={styles.page}>
      <div className={styles.narrow}>
        <h1 className={styles.title}>Your order {found.order.number}</h1>
        <p className={styles.text}>
          Opened. The full order page comes with slice 6.1b.
        </p>
      </div>
    </div>
  );
}
