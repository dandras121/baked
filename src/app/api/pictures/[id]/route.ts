import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { removePicture } from "@/db/upload-repo";
import { NO_STORE } from "../shared";

/** DELETE /api/pictures/{id}?form={formKey} (§7.1 ×): takes an unsent picture off its own form and deletes it. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const form = new URL(req.url).searchParams.get("form") ?? "";
  if (!databaseUrl() || !/^[0-9a-f-]{36}$/i.test(form))
    return NextResponse.json({ removed: false }, { headers: NO_STORE });
  const { db, close } = connect();
  try {
    return NextResponse.json(
      { removed: await removePicture(db, id, form) },
      { headers: NO_STORE },
    );
  } finally {
    await close();
  }
}
