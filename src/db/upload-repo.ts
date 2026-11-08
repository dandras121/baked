// Customer pictures (§7.1, §10.10): stored when uploaded, bound to the form that uploaded them, attached when the
// form is sent; never attached → deleted after 24 hours by the 03:00 job (§12).
import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import { processPicture } from "@/lib/uploads/process";
import { cleanFileName, PICTURES } from "@/lib/uploads/rules";
import { pictureLink } from "@/lib/uploads/sign";
import { fileStore } from "@/lib/storage";
import type { connect } from "./client";
import { uploads } from "./schema";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type UploadPurpose = "enquiry" | "complaint";

export type SavedPicture = { id: string; name: string; thumb: string };

/** Processes and stores one picture for a form; PictureError when it is not a picture or too big. */
export async function savePicture(
  db: Db,
  input: {
    purpose: UploadPurpose;
    formKey: string;
    name: string;
    data: Buffer;
  },
  now = new Date(),
): Promise<SavedPicture> {
  const p = await processPicture(input.data);
  const id = crypto.randomUUID();
  const store = fileStore(db);
  const fileKey = `${input.purpose}/${id}.jpg`;
  const thumbKey = `${input.purpose}/${id}-thumb.jpg`;
  await store.put(fileKey, p.file, "image/jpeg");
  await store.put(thumbKey, p.thumb, "image/jpeg");
  const name = cleanFileName(input.name);
  await db.insert(uploads).values({
    id,
    purpose: input.purpose,
    formKey: input.formKey,
    name,
    fileKey,
    thumbKey,
    bytes: p.file.length,
    width: p.width,
    height: p.height,
    createdAt: now,
  });
  return { id, name, thumb: pictureLink(id, "thumb", now.getTime()) };
}

/** How many pictures a form already holds (the server's own count of three). */
export async function formPictureCount(db: Db, formKey: string) {
  const rows = await db
    .select({ id: uploads.id })
    .from(uploads)
    .where(and(eq(uploads.formKey, formKey), isNull(uploads.attachedAt)));
  return rows.length;
}

/** Removes a picture the customer took off the form (only an unattached one of that same form). */
export async function removePicture(db: Db, id: string, formKey: string) {
  const [row] = await db
    .delete(uploads)
    .where(
      and(
        eq(uploads.id, id),
        eq(uploads.formKey, formKey),
        isNull(uploads.attachedAt),
      ),
    )
    .returning();
  if (row) await fileStore(db).remove([row.fileKey, row.thumbKey]);
  return !!row;
}

/**
 * Attaches the chosen pictures to the saved enquiry: only this form's own, not yet attached, in the order given, at
 * most three. Anything else named is ignored.
 */
export async function attachPictures(
  tx: Tx,
  ids: string[],
  formKey: string,
  to: { enquiryId: number },
  now: Date,
) {
  const wanted = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!wanted.length) return 0;
  const rows = await tx
    .select({ id: uploads.id })
    .from(uploads)
    .where(
      and(
        inArray(uploads.id, wanted),
        eq(uploads.formKey, formKey),
        isNull(uploads.attachedAt),
      ),
    );
  const ok = new Set(rows.map((r) => r.id));
  const take = wanted.filter((id) => ok.has(id)).slice(0, PICTURES.max);
  if (take.length)
    await tx
      .update(uploads)
      .set({ enquiryId: to.enquiryId, attachedAt: now })
      .where(inArray(uploads.id, take));
  return take.length;
}

/** The pictures of an enquiry, in upload order (admin and Your enquiry, later slices). */
export async function enquiryPictures(db: Db, enquiryId: number) {
  return db
    .select()
    .from(uploads)
    .where(eq(uploads.enquiryId, enquiryId))
    .orderBy(asc(uploads.createdAt));
}

export async function pictureRow(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(uploads).where(eq(uploads.id, id));
  return row ?? null;
}

/** 03:00 (§12): pictures never attached to a sent form, 24 hours after they were uploaded. */
export async function deleteStaleUploads(db: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(uploads)
    .where(and(isNull(uploads.attachedAt), lt(uploads.createdAt, cutoff)))
    .returning({ fileKey: uploads.fileKey, thumbKey: uploads.thumbKey });
  await fileStore(db).remove(rows.flatMap((r) => [r.fileKey, r.thumbKey]));
  return rows.length;
}
