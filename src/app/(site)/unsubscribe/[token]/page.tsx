import type { Metadata } from "next";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { connect, databaseUrl } from "@/db/client";
import { hashForToken, listState } from "@/db/consent-repo";
import { getSiteSettings } from "@/db/site-settings";
import styles from "./unsubscribe.module.css";

// §6.10. Opening the link changes nothing, not even by script (mail scanners open links): every change is a POST
// to this same address (the proxy hands it to /api/unsubscribe/[token]). One token per address, never expires.
export const instant = false;

export const metadata: Metadata = {
  title: "Your e-mails",
  robots: { index: false, follow: false },
};

const COPY = {
  yearly: {
    ask: "Stop the once-a-year e-mail?",
    off: "I’ve taken this address off the once-a-year e-mail. You will still get e-mails about any order you place.",
    back: "One e-mail a year, around the date of your last cake. You can stop it with one click in any of them.",
  },
  thanks: {
    ask: "Stop the thank-you e-mails?",
    off: "I won’t send thank-you e-mails to this address again. You will still get e-mails about any order you place.",
    back: "You will get a thank-you e-mail after your next cake. You can stop it with one click in any of them.",
  },
} as const;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { token } = await params;
  const q = await searchParams;
  const list = q.list === "thanks" ? "thanks" : "yearly";
  const copy = COPY[list];
  let state: "unknown" | "in" | "out" | "deleted" = "unknown";
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const hash = await hashForToken(db, token);
      if (hash) state = await listState(db, hash, list);
    } finally {
      await close();
    }
  }
  const email = (await getSiteSettings())?.email ?? "";
  const action = `/unsubscribe/${encodeURIComponent(token)}`;
  const form = (doWhat: "stop" | "back") => (
    <form method="post" action={action} className={styles.form}>
      <input type="hidden" name="do" value={doWhat} />
      {list === "thanks" && <input type="hidden" name="list" value="thanks" />}
      {doWhat === "stop" ? (
        <Button type="submit" block>
          Stop these emails
        </Button>
      ) : (
        <Button type="submit" variant="outline" block>
          Turn emails back on
        </Button>
      )}
    </form>
  );

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Your e-mails</h1>
      {state === "unknown" ? (
        <Notice title="This link didn’t work.">
          <p>
            Email <a href={`mailto:${email}`}>{email}</a> and I’ll take you off
            by hand.
          </p>
        </Notice>
      ) : state === "in" && q.note === "back" ? (
        <>
          <Notice icon title="You’re back on the list.">
            <p>{copy.back}</p>
          </Notice>
          {form("stop")}
        </>
      ) : state === "in" ? (
        <>
          <h2 className={styles.title}>{copy.ask}</h2>
          <p className={styles.text}>
            You will still get e-mails about any order you place.
          </p>
          {form("stop")}
        </>
      ) : (
        <>
          <Notice icon title="You’re off the list">
            <p>{copy.off}</p>
          </Notice>
          {state === "out" && form("back")}
        </>
      )}
    </div>
  );
}
