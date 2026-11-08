import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EMPTY_ENQUIRY } from "@/lib/bespoke";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { saveEnquiry } from "./enquiry-repo";
import { deleteStaleUploads, removePicture, savePicture } from "./upload-repo";
import { enquiries, mailSends, storedFiles, uploads } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const form = "11111111-2222-4333-8444-555566667777";
const other = "99999999-2222-4333-8444-555566667777";

describe.skipIf(!url)("database: customer pictures (§7.1, §10.10)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let jpeg: Buffer;
  beforeAll(async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
    jpeg = await sharp({
      create: { width: 600, height: 400, channels: 3, background: "#ddd" },
    })
      .jpeg()
      .toBuffer();
  });
  beforeEach(async () => {
    await db().delete(uploads);
    await db().delete(storedFiles);
    await db().delete(enquiries).where(like(enquiries.reference, "BBL-%"));
    await db().delete(mailSends);
  });
  afterAll(() => conn?.close());

  const add = (formKey = form, now = new Date()) =>
    savePicture(
      db(),
      { purpose: "enquiry", formKey, name: "venue.jpg", data: jpeg },
      now,
    );

  it("stores the copy and its thumbnail, privately, with a signed thumbnail link", async () => {
    const p = await add();
    expect(p.thumb).toMatch(new RegExp(`^/api/pictures/${p.id}/thumb\\?u=`));
    const files = await db().select().from(storedFiles);
    expect(files.map((f) => f.key).sort()).toEqual([
      `enquiry/${p.id}-thumb.jpg`,
      `enquiry/${p.id}.jpg`,
    ]);
  });

  it("attaches only this form's own pictures on send, at most three, and counts them for Linda", async () => {
    const mine = [await add(), await add(), await add()];
    const theirs = await add(other);
    await saveEnquiry(
      db(),
      {
        enquiry: {
          ...EMPTY_ENQUIRY,
          name: "Mairi Sinclair",
          email: "m@example.co.uk",
        },
        inspiredId: null,
        formKey: form,
        spam: false,
        pictures: [...mine.map((p) => p.id), theirs.id],
      },
      "2026-11-08",
    );
    const rows = await db().select().from(uploads);
    expect(
      rows
        .filter((r) => r.attachedAt)
        .map((r) => r.id)
        .sort(),
    ).toEqual(mine.map((p) => p.id).sort());
    expect(rows.find((r) => r.id === theirs.id)?.enquiryId).toBeNull();
    const [alert] = await db().select().from(mailSends);
    expect(JSON.stringify(alert.data)).toContain("3 pictures");
  });

  it("removes a picture only from its own unsent form", async () => {
    const p = await add();
    expect(await removePicture(db(), p.id, other)).toBe(false);
    expect(await removePicture(db(), p.id, form)).toBe(true);
    expect(await db().select().from(storedFiles)).toEqual([]);
  });

  it("deletes pictures never attached after 24 hours, and keeps the rest (03:00, §12)", async () => {
    const now = new Date("2026-11-09T03:00:00Z");
    const old = await add(form, new Date("2026-11-08T02:00:00Z"));
    const recent = await add(form, new Date("2026-11-08T04:00:00Z"));
    const sent = await add(other, new Date("2026-11-07T10:00:00Z"));
    await db()
      .update(uploads)
      .set({ attachedAt: new Date("2026-11-07T10:05:00Z") })
      .where(eq(uploads.id, sent.id));
    expect(await deleteStaleUploads(db(), now)).toBe(1);
    const left = (await db().select().from(uploads)).map((r) => r.id).sort();
    expect(left).toEqual([recent.id, sent.id].sort());
    const keys = (await db().select().from(storedFiles)).map((f) => f.key);
    expect(keys.some((k) => k.includes(old.id))).toBe(false);
  });
});
