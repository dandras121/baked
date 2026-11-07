import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { mailContext } from "@/db/mail-repo";
import { renderEmail } from "@/lib/mail/layout";
import { SAMPLES, TEMPLATES } from "@/db/mail-templates";
import { readMailSettings } from "@/db/mail-settings-repo";
import { playMorning, sendSample, setPlaceId } from "./actions";
import styles from "../mail/mail.module.css";

// Read on every visit (the database), never prerendered.
export const instant = false;

export const metadata: Metadata = { title: "E-mails — Baked by Linda" };

/** Every e-mail template with sample data, at 600 px and at phone width, with its plain-text part (slice 5.1). */
export default async function Page() {
  await connection();
  if (!databaseUrl()) return <p>No database.</p>;
  const { db, close } = connect();
  const ctx = await mailContext(db, SITE_URL);
  const placeId = (await readMailSettings(db)).googlePlaceId ?? "";
  const mails = await Promise.all(
    SAMPLES.map(async (s) => {
      const email = await TEMPLATES[s.template](
        s.data,
        db,
        SITE_URL,
        new Date(),
      );
      return {
        s,
        mail: email && renderEmail(email, ctx),
        files: email?.attachments ?? [],
      };
    }),
  ).finally(close);
  return (
    <main className={styles.page}>
      <h1>E-mails</h1>
      <p className={styles.lead}>
        Each template with sample data. Business facts come from Settings.
        Nothing is sent from this page; “Send to the outbox” queues one copy and
        shows it in <Link href="/dev/mail">/dev/mail</Link>.
      </p>
      <form action={playMorning} className={styles.sample}>
        <h2>Play a morning</h2>
        <p className={styles.lead}>
          Runs the 06:00, 07:00, 08:00 and 10:00 jobs as if it were 10:30 on
          this day (London): e-mail 4 for the day’s handovers, 3 / 3b for the
          day’s orders, 2 for orders two days later, 5 for orders a year earlier
          (with the box ticked), 18 for orders two days earlier (only with a
          Google Place ID). They land in the outbox.
        </p>
        <label>
          Day <input type="date" name="day" required />
        </label>{" "}
        <button type="submit" className={styles.button}>
          Play this morning
        </button>
      </form>
      <form action={setPlaceId} className={styles.sample}>
        <h2>Google Place ID</h2>
        <p className={styles.lead}>
          The review links (e-mails 1, 5 and 18) and e-mail 18 itself need it.
          Empty: no review links and no e-mail 18. Linda sets the real one in
          the admin later.
        </p>
        <label>
          Place ID <input name="placeId" defaultValue={placeId} size={36} />
        </label>{" "}
        <button type="submit" className={styles.button}>
          Save
        </button>
      </form>
      {mails.map(({ s, mail, files }, i) => {
        if (!mail) return null;
        return (
          <section key={i} className={styles.sample}>
            <h2>{s.title}</h2>
            <p className={styles.meta}>
              Subject: <strong>{mail.subject}</strong>
              {files.length > 0 && (
                <> · Attached: {files.map((f) => f.name).join(", ")}</>
              )}
            </p>
            <form action={sendSample}>
              <input type="hidden" name="sample" value={i} />
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
