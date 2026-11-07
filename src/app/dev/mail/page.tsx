import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { recentMail } from "@/db/mail-repo";
import styles from "./mail.module.css";

// Read on every visit (the database), never prerendered.
export const instant = false;

export const metadata: Metadata = { title: "Outbox — Baked by Linda" };

/**
 * The outbox (Bohoka 2026-11-06, 1A): in development and on previews every e-mail lands here instead of a real
 * mailbox. The newest 50 sends with their status, attempts and the rendered e-mail.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await connection();
  if (!databaseUrl()) return <p>No database.</p>;
  const { id } = await searchParams;
  const { db, close } = connect();
  const rows = await recentMail(db).finally(close);
  const open = rows.find((r) => String(r.id) === id) ?? rows[0];
  return (
    <main className={styles.page}>
      <h1>Outbox</h1>
      <p className={styles.lead}>
        No e-mail leaves the site here: each send is kept below. On the live
        site they go through Postmark.
      </p>
      {rows.length === 0 && <p>Nothing sent yet.</p>}
      <div className={styles.outbox}>
        <ol className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} data-open={r.id === open?.id || undefined}>
              <Link href={`/dev/mail?id=${r.id}`}>
                <strong>{r.subject ?? r.template}</strong>
                <span>
                  {r.to} · {r.status}
                  {r.attempts > 1 ? ` · ${r.attempts} tries` : ""} ·{" "}
                  {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {open && (
          <section className={styles.sample}>
            <p className={styles.meta}>
              To {open.to} · {open.status} · via {open.transport ?? "—"} · key{" "}
              {open.key}
              {open.lastError ? ` · ${open.lastError}` : ""}
              {open.stream === "broadcast" ? " · broadcast stream" : ""}
            </p>
            {open.headers != null && typeof open.headers === "object" && (
              <p className={styles.meta}>
                {Object.entries(open.headers as Record<string, string>).map(
                  ([k, v]) => (
                    <span key={k}>
                      {k}: {v}
                      <br />
                    </span>
                  ),
                )}
              </p>
            )}
            {Array.isArray(open.attachments) && open.attachments.length > 0 && (
              <p className={styles.meta}>
                Attached:{" "}
                {(open.attachments as string[]).map((n, i) => (
                  <span key={n}>
                    {i > 0 && " · "}
                    <a
                      href={`/dev/mail/pdf?id=${open.id}&name=${encodeURIComponent(n)}`}
                    >
                      {n}
                    </a>
                  </span>
                ))}
              </p>
            )}
            {open.html ? (
              <iframe
                title={open.subject ?? "E-mail"}
                srcDoc={open.html}
                className={styles.wide}
              />
            ) : (
              <p>Not rendered yet.</p>
            )}
            {open.text && (
              <details>
                <summary>Plain text</summary>
                <pre className={styles.text}>{open.text}</pre>
              </details>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
