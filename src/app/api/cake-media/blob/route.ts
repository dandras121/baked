import { del, get, issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { addCakePhoto } from "@/db/cake-media-repo";
import { connect, databaseUrl } from "@/db/client";
import { memberForSave } from "@/lib/admin/session";
import { blobConnected } from "@/lib/storage";
import { CAKE_PHOTO, PHOTO_WORDS } from "@/lib/uploads/cake-photo";

const INCOMING = "incoming/cakes/";
const TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};
const answer = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/cake-media/blob (§9.13, Owner, with a Vercel Blob store): the browser asks for a short-lived token and
 * uploads the photo straight to the private store under incoming/cakes/{cakeId}/ (15 MB, photo types). Then it posts
 * { finish: pathname, cakeId }: the server reads it, makes the site's copy (public media) and deletes the original.
 */
export async function POST(req: Request) {
  if (!databaseUrl() || !blobConnected())
    return answer({ words: "Nothing was added — please try again." }, 503);
  if (!(await memberForSave("owner")))
    return answer(
      { words: "You are signed out — sign in again. Nothing was added." },
      401,
    );
  const body = (await req.json().catch(() => null)) as
    (HandleUploadBody & Record<string, unknown>) | null;
  if (!body)
    return answer({ words: "Nothing was added — please try again." }, 400);
  const { db, close } = connect();
  try {
    if (typeof body.finish === "string") {
      const cakeId = Number(body.cakeId);
      const pathname = body.finish;
      if (
        !Number.isInteger(cakeId) ||
        !pathname.startsWith(`${INCOMING}${cakeId}/`)
      )
        return answer({ words: "Nothing was added — please try again." }, 400);
      const original = await get(pathname, {
        access: "private",
        useCache: false,
      });
      await del(pathname).catch(() => undefined);
      if (original?.statusCode !== 200)
        return answer({ words: "Nothing was added — please try again." }, 400);
      if (original.blob.size > CAKE_PHOTO.maxBytes)
        return answer({ words: PHOTO_WORDS.size(original.blob.size) }, 413);
      const r = await addCakePhoto(
        db,
        cakeId,
        Buffer.from(await new Response(original.stream).arrayBuffer()),
      );
      return answer(
        r.ok ? { media: r.media } : { words: r.words },
        r.ok ? 200 : 400,
      );
    }
    const allowed = (pathname: string, payload: string | null) => {
      const cakeId = Number(JSON.parse(payload ?? "{}").cakeId);
      if (
        !Number.isInteger(cakeId) ||
        !pathname.startsWith(`${INCOMING}${cakeId}/`)
      )
        throw new Error("not allowed");
    };
    const limits = {
      allowedContentTypes: TYPES,
      maximumSizeInBytes: CAKE_PHOTO.maxBytes,
      validUntil: Date.now() + 10 * 60 * 1000,
    };
    const result =
      (body.type as string) === "blob.generate-presigned-url"
        ? await handleUploadPresigned({
            body: body as unknown as HandleUploadPresignedBody,
            request: req,
            getSignedToken: async (pathname, payload) => {
              allowed(pathname, payload);
              const token = await issueSignedToken({
                ...limits,
                pathname,
                operations: ["put"],
              });
              return { token, urlOptions: limits };
            },
          })
        : await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname, payload) => {
              allowed(pathname, payload);
              return { ...limits, addRandomSuffix: true };
            },
          });
    return answer(result as object);
  } catch (e) {
    console.error("cake photo blob", e);
    return answer({ words: "Nothing was added — please try again." }, 400);
  } finally {
    await close();
  }
}
