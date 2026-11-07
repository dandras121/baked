"use server";

import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { eq } from "drizzle-orm";
import { runDueJobs } from "@/db/jobs-repo";
import { processMail, queueMail } from "@/db/mail-repo";
import { SAMPLES } from "@/db/mail-templates";
import { updateMailSettings } from "@/db/mail-settings-repo";
import { jobRuns } from "@/db/schema";
import { londonInstant } from "@/lib/london-time";
import { mailTransport } from "@/lib/mail/transport";

/** Puts one sample into the queue and sends it at once (to the outbox outside the live site), then opens /dev/mail. */
export async function sendSample(form: FormData) {
  const s = SAMPLES[Number(form.get("sample"))] ?? SAMPLES[SAMPLES.length - 1];
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    await queueMail(db, {
      key: `dev-sample:${s.template}:${Date.now()}`,
      template: s.template,
      data: s.data,
      to: "sample@example.com",
    });
    await processMail(db, mailTransport(), SITE_URL);
  } finally {
    await close();
  }
  redirect("/dev/mail");
}

/**
 * Plays a morning (§12): the 06:00, 07:00, 08:00 and 10:00 jobs run as if it were 10:30 London time on the chosen day, and
 * what they queue is sent to the outbox at that moment. The day's earlier run is forgotten first, so it can be played
 * again; the never-twice keys still hold.
 */
export async function playMorning(form: FormData) {
  const day = String(form.get("day") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !databaseUrl()) return;
  const { db, close } = connect();
  try {
    const at = londonInstant(day, 10, 30);
    await db.delete(jobRuns).where(eq(jobRuns.day, day));
    await runDueJobs(db, at);
    await processMail(db, mailTransport(), SITE_URL, at);
  } finally {
    await close();
  }
  redirect("/dev/mail");
}

/** Settings → Emails' Google Place ID (§11.4) until the admin has it (9.6 / 9.16): the review links need it. */
export async function setPlaceId(form: FormData) {
  if (!databaseUrl()) return;
  const id = String(form.get("placeId") ?? "")
    .trim()
    .slice(0, 200);
  const { db, close } = connect();
  try {
    await updateMailSettings(db, { googlePlaceId: id || null });
  } finally {
    await close();
  }
  redirect("/dev/emails");
}
