import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { savePicture } from "@/db/upload-repo";
import { PictureError } from "@/lib/uploads/process";
import { PICTURES } from "@/lib/uploads/rules";
import { failure, formOf, mayAdd, NO_STORE } from "./shared";

/**
 * POST /api/pictures (§7.1): one picture sent through the site (when no Blob store is connected; on Vercel this way
 * is limited to 4.5 MB a request). multipart: file, formKey, purpose. → { id, name, thumb } or { error }.
 */
export async function POST(req: Request) {
  if (!databaseUrl()) return failure("failed", 503);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return failure("failed");
  }
  const file = form.get("file");
  const which = formOf(form.get("formKey"), form.get("purpose"));
  if (!which || !(file instanceof File)) return failure("failed");
  if (file.size > PICTURES.maxBytes) return failure("size", 413);
  const { db, close } = connect();
  try {
    if (!(await mayAdd(db, req, which.formKey))) return failure("full", 429);
    const saved = await savePicture(db, {
      ...which,
      name: file.name,
      data: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json(saved, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof PictureError) return failure(error.reason);
    console.error("picture upload", error);
    return failure("failed", 500);
  } finally {
    await close();
  }
}
