import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { endSession } from "@/db/admin-auth-repo";
import { connect, databaseUrl } from "@/db/client";
import { SIGN_IN } from "@/lib/admin/sign-in";

/**
 * POST /admin/sign-out (§9.1 sidebar footer): ends this device's session on the server and clears the cookie in the
 * same answer that sends the browser to Sign in — a plain form post, so no page is drawn again with the old cookie.
 * The cookie is SameSite=Lax, so another site's form cannot sign anyone out.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const id = jar.get(SIGN_IN.cookie)?.value;
  if (id && databaseUrl()) {
    const { db, close } = connect();
    try {
      await endSession(db, id);
    } finally {
      await close();
    }
  }
  const res = NextResponse.redirect(new URL("/admin/sign-in", req.url), 303);
  res.cookies.set(SIGN_IN.cookie, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
