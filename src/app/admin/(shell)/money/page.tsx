import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminStub } from "@/components/admin/admin-stub";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Money" };
export const instant = false;

// Money (§9.9, Owner only) arrives in slice 8.8; the role check is already here.
export default async function Page() {
  await connection();
  const { member, session } = await requireMember("owner");
  return (
    <AdminStub
      title="Money"
      member={member}
      expiresAt={session.expiresAt}
      notice={null}
    />
  );
}
