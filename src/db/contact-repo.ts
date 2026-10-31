// Contact messages and the per-connection send limit (§7.4, §10.9, §10.10).
import { createHash } from "node:crypto";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { CONTACT, type ContactMessage } from "@/lib/contact";
import type { connect } from "./client";
import { contactMessages, formSends } from "./schema";

type Db = ReturnType<typeof connect>["db"];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** The connection as a salted hash: the address itself is never stored (§10.10). */
export function connectionKey(
  ip: string,
  salt = process.env.RATE_LIMIT_SALT ?? "",
): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Counts this send against the limit of the form (5 per hour per connection, §10.9). Returns false — and records
 * nothing — when the limit is already reached.
 */
export async function takeFormSend(
  db: Db,
  form: string,
  connection: string,
  now = new Date(),
  perHour: number = CONTACT.perHour,
): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(formSends)
    .where(
      and(
        eq(formSends.form, form),
        eq(formSends.connection, connection),
        gte(formSends.at, new Date(now.getTime() - HOUR)),
      ),
    );
  if (n >= perHour) return false;
  await db.insert(formSends).values({ form, connection, at: now });
  return true;
}

/** Stores the message once per form key; returns its id, or null when this form key was already sent. */
export async function saveContactMessage(
  db: Db,
  message: ContactMessage,
  formKey: string,
  page: string,
  now = new Date(),
): Promise<number | null> {
  const rows = await db
    .insert(contactMessages)
    .values({ ...message, formKey, page, createdAt: now })
    .onConflictDoNothing({ target: contactMessages.formKey })
    .returning({ id: contactMessages.id });
  return rows[0]?.id ?? null;
}

/** Whether a message with this form key has been stored (a repeated send is answered as sent). */
export async function contactFormKeyUsed(db: Db, formKey: string) {
  const rows = await db
    .select({ id: contactMessages.id })
    .from(contactMessages)
    .where(eq(contactMessages.formKey, formKey))
    .limit(1);
  return rows.length > 0;
}

/** The daily clean-up (§12): messages older than 30 days, and send counts older than a day. */
export async function purgeContactMessages(db: Db, now = new Date()) {
  const deleted = await db
    .delete(contactMessages)
    .where(
      lt(
        contactMessages.createdAt,
        new Date(now.getTime() - CONTACT.keepDays * DAY),
      ),
    )
    .returning({ id: contactMessages.id });
  await db
    .delete(formSends)
    .where(lt(formSends.at, new Date(now.getTime() - DAY)));
  return deleted.length;
}
