// POST /unsubscribe/[token] (rewritten here by the proxy, §6.10, §8.4 Unsubscribe). The token is the credential: no
// CSRF token (§10.14). The mail app's one-click POST (body “List-Unsubscribe=One-Click”) records the withdrawal and
// gets an empty 200; the page's buttons (field “do”) record it and return to the page.
import { connect, databaseUrl } from "@/db/client";
import { hashForToken, recordConsent, WORDING } from "@/db/consent-repo";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const action = String(form?.get("do") ?? "stop");
  const list = form?.get("list") === "thanks" ? "thanks" : "yearly";
  if (!databaseUrl()) return new Response(null, { status: 503 });
  const { db, close } = connect();
  try {
    const hash = await hashForToken(db, token);
    if (!hash) {
      if (oneClick) return new Response(null, { status: 404 });
      return back(request, token, list, null);
    }
    if (oneClick || action === "stop")
      await recordConsent(
        db,
        hash,
        oneClick ? "yearly" : list,
        "out",
        "unsubscribe",
        list === "thanks" && !oneClick ? WORDING.thanksStop : WORDING.stop,
      );
    else if (action === "back")
      await recordConsent(db, hash, list, "in", "back-on", WORDING.back);
  } finally {
    await close();
  }
  if (oneClick) return new Response(null, { status: 200 });
  return back(request, token, list, action === "back" ? "back" : null);
}

/** 303 to the page (GET), which shows the new state. */
function back(
  request: Request,
  token: string,
  list: string,
  note: string | null,
) {
  const to = new URL(`/unsubscribe/${token}`, request.url);
  if (list === "thanks") to.searchParams.set("list", "thanks");
  if (note) to.searchParams.set("note", note);
  return new Response(null, {
    status: 303,
    headers: { Location: to.pathname + to.search },
  });
}
