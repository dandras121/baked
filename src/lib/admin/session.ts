// The signed-in person (§9.1, §9.2): read from the session cookie on every request; owner-only pages send a Helper
// to Today with “That page is for the owner.”
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sessionMember } from "@/db/admin-auth-repo";
import { connect, databaseUrl } from "@/db/client";
import { SIGN_IN } from "./sign-in";

export const currentMember = cache(async () => {
  const id = (await cookies()).get(SIGN_IN.cookie)?.value;
  if (!id || !databaseUrl()) return { signedIn: null, hadCookie: !!id };
  const { db, close } = connect();
  try {
    return { signedIn: await sessionMember(db, id), hadCookie: true };
  } finally {
    await close();
  }
});

/** The signed-in person, or the sign-in page (“For safety, please sign in again.” when a session has ended). */
export async function requireMember(role: "any" | "owner" = "any") {
  const { signedIn, hadCookie } = await currentMember();
  if (!signedIn)
    redirect(hadCookie ? "/admin/sign-in?again=1" : "/admin/sign-in");
  if (role === "owner" && signedIn.member.role !== "owner")
    redirect("/admin/today?for=owner");
  return signedIn;
}

/**
 * For a save (a server action): the signed-in person, or null when the session has ended — the page then keeps every
 * input and offers sign-in in a dialog, then Save again (§9.2), instead of leaving for the sign-in page.
 */
export async function memberForSave(role: "any" | "owner" = "any") {
  const { signedIn } = await currentMember();
  if (!signedIn) return null;
  if (role === "owner" && signedIn.member.role !== "owner") return null;
  return signedIn.member;
}
