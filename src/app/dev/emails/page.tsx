import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { mailContext } from "@/db/mail-repo";
import { renderEmail } from "@/lib/mail/layout";
import { SAMPLES, TEMPLATES } from "@/lib/mail/templates";
import { sendSample } from "./actions";
import styles from "../mail/mail.module.css";

// Read on every visit (the database), never prerendered.
export const instant = false;

export const metadata: Metadata = { title: "E-mails — Baked by Linda" };

/** Every e-mail template with sample data, at 600 px and at phone width, with its plain-text part (slice 5.1). */
export default async function Page() {
  await connection();
  if (!databaseUrl()) return <p>No database.</p>;
  const { db, close } = connect();
  const ctx = await mailContext(db, SITE_URL).finally(close);
  return (
    <main className={styles.page}>
      <h1>E-mails</h1>
      <p className={styles.lead}>
        Each template with sample data. Business facts come from Settings.
        Nothing is sent from this page; “Send to the outbox” queues one copy and
        shows it in <Link href="/dev/mail">/dev/mail</Link>.
      </p>
      {SAMPLES.map((s) => {
        const mail = renderEmail(TEMPLATES[s.template](s.data), ctx);
        return (
          <section key={s.template} className={styles.sample}>
            <h2>{s.title}</h2>
            <p className={styles.meta}>
              Subject: <strong>{mail.subject}</strong>
            </p>
            <form action={sendSample}>
              <input type="hidden" name="template" value={s.template} />
              <button type="submit" className={styles.button}>
                Send to the outbox
              </button>
            </form>
            <div className={styles.frames}>
              <iframe
                title={`${s.title} at 600 px`}
                srcDoc={mail.html}
                className={styles.wide}
              />
              <iframe
                title={`${s.title} at phone width`}
                srcDoc={mail.html}
                className={styles.narrow}
              />
            </div>
            <details>
              <summary>Plain text</summary>
              <pre className={styles.text}>{mail.text}</pre>
            </details>
          </section>
        );
      })}
    </main>
  );
}
