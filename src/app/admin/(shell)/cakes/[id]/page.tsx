import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CakeFormScreen } from "@/components/admin/cake-form/cake-form";
import { cakeForEdit } from "@/db/admin-cake-form-repo";
import { cakeMediaList } from "@/db/cake-media-repo";
import { cardVideoOf } from "@/db/card-video-repo";
import { blobMode } from "@/lib/storage";
import { connect, databaseUrl } from "@/db/client";
import { EMPTY_CAKE } from "@/lib/admin/cake-form";
import { requireMember } from "@/lib/admin/session";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: (await params).id === "new" ? "Add a cake" : "Edit a cake" };
}

// Add or edit a cake (§9.13; 940:8507, phone 950:8886): Owner only. /admin/cakes/new adds one.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireMember("owner");
  const raw = (await params).id;
  if (!databaseUrl()) return null;
  const id = raw === "new" ? 0 : Number(raw);
  if (raw !== "new" && (!Number.isInteger(id) || id <= 0)) notFound();
  const { db, close } = connect();
  try {
    // A fresh form on every visit (an earlier visit's typing must not come back).
    if (raw === "new")
      return (
        <CakeFormScreen
          key={`new-${Date.now()}`}
          id={null}
          initial={EMPTY_CAKE}
        />
      );
    const [c, media, cardVideo] = await Promise.all([
      cakeForEdit(db, id),
      cakeMediaList(db, id),
      cardVideoOf(db, id),
    ]);
    if (!c) notFound();
    return (
      <CakeFormScreen
        key={`${c.id}-${Date.now()}`}
        id={c.id}
        initial={c.form}
        media={media}
        cardVideo={cardVideo}
        direct={blobMode()}
      />
    );
  } finally {
    await close();
  }
}
