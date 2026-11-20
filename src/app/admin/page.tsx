import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentMember } from "@/lib/admin/session";

export const instant = false;

// /admin → Today when signed in, else Sign in (§9.1 Routes).
export default async function Page() {
  await connection();
  const { signedIn } = await currentMember();
  redirect(signedIn ? "/admin/today" : "/admin/sign-in");
}
