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

/** True when a Vercel Blob store is connected: then the browser uploads straight to it (no 4.5 MB request limit). */
export function blobConnected() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
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
