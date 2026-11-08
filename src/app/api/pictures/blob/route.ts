import { del, get } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { savePicture } from "@/db/upload-repo";
import { blobConnected } from "@/lib/storage";
import { PictureError } from "@/lib/uploads/process";
import { PICTURES } from "@/lib/uploads/rules";
import { failure, formOf, mayAdd, NO_STORE } from "../shared";

const INCOMING = "incoming/";

/**
 * POST /api/pictures/blob (§7.1, with a Vercel Blob store): the browser asks here for a short-lived token and uploads
 * the picture straight to the private store under incoming/ (8 MB, picture types only). Then it posts
 * { finish: pathname, formKey, purpose, name } here: the server reads the original, makes the server copy, and
 * deletes the original.
 */
export async function POST(req: Request) {
  if (!databaseUrl() || !blobConnected()) return failure("failed", 503);
  const body = (await req.json().catch(() => null)) as
    (HandleUploadBody & Record<string, unknown>) | null;
  if (!body) return failure("failed");
  const { db, close } = connect();
  try {
    if (typeof body.finish === "string") {
      const which = formOf(body.formKey, body.purpose);
      const pathname = body.finish;
      if (!which || !pathname.startsWith(`${INCOMING}${which.formKey}/`))
        return failure("failed");
      const original = await get(pathname, {
        access: "private",
        useCache: false,
      });
      await del(pathname).catch(() => undefined);
      if (original?.statusCode !== 200) return failure("failed");
      if (original.blob.size > PICTURES.maxBytes) return failure("size", 413);
      const saved = await savePicture(db, {
        ...which,
        name: String(body.name ?? "picture"),
        data: Buffer.from(await new Response(original.stream).arrayBuffer()),
      });
      return NextResponse.json(saved, { headers: NO_STORE });
    }
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, payload) => {
        const p = JSON.parse(payload ?? "{}");
        const which = formOf(p.formKey, p.purpose);
        if (
          !which ||
          !pathname.startsWith(`${INCOMING}${which.formKey}/`) ||
          !(await mayAdd(db, req, which.formKey))
        )
          throw new Error("not allowed");
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/heic",
            "image/heif",
          ],
          maximumSizeInBytes: PICTURES.maxBytes,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof PictureError) return failure(error.reason);
    console.error("picture blob", error);
    return failure("failed");
  } finally {
    await close();
  }
}
