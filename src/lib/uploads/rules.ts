// Customer pictures (§7.1 “Add up to three pictures”, J 975:9114; the same on Complaints, §7.5): JPG, PNG or HEIC,
// 8 MB each, three to a form. Checked in the browser before uploading and again on the server.

export const PICTURES = {
  max: 3,
  maxBytes: 8 * 1024 * 1024,
  /** The picker offers JPEG and PNG, so an iPhone converts HEIC itself; HEIC dragged in is still taken. */
  accept: "image/jpeg,image/png",
} as const;

export type PictureKind = "jpeg" | "png" | "heic";

const BY_TYPE: Record<string, PictureKind> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/pjpeg": "jpeg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heic",
};

const BY_EXTENSION: Record<string, PictureKind> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  jfif: "jpeg",
  png: "png",
  heic: "heic",
  heif: "heic",
};

/** What a picked file claims to be (its type, else its extension); the server checks the bytes. */
export function pictureKind(name: string, type: string): PictureKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return BY_TYPE[type.toLowerCase()] ?? BY_EXTENSION[ext] ?? null;
}

/** “12 MB”: whole megabytes, rounded up, so a file over the limit never reads as the limit itself. */
export function megabytes(bytes: number) {
  return `${Math.ceil(bytes / (1024 * 1024))} MB`;
}

export const PICTURE_COPY = {
  heading: "Add up to three pictures",
  note: "Three is plenty — more than that and the design starts pulling in different directions.",
  tooBigTitle: "That one is too big",
  tooBig: (file: string, bytes: number) =>
    `${file} is ${megabytes(bytes)} and the limit is 8 MB. JPG, PNG or HEIC, up to three pictures.`,
  wrongType: (file: string) =>
    `${file} is not a picture I can open. JPG, PNG or HEIC, up to three pictures.`,
  failed: (file: string) =>
    `${file} did not upload — nothing else was lost. Try again or remove it.`,
  keptThree: "I kept the first three — remove one to swap it.",
  waiting: (n: number) =>
    n === 1 ? "Waiting for 1 picture…" : `Waiting for ${n} pictures…`,
  add: "Add a picture",
  remove: (file: string) => `Remove ${file}`,
  retry: "Try again",
  uploading: (file: string) => `Uploading ${file}`,
};

export type PickNotice = { title: string; text?: string };

/**
 * Sorts a pick into the files to upload and what to say about the rest: the first that fit beside those already on
 * the form, in order; a wrong type or a file over 8 MB is named (the first such), and a pick beyond three says so.
 */
export function sortPick(
  files: { name: string; type: string; size: number }[],
  onForm: number,
): { take: number[]; notice: PickNotice | null } {
  const take: number[] = [];
  let notice: PickNotice | null = null;
  let over = false;
  files.forEach((f, i) => {
    if (!pictureKind(f.name, f.type)) {
      notice ??= { title: PICTURE_COPY.wrongType(f.name) };
      return;
    }
    if (f.size > PICTURES.maxBytes) {
      notice ??= {
        title: PICTURE_COPY.tooBigTitle,
        text: PICTURE_COPY.tooBig(f.name, f.size),
      };
      return;
    }
    if (onForm + take.length >= PICTURES.max) {
      over = true;
      return;
    }
    take.push(i);
  });
  if (over && !notice) notice = { title: PICTURE_COPY.keptThree };
  return { take, notice };
}

/** A file name as stored and shown: no folders, at most 120 characters. */
export function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop()?.trim() || "picture";
  return base.length > 120 ? `${base.slice(0, 117)}…` : base;
}
