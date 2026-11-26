import { eq } from "drizzle-orm";
import { connect, databaseUrl } from "@/db/client";
import { storedFiles } from "@/db/schema";

/**
 * GET /media/{key} (§0.8): public cake media kept in the database when no Blob store is connected (development and
 * previews). Only the public folder (cakes/); a key is never reused, so the copy may be cached for a year.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join("/");
  if (!key.startsWith("cakes/") || key.includes("..") || !databaseUrl())
    return new Response("Not found", { status: 404 });
  const { db, close } = connect();
  try {
    const [row] = await db
      .select({ data: storedFiles.data, type: storedFiles.contentType })
      .from(storedFiles)
      .where(eq(storedFiles.key, key));
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(row.data), {
      headers: {
        "Content-Type": row.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } finally {
    await close();
  }
}
