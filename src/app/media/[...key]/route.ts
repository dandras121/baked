import { connect, databaseUrl } from "@/db/client";
import { fileStore } from "@/lib/storage";

/**
 * GET /media/{key} (§0.8): the cake photos and videos the site shows, read from the file store (Blob or the database).
 * Only the public folder (cakes/); a key is never reused, so the copy may be cached for a year (also by the CDN).
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
    const data = await fileStore(db).get(key);
    if (!data) return new Response("Not found", { status: 404 });
    const type = key.endsWith(".mp4")
      ? "video/mp4"
      : key.endsWith(".png")
        ? "image/png"
        : key.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } finally {
    await close();
  }
}
