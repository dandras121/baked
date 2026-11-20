// Sign in, sessions and the first Owner (§9.2, §9.15). Codes and session ids are kept only as hashes; nothing on the
// way tells a stranger whether an address belongs to the team.
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import {
  codeHash,
  newCode,
  newSessionId,
  sessionHash,
  SIGN_IN,
  spacedCode,
} from "@/lib/admin/sign-in";
import { connectionKey } from "./contact-repo";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { ensureFirstOwner } from "./team-repo";

export { ensureFirstOwner };
import { adminSessions, formSends, signInCodes, teamMembers } from "./schema";

type Db = ReturnType<typeof connect>["db"];
export type Member = typeof teamMembers.$inferSelect;

const HOUR = 60 * 60 * 1000;
const lower = (email: string) => email.trim().toLowerCase();

async function sentWithin(db: Db, form: string, connection: string, now: Date) {
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
  return n;
}

/**
 * Send me a code (§9.2): at most 5 requests an hour per address from one connection, 10 per address in all and 20
 * per connection; over → tooMany and nothing recorded. A code goes out only to an active team member; the answer is
 * the same either way. A new code ends the earlier ones.
 */
export async function requestCode(
  db: Db,
  rawEmail: string,
  ip: string,
  now = new Date(),
): Promise<"sent" | "tooMany"> {
  await ensureFirstOwner(db);
  const email = lower(rawEmail);
  const address = connectionKey(`address:${email}`);
  const connection = connectionKey(ip);
  const pair = connectionKey(`${email}|${ip}`);
  if (
    (await sentWithin(db, "code:pair", pair, now)) >= SIGN_IN.perAddressAndIp ||
    (await sentWithin(db, "code:address", address, now)) >=
      SIGN_IN.perAddress ||
    (await sentWithin(db, "code:ip", connection, now)) >= SIGN_IN.perIp
  )
    return "tooMany";
  await db.insert(formSends).values([
    { form: "code:pair", connection: pair, at: now },
    { form: "code:address", connection: address, at: now },
    { form: "code:ip", connection, at: now },
  ]);
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.email, email), eq(teamMembers.status, "active")));
  if (!member) return "sent";
  const code = newCode();
  const [row] = await db.transaction(async (tx) => {
    await tx
      .update(signInCodes)
      .set({ endedAt: now })
      .where(
        and(eq(signInCodes.memberId, member.id), isNull(signInCodes.endedAt)),
      );
    return tx
      .insert(signInCodes)
      .values({
        memberId: member.id,
        codeHash: codeHash(member.id, code),
        createdAt: now,
        expiresAt: new Date(now.getTime() + SIGN_IN.codeMinutes * 60 * 1000),
        triesLeft: SIGN_IN.tries,
      })
      .returning({ id: signInCodes.id });
  });
  await queueMail(
    db,
    {
      key: `sign-in:${row.id}`,
      template: "alert",
      data: { kind: "sign-in-code", view: { code: spacedCode(code) } },
      to: member.email,
    },
    now,
  );
  return "sent";
}

export type CodeResult =
  | { kind: "ok"; sessionId: string; member: Member }
  | { kind: "wrong"; left: number }
  | { kind: "usedUp" }
  | { kind: "expired" };

/** The code step (§9.2): 10 minutes, 5 tries; right → a new session (a new id on every sign-in). */
export async function checkCode(
  db: Db,
  rawEmail: string,
  code: string,
  device: { name: string; place: string | null },
  now = new Date(),
): Promise<CodeResult> {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.email, lower(rawEmail)),
        eq(teamMembers.status, "active"),
      ),
    );
  if (!member) return { kind: "expired" };
  const [row] = await db
    .select()
    .from(signInCodes)
    .where(
      and(eq(signInCodes.memberId, member.id), isNull(signInCodes.endedAt)),
    )
    .orderBy(desc(signInCodes.id))
    .limit(1);
  if (!row || row.expiresAt <= now) return { kind: "expired" };
  if (row.triesLeft <= 0) return { kind: "usedUp" };
  if (row.codeHash === codeHash(member.id, code)) {
    const { id, hash } = newSessionId();
    await db.transaction(async (tx) => {
      await tx
        .update(signInCodes)
        .set({ endedAt: now })
        .where(eq(signInCodes.id, row.id));
      await tx.insert(adminSessions).values({
        idHash: hash,
        memberId: member.id,
        createdAt: now,
        expiresAt: new Date(now.getTime() + SIGN_IN.sessionDays * 24 * HOUR),
        lastUsedAt: now,
        device: device.name,
        place: device.place,
      });
    });
    return { kind: "ok", sessionId: id, member };
  }
  const left = row.triesLeft - 1;
  await db
    .update(signInCodes)
    .set({ triesLeft: left })
    .where(eq(signInCodes.id, row.id));
  return left > 0 ? { kind: "wrong", left } : { kind: "usedUp" };
}

/** The signed-in person of a cookie, or null (unknown, ended, expired, or no longer on the team). */
export async function sessionMember(
  db: Db,
  sessionId: string,
  now = new Date(),
) {
  if (!sessionId) return null;
  const [row] = await db
    .select({ session: adminSessions, member: teamMembers })
    .from(adminSessions)
    .innerJoin(teamMembers, eq(teamMembers.id, adminSessions.memberId))
    .where(eq(adminSessions.idHash, sessionHash(sessionId)));
  if (!row || row.session.expiresAt <= now || row.member.status !== "active")
    return null;
  // Last used, for Signed-in devices: written at most every five minutes.
  if (now.getTime() - row.session.lastUsedAt.getTime() > 5 * 60 * 1000)
    await db
      .update(adminSessions)
      .set({ lastUsedAt: now })
      .where(eq(adminSessions.idHash, row.session.idHash));
  return row;
}

/** Sign out: the session is deleted on the server, so it ends at once. */
export async function endSession(db: Db, sessionId: string) {
  await db
    .delete(adminSessions)
    .where(eq(adminSessions.idHash, sessionHash(sessionId)));
}
