import { NextResponse } from "next/server";
import { addCakePhoto } from "@/db/cake-media-repo";
import { connect, databaseUrl } from "@/db/client";
import { memberForSave } from "@/lib/admin/session";
import { CAKE_PHOTO, PHOTO_WORDS } from "@/lib/uploads/cake-photo";

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};

/**
 * POST /api/cake-media (§9.13, Owner): one photo sent through the site, when no Blob store is connected (on Vercel this
 * way is limited to 4.5 MB a request). multipart: file, cakeId. → { media } or { words }.
 */
export async function POST(req: Request) {
  if (!databaseUrl())
    return NextResponse.json(
      { words: "Nothing was added — please try again." },
      { status: 503 },
    );
  if (!(await memberForSave("owner")))
    return NextResponse.json(
      { words: "You are signed out — sign in again. Nothing was added." },
      { status: 401, headers: NO_STORE },
    );
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { words: "Nothing was added — please try again." },
      { status: 400, headers: NO_STORE },
    );
  }
  const file = form.get("file");
  const cakeId = Number(form.get("cakeId"));
  if (!(file instanceof File) || !Number.isInteger(cakeId))
    return NextResponse.json(
      { words: "Nothing was added — please try again." },
      { status: 400, headers: NO_STORE },
    );
  if (file.size > CAKE_PHOTO.maxBytes)
    return NextResponse.json(
      { words: PHOTO_WORDS.size(file.size) },
      { status: 413, headers: NO_STORE },
    );
  const { db, close } = connect();
  try {
    const r = await addCakePhoto(
      db,
      cakeId,
      Buffer.from(await file.arrayBuffer()),
    );
    return NextResponse.json(r.ok ? { media: r.media } : { words: r.words }, {
      status: r.ok ? 200 : 400,
      headers: NO_STORE,
    });
  } catch (e) {
    console.error("cake photo", e);
    return NextResponse.json(
      { words: "Nothing was added — please try again." },
      { status: 500, headers: NO_STORE },
    );
  } finally {
    await close();
  }
}
