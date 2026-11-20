import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminStub } from "@/components/admin/admin-stub";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Today" };
export const instant = false;

// Today (§9.3) arrives in slice 8.3; for now the signed-in person and Sign out, so sign-in and roles can be checked.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  await connection();
  const { member, session } = await requireMember();
  const { for: forWho } = await searchParams;
  return (
    <AdminStub
      title="Today"
      member={member}
      expiresAt={session.expiresAt}
      notice={forWho === "owner" ? "owner" : null}
    />
  );
}
