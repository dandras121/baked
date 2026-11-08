import { connect, databaseUrl } from "@/db/client";
import { pictureRow } from "@/db/upload-repo";
import { fileStore } from "@/lib/storage";
import { pictureLinkValid, type PictureSize } from "@/lib/uploads/sign";
import { NO_STORE } from "../../shared";

/** GET /api/pictures/{id}/{thumb|file}?u&s (§10.10): a private picture, only through a valid signed link. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; size: string }> },
) {
  const { id, size } = await params;
  const q = new URL(req.url).searchParams;
  if (
    (size !== "thumb" && size !== "file") ||
    !pictureLinkValid(id, size as PictureSize, q.get("u"), q.get("s")) ||
    !databaseUrl()
  )
    return new Response("Not found", { status: 404, headers: NO_STORE });
  const { db, close } = connect();
  try {
    const row = await pictureRow(db, id);
    const data =
      row &&
      (await fileStore(db).get(size === "thumb" ? row.thumbKey : row.fileKey));
    if (!data)
      return new Response("Not found", { status: 404, headers: NO_STORE });
    return new Response(new Uint8Array(data), {
      headers: { ...NO_STORE, "Content-Type": "image/jpeg" },
    });
  } finally {
    await close();
  }
}
