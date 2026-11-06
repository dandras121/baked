import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Transport } from "@/lib/mail/transport";
import { connect } from "./client";
import { processMail, queueMail } from "./mail-repo";
import { mailSends } from "./schema";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const origin = "https://bakedbylinda.co.uk";
const t = (min: number) => new Date(Date.UTC(2026, 10, 6, 12, min));

describe.skipIf(!url)("database: the mail queue (§8.4)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  const row = async (key: string) =>
    (await db().select().from(mailSends).where(eq(mailSends.key, key)))[0];
  const sent: string[] = [];
  const ok: Transport = {
    name: "outbox",
    async send(m) {
      sent.push(m.subject);
      return { ok: true, id: "x" };
    },
  };
  const down: Transport = {
    name: "postmark",
    async send() {
      return { ok: false, error: "503", retry: true };
    },
  };

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    sent.length = 0;
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await conn?.close();
  });

  it("never twice: the same key is queued once and sent once", async () => {
    const m = {
      key: "order:1:1:1",
      template: "sample",
      data: {},
      to: "mairi@example.co.uk",
    };
    expect(await queueMail(db(), m, t(0))).toBe("queued");
    expect(await queueMail(db(), m, t(1))).toBe("already");
    await processMail(db(), ok, origin, t(1));
    await processMail(db(), ok, origin, t(2));
    expect(sent).toEqual(["Your cake is being made this week"]);
    const r = await row("order:1:1:1");
    expect(r.status).toBe("sent");
    expect(r.transport).toBe("outbox");
    expect(r.html).toContain("Your cake is next");
    expect(r.text).toContain("Date: Saturday 12 September");
  });

  it("retries with backoff until the deadline, then “Failed”; untried after it: “Failed — too late”", async () => {
    await queueMail(
      db(),
      {
        key: "a",
        template: "sample",
        data: {},
        to: "x@example.com",
        deadline: t(4),
      },
      t(0),
    );
    await processMail(db(), down, origin, t(0));
    expect((await row("a")).status).toBe("queued");
    expect((await row("a")).nextAttemptAt).toEqual(t(1));
    await processMail(db(), down, origin, t(1)); // next try would be t(3)
    await processMail(db(), down, origin, t(3)); // next would be t(7) — past the deadline
    const a = await row("a");
    expect(a.status).toBe("failed");
    expect(a.attempts).toBe(3);

    await queueMail(
      db(),
      {
        key: "b",
        template: "sample",
        data: {},
        to: "x@example.com",
        deadline: t(4),
      },
      t(0),
    );
    await processMail(db(), ok, origin, t(5));
    expect((await row("b")).status).toBe("failed-too-late");
    expect(sent).toEqual([]);
  });
});
