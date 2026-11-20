// The team (§9.15). Kept apart from the mail code, so the deploy setup can create the first Owner without loading
// the e-mail templates.
import { count } from "drizzle-orm";
import { isEmail } from "@/lib/contact";
import type { connect } from "./client";
import { teamMembers } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** The first Owner (§9.15): once, while the team is empty, from ADMIN_OWNER_EMAIL and ADMIN_OWNER_NAME. */
export async function ensureFirstOwner(
  db: Db,
  env: { email?: string; name?: string } = {
    email: process.env.ADMIN_OWNER_EMAIL,
    name: process.env.ADMIN_OWNER_NAME,
  },
) {
  const email = (env.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) return false;
  const [{ n }] = await db.select({ n: count() }).from(teamMembers);
  if (n > 0) return false;
  await db
    .insert(teamMembers)
    .values({ name: env.name?.trim() || "Owner", email, role: "owner" })
    .onConflictDoNothing();
  return true;
}
