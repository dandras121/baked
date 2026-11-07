// Settings → Emails (§11.5). The admin screen arrives with 9.16; until then the defaults hold and /dev/emails can
// set the Google Place ID for testing.
import { eq } from "drizzle-orm";
import type { connect } from "./client";
import { mailSettings } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** Appendix A.3 (`962:9141`): the default “A year later” note. */
export const DEFAULT_YEAR_NOTE =
  "If there is another one coming up, I would love to be part of it — and it does not have to be the same one.";

export type MailSettings = typeof mailSettings.$inferSelect;

export async function readMailSettings(db: Db): Promise<MailSettings> {
  const [row] = await db
    .select()
    .from(mailSettings)
    .where(eq(mailSettings.id, 1));
  if (row) return row;
  await db
    .insert(mailSettings)
    .values({ id: 1, yearNote: DEFAULT_YEAR_NOTE })
    .onConflictDoNothing();
  const [made] = await db
    .select()
    .from(mailSettings)
    .where(eq(mailSettings.id, 1));
  return made;
}

/** Changes some switches or texts; turning e-mail 5 on starts its “since” afresh (nothing goes late). */
export async function updateMailSettings(
  db: Db,
  patch: Partial<Omit<MailSettings, "id" | "updatedAt" | "yearLaterSince">>,
  now = new Date(),
) {
  const before = await readMailSettings(db);
  await db
    .update(mailSettings)
    .set({
      ...patch,
      ...(patch.yearLater && !before.yearLater ? { yearLaterSince: now } : {}),
      updatedAt: now,
    })
    .where(eq(mailSettings.id, 1));
}

/** The review link of e-mails 1, 5 and 18 and the status page (§8.1 e-mail 18); null without a Place ID. */
export const reviewLink = (placeId: string | null | undefined) =>
  placeId?.trim()
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId.trim())}`
    : null;
