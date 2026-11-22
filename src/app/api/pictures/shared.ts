// Shared by the picture routes (§7.1): which form a picture belongs to, the per-connection limit, the answers.
import { NextResponse } from "next/server";
import { connectionKey, takeFormSend } from "@/db/contact-repo";
import type { connect } from "@/db/client";
import { formPictureCount, type UploadPurpose } from "@/db/upload-repo";
import { memberForSave } from "@/lib/admin/session";
import { PICTURES } from "@/lib/uploads/rules";

type Db = ReturnType<typeof connect>["db"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Uploads a connection may start in an hour: three pictures on ten forms is plenty (§10.9). */
const PER_HOUR = 30;

export type PictureFailure = "type" | "size" | "full" | "failed";

export function failure(reason: PictureFailure, status = 400) {
  return NextResponse.json({ error: reason }, { status, headers: NO_STORE });
}

export const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
  "Referrer-Policy": "no-referrer",
};

export function formOf(
  formKey: unknown,
  purpose: unknown,
): { formKey: string; purpose: UploadPurpose } | null {
  if (typeof formKey !== "string" || !UUID.test(formKey)) return null;
  if (purpose !== "enquiry" && purpose !== "complaint" && purpose !== "order")
    return null;
  return { formKey, purpose };
}

/** formOf, and a sketch for Add an order (§9.6) only from a signed-in Owner. */
export async function allowedForm(formKey: unknown, purpose: unknown) {
  const which = formOf(formKey, purpose);
  if (which?.purpose === "order" && !(await memberForSave("owner")))
    return null;
  return which;
}

function address(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** May this form take one more picture now? Counts the upload against the connection's hourly limit. */
export async function mayAdd(db: Db, req: Request, formKey: string) {
  if ((await formPictureCount(db, formKey)) >= PICTURES.max) return false;
  return takeFormSend(
    db,
    "pictures",
    connectionKey(address(req)),
    new Date(),
    PER_HOUR,
  );
}
