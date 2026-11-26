import type { Metadata } from "next";
import { connection } from "next/server";
import { CakesScreen } from "@/components/admin/cakes/cakes-screen";
import { adminCakes } from "@/db/admin-cakes-repo";
import { connect, databaseUrl } from "@/db/client";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Cakes" };
export const instant = false;

// Cakes (§9.13; 940:8399, phone 948:8933): Owner only.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; hidden?: string }>;
}) {
  await connection();
  await requireMember("owner");
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const list = await adminCakes(db);
    // Drawn fresh when a cake changed (an edit, a new cake), not when only the order did: a saved move keeps its focus.
    const key = JSON.stringify([...list].sort((a, b) => a.id - b.id));
    const q = await searchParams;
    const notice = q.saved
      ? "Saved."
      : q.deleted
        ? "Deleted. Past orders keep their copy."
        : q.hidden
          ? "Hidden — it is off the catalogue."
          : null;
    return <CakesScreen key={key} initial={list} notice={notice} />;
  } finally {
    await close();
  }
}
