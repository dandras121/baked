// The e-mail adapter (CLAUDE.md §3, §7). Phase 5 adds the Postmark sender, the send log and the retries (§8.4);
// until then every e-mail is handed here and only written to the server log, so nothing ever reaches a real
// address from development or a preview.
import type { OutgoingEmail } from "@/lib/contact";

export type EmailAdapter = { send(email: OutgoingEmail): Promise<void> };

/** Logs the e-mail instead of sending it (the subject and the address, never the message itself). */
export const logOnlyAdapter: EmailAdapter = {
  async send(email) {
    console.info(
      `[email:${email.stream}] not sent (phase 5) — to ${email.to}, reply-to ${email.replyTo}: “${email.subject}”`,
    );
  },
};

export function emailAdapter(): EmailAdapter {
  return logOnlyAdapter;
}
