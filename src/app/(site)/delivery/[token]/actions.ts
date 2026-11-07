"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { chooseCollect } from "@/db/delivery-repo";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";

/** Yes, I will collect it (§6.8): recorded once; the page then shows G (or the closed line). */
export async function collectAction(token: string) {
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const r = await chooseCollect(db, token);
      if (r.kind === "chosen")
        await processMail(db, mailTransport(), SITE_URL).catch((e) =>
          console.error("delivery choice mail", e),
        );
    } finally {
      await close();
    }
  }
  redirect(`/delivery/${token}`);
}
