"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { checkCode, requestCode } from "@/db/admin-auth-repo";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { mailSends } from "@/db/schema";
import {
  codeDigits,
  deviceName,
  SIGN_IN,
  SIGN_IN_COPY,
} from "@/lib/admin/sign-in";
import { isEmail } from "@/lib/contact";
import { mailTransport } from "@/lib/mail/transport";
import { like } from "drizzle-orm";

export type SignInState = {
  /** done: signed in inside a dialog (a save after the session ended, §9.2), so the page stays. */
  step: "email" | "code" | "done";
  email: string;
  error: string | null;
  /** The code cannot be tried again: offer a new one. */
  dead: "usedUp" | "expired" | null;
};

async function address() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Send me a code / Resend the code (§9.2): always the code step, the same words whether or not a code went out. */
export async function askCode(
  _prev: SignInState,
  form: FormData,
): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  if (!email)
    return {
      step: "email",
      email,
      error: SIGN_IN_COPY.emailMissing,
      dead: null,
    };
  if (!isEmail(email))
    return {
      step: "email",
      email,
      error: SIGN_IN_COPY.emailInvalid,
      dead: null,
    };
  if (!databaseUrl())
    return { step: "email", email, error: SIGN_IN_COPY.failed, dead: null };
  const { db, close } = connect();
  try {
    const result = await requestCode(db, email, await address());
    if (result === "tooMany")
      return {
        step: form.get("resend") ? "code" : "email",
        email,
        error: SIGN_IN_COPY.tooMany,
        dead: null,
      };
    // The code e-mail goes out right after the answer, so the code step shows at once.
    after(async () => {
      const transport = mailTransport();
      const { db: later, close: done } = connect();
      try {
        await processMail(later, transport, SITE_URL);
        // Sign-in codes are not kept (§8.4 Logging): once the real e-mail has gone, the code is wiped from the
        // record. The development outbox (/dev/mail) keeps it, so the code can be read on a preview.
        if (transport.name === "postmark")
          await later
            .update(mailSends)
            .set({ data: { kind: "sign-in-code", view: { code: "••• •••" } } })
            .where(like(mailSends.key, "sign-in:%"));
      } catch (e) {
        console.error("sign-in mail", e);
      } finally {
        await done();
      }
    });
  } catch (error) {
    console.error("sign-in", error);
    return { step: "email", email, error: SIGN_IN_COPY.failed, dead: null };
  } finally {
    await close();
  }
  return { step: "code", email, error: null, dead: null };
}

/** Sign in (§9.2): the six digits; right → the session cookie and Today. */
export async function signIn(
  _prev: SignInState,
  form: FormData,
): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  const code = codeDigits(String(form.get("code") ?? ""));
  if (code.length !== 6)
    return { step: "code", email, error: SIGN_IN_COPY.incomplete, dead: null };
  if (!databaseUrl())
    return { step: "code", email, error: SIGN_IN_COPY.failed, dead: null };
  const h = await headers();
  const city = h.get("x-vercel-ip-city");
  const { db, close } = connect();
  let sessionId = "";
  try {
    const r = await checkCode(db, email, code, {
      name: deviceName(h.get("user-agent") ?? ""),
      place: city ? decodeURIComponent(city) : null,
    });
    if (r.kind === "wrong")
      return {
        step: "code",
        email,
        error: SIGN_IN_COPY.wrong(r.left),
        dead: null,
      };
    if (r.kind === "usedUp")
      return {
        step: "code",
        email,
        error: SIGN_IN_COPY.usedUp,
        dead: "usedUp",
      };
    if (r.kind === "expired")
      return {
        step: "code",
        email,
        error: SIGN_IN_COPY.expired,
        dead: "expired",
      };
    sessionId = r.sessionId;
  } finally {
    await close();
  }
  (await cookies()).set(SIGN_IN.cookie, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SIGN_IN.sessionDays * 24 * 60 * 60,
  });
  if (form.get("stay")) return { step: "done", email, error: null, dead: null };
  redirect("/admin/today");
}
