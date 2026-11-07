// The mail queue (§8.4): never twice (the key), retries until the deadline, every attempt rendered afresh.
import { and, desc, eq, lte } from "drizzle-orm";
import { renderEmail, type Business } from "@/lib/mail/layout";
import { afterFailure, DEFAULT_DEADLINE_MS, whenDue } from "@/lib/mail/queue";
import { mailFrom, type Transport } from "@/lib/mail/transport";
import type { connect } from "./client";
import { legalPdfFor } from "./legal-pdf-repo";
import { TEMPLATES } from "./mail-templates";
import { mailSends } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

export type QueueInput = {
  key: string;
  template: string;
  data: Record<string, unknown>;
  to: string;
  replyTo?: string | null;
  stream?: "transactional" | "broadcast";
  deadline?: Date;
};

/** Queues an e-mail once per key; “already” when that e-mail for that event exists (never twice). */
export async function queueMail(
  db: Db,
  m: QueueInput,
  now = new Date(),
): Promise<"queued" | "already"> {
  const added = await db
    .insert(mailSends)
    .values({
      key: m.key,
      template: m.template,
      data: m.data,
      to: m.to,
      replyTo: m.replyTo ?? null,
      stream: m.stream ?? "transactional",
      deadline: m.deadline ?? new Date(now.getTime() + DEFAULT_DEADLINE_MS),
      nextAttemptAt: now,
      createdAt: now,
    })
    .onConflictDoNothing({ target: mailSends.key })
    .returning({ id: mailSends.id });
  return added.length ? "queued" : "already";
}

/** The frame's facts: business facts from Settings (§11.1), the site's address, the sign-off. */
export async function mailContext(db: Db, origin: string) {
  const s = await readSettings(db);
  const business: Business = {
    tradingName: s.tradingName,
    legalName: s.legalName,
    addressLine: s.addressLine,
    town: s.town,
    postcode: s.postcode,
    phone: s.phone,
  };
  // Settings → Emails sign-off arrives with the admin (9.16).
  return { business, origin, signOff: "Linda", replyTo: s.email };
}

/** Sends what is due: each row claimed, rendered from its template now, sent, and its result recorded. */
export async function processMail(
  db: Db,
  transport: Transport,
  origin: string,
  now = new Date(),
): Promise<{ sent: number; failed: number; retrying: number }> {
  const due = await db
    .select()
    .from(mailSends)
    .where(
      and(eq(mailSends.status, "queued"), lte(mailSends.nextAttemptAt, now)),
    )
    .limit(25);
  const ctx = await mailContext(db, origin);
  const tally = { sent: 0, failed: 0, retrying: 0 };
  for (const row of due) {
    // Claim it, so a second worker running at the same moment leaves it alone.
    const claimed = await db
      .update(mailSends)
      .set({ nextAttemptAt: new Date(now.getTime() + 5 * 60_000) })
      .where(
        and(
          eq(mailSends.id, row.id),
          eq(mailSends.status, "queued"),
          lte(mailSends.nextAttemptAt, now),
        ),
      )
      .returning({ id: mailSends.id });
    if (!claimed.length) continue;
    const state = whenDue(row, now);
    if (state !== "send") {
      await db
        .update(mailSends)
        .set({ status: state })
        .where(eq(mailSends.id, row.id));
      tally.failed++;
      continue;
    }
    const template = TEMPLATES[row.template];
    const attempts = row.attempts + 1;
    if (!template) {
      await db
        .update(mailSends)
        .set({
          status: "failed",
          attempts,
          lastError: `No template ${row.template}`,
        })
        .where(eq(mailSends.id, row.id));
      tally.failed++;
      continue;
    }
    const email = await template(
      row.data as Record<string, unknown>,
      db,
      origin,
    );
    if (!email) {
      await db
        .update(mailSends)
        .set({ status: "failed", attempts, lastError: "Nothing to send" })
        .where(eq(mailSends.id, row.id));
      tally.failed++;
      continue;
    }
    const mail = renderEmail(email, ctx);
    // E-mail 1's legal PDFs, filled with the facts kept with the order (§8.1); the same file on a resend.
    const files: { name: string; base64: string; contentType: string }[] = [];
    for (const a of email.attachments ?? []) {
      const base64 = await legalPdfFor(db, a.revisionId, a.facts, a.name);
      if (base64)
        files.push({ name: a.name, base64, contentType: "application/pdf" });
    }
    const result = await transport.send({
      from: mailFrom(),
      to: row.to,
      replyTo: row.replyTo ?? ctx.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      stream: row.stream === "broadcast" ? "broadcast" : "transactional",
      attachments: files,
    });
    const rendered = {
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      transport: transport.name,
      attempts,
      attachments: files.map((f) => f.name),
    };
    if (result.ok) {
      await db
        .update(mailSends)
        .set({
          ...rendered,
          status: "sent",
          providerId: result.id,
          sentAt: now,
          lastError: null,
        })
        .where(eq(mailSends.id, row.id));
      tally.sent++;
    } else {
      const next = afterFailure(attempts, now, row.deadline, result.retry);
      await db
        .update(mailSends)
        .set({
          ...rendered,
          status: next.status,
          nextAttemptAt: next.nextAttemptAt,
          lastError: result.error,
        })
        .where(eq(mailSends.id, row.id));
      if (next.status === "failed") tally.failed++;
      else tally.retrying++;
    }
  }
  return tally;
}

/** The newest sends, for /dev/mail (development and previews: the outbox). */
export const recentMail = (db: Db, limit = 50) =>
  db.select().from(mailSends).orderBy(desc(mailSends.id)).limit(limit);
