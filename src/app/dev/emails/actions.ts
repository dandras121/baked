"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { eq } from "drizzle-orm";
import { runDueJobs } from "@/db/jobs-repo";
import { processMail, queueMail } from "@/db/mail-repo";
import { jobRuns } from "@/db/schema";
import { londonInstant } from "@/lib/london-time";
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
      data: { sample: true, collection: template === "collection-day" },
      to: "sample@example.com",
    });
    await processMail(db, mailTransport(), SITE_URL);
  } finally {
    await close();
  }
  redirect("/dev/mail");
}

/**
 * Plays a morning (§12): the 06:00, 07:00 and 08:00 jobs run as if it were 08:30 London time on the chosen day, and
 * what they queue is sent to the outbox at that moment. The day's earlier run is forgotten first, so it can be played
 * again; the never-twice keys still hold.
 */
export async function playMorning(form: FormData) {
  const day = String(form.get("day") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !databaseUrl()) return;
  const { db, close } = connect();
  try {
    const at = londonInstant(day, 8, 30);
    await db.delete(jobRuns).where(eq(jobRuns.day, day));
    await runDueJobs(db, at);
    await processMail(db, mailTransport(), SITE_URL, at);
  } finally {
    await close();
  }
  redirect("/dev/mail");
}
