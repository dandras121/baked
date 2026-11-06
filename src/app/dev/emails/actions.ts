"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { processMail, queueMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";

/** Puts one sample into the queue and sends it at once (to the outbox outside the live site), then opens /dev/mail. */
export async function sendSample(form: FormData) {
  const template = String(form.get("template") ?? "sample");
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    await queueMail(db, {
      key: `dev-sample:${template}:${Date.now()}`,
      template,
      data: {},
      to: "sample@example.com",
    });
    await processMail(db, mailTransport(), SITE_URL);
  } finally {
    await close();
  }
  redirect("/dev/mail");
}
