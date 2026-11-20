// The numbers under the More list (§9.1 Tab bar): those whose screens exist so far; the rest arrive with their
// slices (Money 8.8, Availability 9.x, Google reviews 9.x, Emails 9.x).
import { count, eq, isNotNull, and } from "drizzle-orm";
import type { connect } from "./client";
import { enquiries, faqQuestions, galleryPhotos, teamMembers } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export async function moreCounts(db: Db) {
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [waiting, questions, photos, onHome, people] = await Promise.all([
    n(
      db
        .select({ n: count() })
        .from(enquiries)
        .where(eq(enquiries.status, "new")),
    ),
    n(db.select({ n: count() }).from(faqQuestions)),
    n(db.select({ n: count() }).from(galleryPhotos)),
    n(
      db
        .select({ n: count() })
        .from(galleryPhotos)
        .where(
          and(
            eq(galleryPhotos.showing, true),
            isNotNull(galleryPhotos.homeOrder),
          ),
        ),
    ),
    n(db.select({ n: count() }).from(teamMembers)),
  ]);
  return {
    enquiries: `${waiting} waiting`,
    content: `${questions} ${questions === 1 ? "question" : "questions"}`,
    gallery: `${photos} · ${onHome} on Home`,
    team: `${people} ${people === 1 ? "person" : "people"}`,
  } as Record<string, string>;
}
