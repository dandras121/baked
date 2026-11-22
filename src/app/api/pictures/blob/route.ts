import { del, get, issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { savePicture } from "@/db/upload-repo";
import { blobConnected } from "@/lib/storage";
import { PictureError } from "@/lib/uploads/process";
import { PICTURES } from "@/lib/uploads/rules";
import { failure, allowedForm, mayAdd, NO_STORE } from "../shared";

const INCOMING = "incoming/";
const TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];

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
      const which = await allowedForm(body.formKey, body.purpose);
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
    // Only this form's own incoming/ folder, within its three pictures and the hourly limit.
    const allowed = async (pathname: string, payload: string | null) => {
      const p = JSON.parse(payload ?? "{}");
      const which = await allowedForm(p.formKey, p.purpose);
      if (
        !which ||
        !pathname.startsWith(`${INCOMING}${which.formKey}/`) ||
        !(await mayAdd(db, req, which.formKey))
      )
        throw new Error("not allowed");
    };
    const limits = {
      allowedContentTypes: TYPES,
      maximumSizeInBytes: PICTURES.maxBytes,
      validUntil: Date.now() + 10 * 60 * 1000,
    };
    const result =
      (body.type as string) === "blob.generate-presigned-url"
        ? // A store connected the current way (store id and Vercel's own sign-in): a presigned URL for this one name.
          await handleUploadPresigned({
            body: body as unknown as HandleUploadPresignedBody,
            request: req,
            getSignedToken: async (pathname, payload) => {
              await allowed(pathname, payload);
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
              await allowed(pathname, payload);
              return { ...limits, addRandomSuffix: true };
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
