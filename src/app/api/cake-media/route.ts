import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { memberForSave } from "@/lib/admin/session";
import { handleMedia, kindOf, maxBytes, tooBig } from "./handle";

/** A video is converted after the answer, within this function's time (§9.13). */
export const maxDuration = 300;

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};

/**
 * POST /api/cake-media (§9.13, Owner): one photo sent through the site, when no Blob store is connected (on Vercel this
 * way is limited to 4.5 MB a request). multipart: file, cakeId, kind (photo · video · cover), mediaId (for a cover).
 * → { media } · { poster } · { words }.
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
  const kind = kindOf(form.get("kind"));
  if (file.size > maxBytes(kind))
    return NextResponse.json(
      { words: tooBig(kind, file.size) },
      { status: 413, headers: NO_STORE },
    );
  const { db, close } = connect();
  try {
    const r = await handleMedia(db, {
      cakeId,
      kind,
      mediaId: Number(form.get("mediaId")),
      data: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json(r, {
      status: r.words ? 400 : 200,
      headers: NO_STORE,
    });
  } catch (e) {
    console.error("cake media", e);
    return NextResponse.json(
      { words: "Nothing was added — please try again." },
      { status: 500, headers: NO_STORE },
    );
  } finally {
    await close();
  }
}
