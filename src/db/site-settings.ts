import { cacheTag } from "next/cache";
import type { Settings } from "@/lib/settings";
import { connect } from "./client";
import { readSettings } from "./settings-repo";

/** Cache tag for the Settings row; saving Settings in the admin (slice 9.x) revalidates it. */
export const SETTINGS_TAG = "settings";

/**
 * The Settings the public pages show (§11.1), cached until Settings are saved.
 * Returns null only where no database is configured (a Vercel preview before Neon is connected):
 * everything that depends on Settings is then left out, never typed in. A configured database that
 * fails is a real error and is thrown.
 */
export async function getSiteSettings(): Promise<Settings | null> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  if (!process.env.DATABASE_URL) return null;
  const { db, close } = connect();
  try {
    return await readSettings(db);
  } finally {
    await close();
  }
}
