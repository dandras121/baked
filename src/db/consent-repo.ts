// Consent per e-mail address (§10.10, §6.10): the latest explicit event wins. The tick at an order is the order
// itself (marketing_opt_in, at confirmed_at); unsubscribes, spam complaints, deletions and Turn emails back on are
// consent_events. The unsubscribe link is one token per address (§10.5) and the address is kept only as a hash.
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { connect } from "./client";
import { consentEvents, mailAddresses, orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];
export type List = "yearly" | "thanks";

export const normalEmail = (e: string) => e.trim().toLowerCase();
export const emailHash = (e: string) =>
  createHash("sha256").update(normalEmail(e)).digest("hex");

/** The wordings stored with each event (§6.10). */
export const WORDING = {
  stop: "Stop these emails",
  back: "Turn emails back on — yearly reminder",
  thanksStop: "No more thank-you e-mails",
} as const;

/** The address's unsubscribe token, made the first time it is needed. */
export async function tokenFor(db: Db, email: string): Promise<string> {
  const hash = emailHash(email);
  await db
    .insert(mailAddresses)
    .values({ emailHash: hash, token: randomBytes(24).toString("base64url") })
    .onConflictDoNothing();
  const [row] = await db
    .select({ token: mailAddresses.token })
    .from(mailAddresses)
    .where(eq(mailAddresses.emailHash, hash));
  return row.token;
}

/** The hashed address behind a token; null for an unknown one. */
export async function hashForToken(db: Db, token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const [row] = await db
    .select({ hash: mailAddresses.emailHash })
    .from(mailAddresses)
    .where(eq(mailAddresses.token, token));
  return row?.hash ?? null;
}

export async function recordConsent(
  db: Db,
  hash: string,
  list: List,
  kind: "in" | "out",
  reason: "unsubscribe" | "back-on" | "complaint" | "deleted",
  wording: string | null,
  at = new Date(),
) {
  await db
    .insert(consentEvents)
    .values({ emailHash: hash, list, kind, reason, wording, at });
}

async function latestEvent(db: Db, hash: string, list: List) {
  const [e] = await db
    .select({ kind: consentEvents.kind, at: consentEvents.at })
    .from(consentEvents)
    .where(and(eq(consentEvents.emailHash, hash), eq(consentEvents.list, list)))
    .orderBy(desc(consentEvents.at), desc(consentEvents.id))
    .limit(1);
  return e ?? null;
}

/** The latest tick at an order for this hashed address (the address is compared as its hash). */
async function latestTick(db: Db, hash: string) {
  const [o] = await db
    .select({ at: orders.confirmedAt })
    .from(orders)
    .where(
      and(
        eq(orders.marketingOptIn, true),
        sql`encode(sha256(convert_to(lower(trim(${orders.email})), 'UTF8')), 'hex') = ${hash}`,
      ),
    )
    .orderBy(desc(orders.confirmedAt))
    .limit(1);
  return o?.at ?? null;
}

/** E-mail 5: opted in when the newest explicit event is a tick at an order or Turn emails back on. */
export async function yearlyOptedIn(db: Db, hash: string): Promise<boolean> {
  const [e, tick] = await Promise.all([
    latestEvent(db, hash, "yearly"),
    latestTick(db, hash),
  ]);
  if (!e) return tick !== null;
  if (tick && tick > e.at) return true;
  return e.kind === "in";
}

/** E-mail 18 goes unless the address chose No more thank-you e-mails (and did not turn them back on). */
export async function thanksAllowed(db: Db, hash: string): Promise<boolean> {
  const e = await latestEvent(db, hash, "thanks");
  return e?.kind !== "out";
}

/**
 * What the unsubscribe page shows for a list (§6.10): “out” after Stop these emails (J), “deleted” when the
 * customer was deleted (J without Turn emails back on, §10.5), otherwise “in”.
 */
export async function listState(
  db: Db,
  hash: string,
  list: List,
): Promise<"in" | "out" | "deleted"> {
  const [e] = await db
    .select({
      kind: consentEvents.kind,
      reason: consentEvents.reason,
      at: consentEvents.at,
    })
    .from(consentEvents)
    .where(and(eq(consentEvents.emailHash, hash), eq(consentEvents.list, list)))
    .orderBy(desc(consentEvents.at), desc(consentEvents.id))
    .limit(1);
  if (!e || e.kind === "in") return "in";
  if (e.reason === "deleted") return "deleted";
  if (list === "yearly") {
    const tick = await latestTick(db, hash);
    if (tick && tick > e.at) return "in";
  }
  return "out";
}
