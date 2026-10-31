import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "./client";
import {
  connectionKey,
  contactFormKeyUsed,
  purgeContactMessages,
  saveContactMessage,
  takeFormSend,
} from "./contact-repo";
import { contactMessages, formSends } from "./schema";

const url = process.env.TEST_DATABASE_URL;
const message = {
  name: "Mairi Sinclair",
  email: "mairi@example.co.uk",
  phone: null,
  message: "A christening cake.",
};

describe.skipIf(!url)(
  "database: contact messages and the send limit (§7.4, §10.9, §10.10)",
  () => {
    const conn = url ? connect(url) : null;
    beforeAll(async () => {
      await migrate(conn!.db, { migrationsFolder: "drizzle" });
      await conn!.db.delete(contactMessages);
      await conn!.db.delete(formSends);
    });
    afterAll(async () => conn?.close());

    it("the connection is kept only as a hash", () => {
      const key = connectionKey("203.0.113.9", "salt");
      expect(key).toMatch(/^[0-9a-f]{64}$/);
      expect(key).not.toContain("203.0.113.9");
      expect(connectionKey("203.0.113.9", "salt")).toBe(key);
    });

    it("5 sends per hour per connection and form; the sixth is refused; an hour later it is allowed", async () => {
      const db = conn!.db;
      const t = new Date("2026-10-31T10:00:00Z");
      for (let i = 0; i < 5; i++)
        expect(
          await takeFormSend(
            db,
            "contact",
            "a",
            new Date(t.getTime() + i * 60_000),
          ),
        ).toBe(true);
      expect(
        await takeFormSend(
          db,
          "contact",
          "a",
          new Date(t.getTime() + 10 * 60_000),
        ),
      ).toBe(false);
      // Another connection, or another form, has its own count.
      expect(await takeFormSend(db, "contact", "b", t)).toBe(true);
      expect(await takeFormSend(db, "bespoke", "a", t)).toBe(true);
      expect(
        await takeFormSend(
          db,
          "contact",
          "a",
          new Date(t.getTime() + 61 * 60_000),
        ),
      ).toBe(true);
    });

    it("one message per form key: a repeated send stores nothing new", async () => {
      const db = conn!.db;
      const key = "6f1c2b9e-1111-4c2a-9a0b-0123456789ab";
      expect(await contactFormKeyUsed(db, key)).toBe(false);
      expect(await saveContactMessage(db, message, key, "/contact")).toEqual(
        expect.any(Number),
      );
      expect(await saveContactMessage(db, message, key, "/contact")).toBeNull();
      expect(await contactFormKeyUsed(db, key)).toBe(true);
    });

    it("messages are deleted after 30 days, not before (§10.10)", async () => {
      const db = conn!.db;
      await db.delete(contactMessages);
      const now = new Date("2026-12-01T03:00:00Z");
      const day = 24 * 60 * 60 * 1000;
      await saveContactMessage(
        db,
        message,
        "k-old",
        "/contact",
        new Date(now.getTime() - 31 * day),
      );
      await saveContactMessage(
        db,
        message,
        "k-new",
        "/contact",
        new Date(now.getTime() - 29 * day),
      );
      expect(await purgeContactMessages(db, now)).toBe(1);
      const left = await db
        .select({ key: contactMessages.formKey })
        .from(contactMessages);
      expect(left).toEqual([{ key: "k-new" }]);
    });
  },
);
