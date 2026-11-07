// Sending (§8.4): Postmark on the live site only; everywhere else every e-mail stays in the site's own outbox
// (/dev/mail), so no customer is ever written to from development or a preview (CLAUDE.md §3, Bohoka 2026-11-06 1A).

export type Outgoing = {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  stream: "transactional" | "broadcast";
  headers?: Record<string, string>;
  attachments?: { name: string; base64: string; contentType: string }[];
};

export type Sent =
  { ok: true; id: string } | { ok: false; error: string; retry: boolean };

export type Transport = {
  name: "outbox" | "postmark";
  send(m: Outgoing): Promise<Sent>;
};

const outbox: Transport = {
  name: "outbox",
  async send() {
    return { ok: true, id: `outbox-${Date.now().toString(36)}` };
  },
};

function postmark(token: string): Transport {
  return {
    name: "postmark",
    async send(m) {
      try {
        const res = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": token,
          },
          body: JSON.stringify({
            From: m.from,
            To: m.to,
            ReplyTo: m.replyTo ?? undefined,
            Subject: m.subject,
            HtmlBody: m.html,
            TextBody: m.text,
            MessageStream: m.stream === "broadcast" ? "broadcast" : "outbound",
            Headers: Object.entries(m.headers ?? {}).map(([Name, Value]) => ({
              Name,
              Value,
            })),
            // No open or click tracking in any e-mail (§8.4 Tracking).
            Attachments: (m.attachments ?? []).map((a) => ({
              Name: a.name,
              Content: a.base64,
              ContentType: a.contentType,
            })),
            TrackOpens: false,
            TrackLinks: "None",
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          MessageID?: string;
          ErrorCode?: number;
          Message?: string;
        };
        if (res.ok && !body.ErrorCode)
          return { ok: true, id: body.MessageID ?? "" };
        // 406: the recipient is inactive (a hard bounce or a spam complaint) — counted as a hard bounce, no retry.
        return {
          ok: false,
          error:
            `${res.status} ${body.ErrorCode ?? ""} ${body.Message ?? ""}`.trim(),
          retry: body.ErrorCode !== 406 && res.status !== 422,
        };
      } catch (e) {
        return { ok: false, error: String(e), retry: true };
      }
    },
  };
}

/** Postmark only with its token and BBL_MAIL_LIVE=1 (set at launch, 11.x); the outbox otherwise. */
export function mailTransport(): Transport {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  return token && process.env.BBL_MAIL_LIVE === "1" ? postmark(token) : outbox;
}

/** From “Baked by Linda <info@bakedbylinda.co.uk>” (§8.4 Sender). */
export const mailFrom = () =>
  process.env.MAIL_FROM ?? "Baked by Linda <info@bakedbylinda.co.uk>";
