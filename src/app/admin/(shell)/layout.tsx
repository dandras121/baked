import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireMember } from "@/lib/admin/session";

// Every admin screen: signed in (§9.2), inside the frame (§9.1).
export default async function ShellLayout({ children }: LayoutProps<"/admin">) {
  await connection();
  const { member } = await requireMember();
  return <AdminShell member={member}>{children}</AdminShell>;
}
