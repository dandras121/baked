import { del, get, issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { memberForSave } from "@/lib/admin/session";
import { blobConnected } from "@/lib/storage";
import {
  handleMedia,
  isVideo,
  kindOf,
  maxBytes,
  tooBig,
  TYPES,
} from "../handle";

const INCOMING = "incoming/cakes/";
/** A video is converted after the answer, within this function's time (§9.13). */
export const maxDuration = 300;
const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};
const answer = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/cake-media/blob (§9.13, Owner, with a Vercel Blob store): the browser asks for a short-lived token and
 * uploads the file straight to the private store under incoming/cakes/{cakeId}/ (a photo 15 MB, a video 500 MB). Then
 * it posts { finish: pathname, cakeId, kind, mediaId? }: the server reads it, makes the site's copy (public media) and deletes the original.
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
      // Read the original whole first, then delete it (deleting first can leave its download unreadable).
      const original = await get(pathname, {
        access: "private",
        useCache: false,
      }).catch(() => null);
      const data =
        original?.statusCode === 200
          ? Buffer.from(await new Response(original.stream).arrayBuffer())
          : null;
      await del(pathname).catch(() => undefined);
      if (!data)
        return answer({ words: "Nothing was added — please try again." }, 400);
      const kind = kindOf(body.kind);
      if (data.length > maxBytes(kind))
        return answer({ words: tooBig(kind, data.length) }, 413);
      const r = await handleMedia(db, {
        cakeId,
        kind,
        mediaId: Number(body.mediaId),
        data,
      });
      return answer(r, r.words ? 400 : 200);
    }
    const allowed = (pathname: string, payload: string | null) => {
      const p = JSON.parse(payload ?? "{}");
      const cakeId = Number(p.cakeId);
      if (
        !Number.isInteger(cakeId) ||
        !pathname.startsWith(`${INCOMING}${cakeId}/`)
      )
        throw new Error("not allowed");
      const kind = kindOf(p.kind);
      return {
        allowedContentTypes: isVideo(kind) ? TYPES.video : TYPES.photo,
        maximumSizeInBytes: maxBytes(kind),
        validUntil: Date.now() + 30 * 60 * 1000,
      };
    };
    const result =
      (body.type as string) === "blob.generate-presigned-url"
        ? await handleUploadPresigned({
            body: body as unknown as HandleUploadPresignedBody,
            request: req,
            getSignedToken: async (pathname, payload) => {
              const limits = allowed(pathname, payload);
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
              return { ...allowed(pathname, payload), addRandomSuffix: true };
            },
          });
    return answer(result as object);
  } catch (e) {
    console.error("cake media blob", e);
    return answer({ words: "Nothing was added — please try again." }, 400);
  } finally {
    await close();
  }
}
