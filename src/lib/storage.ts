// The private file store (§0.8 Files; Vercel Blob for now, Bohoka 2026-11-08, DEVIATIONS). Nothing in it is public:
// files are read back only through the site's own signed routes. With no Blob store connected (development and
// previews) the files live in the database instead, so everything works without an account.
import { del, get, put } from "@vercel/blob";
import { eq, inArray } from "drizzle-orm";
import type { connect } from "@/db/client";
import { storedFiles } from "@/db/schema";

type Db = ReturnType<typeof connect>["db"];

export type FileStore = {
  kind: "blob" | "database";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(keys: string[]): Promise<void>;
};

/**
 * How a connected Vercel Blob store lets the browser upload straight to it (no 4.5 MB request limit): with a
 * read–write token (an older connection) a client token; with a store id and Vercel's short-lived sign-in (OIDC, how
 * Vercel connects a store now) a presigned URL. null: no store, the database keeps the files.
 */
export type BlobMode = "token" | "presigned" | null;

export function blobMode(): BlobMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "token";
  if (process.env.BLOB_STORE_ID) return "presigned";
  return null;
}

export function blobConnected() {
  return blobMode() !== null;
}

async function readAll(stream: ReadableStream<Uint8Array>) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

const blobStore: FileStore = {
  kind: "blob",
  async put(key, data, contentType) {
    await put(key, data, {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  },
  async get(key) {
    const r = await get(key, { access: "private", useCache: false }).catch(
      () => null,
    );
    return r?.statusCode === 200 ? readAll(r.stream) : null;
  },
  async remove(keys) {
    if (keys.length) await del(keys);
  },
};

function databaseStore(db: Db): FileStore {
  return {
    kind: "database",
    async put(key, data, contentType) {
      await db
        .insert(storedFiles)
        .values({ key, data, contentType })
        .onConflictDoUpdate({
          target: storedFiles.key,
          set: { data, contentType },
        });
    },
    async get(key) {
      const [row] = await db
        .select({ data: storedFiles.data })
        .from(storedFiles)
        .where(eq(storedFiles.key, key));
      return row ? Buffer.from(row.data) : null;
    },
    async remove(keys) {
      if (keys.length)
        await db.delete(storedFiles).where(inArray(storedFiles.key, keys));
    },
  };
}

export function fileStore(db: Db): FileStore {
  return blobConnected() ? blobStore : databaseStore(db);
}

/**
 * Public media (§0.8: the cake photos and videos the site shows): with a Blob store, a public file on its CDN; without
 * one, the database keeps it and /media/{key} serves it with a long cache. The key is never reused (a new upload gets
 * a new key), so a cached copy never goes stale. Returns the address the site uses.
 */
export async function putPublic(
  db: Db,
  key: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (blobConnected()) {
    const r = await put(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return r.url;
  }
  await databaseStore(db).put(key, data, contentType);
  return `/media/${key}`;
}

/** Removes public media by the addresses putPublic gave (a Blob URL or /media/{key}). */
export async function removePublic(db: Db, urls: string[]) {
  const blob = urls.filter((u) => /^https?:\/\//.test(u));
  const local = urls
    .filter((u) => u.startsWith("/media/"))
    .map((u) => u.slice("/media/".length));
  if (blob.length && blobConnected()) await del(blob).catch(() => undefined);
  if (local.length) await databaseStore(db).remove(local);
}
