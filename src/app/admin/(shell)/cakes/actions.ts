"use server";

import { revalidatePath, updateTag } from "next/cache";
import { removeCake, saveCake } from "@/db/admin-cake-form-repo";
import { reorderCakes } from "@/db/admin-cakes-repo";
import { CAKES_TAG } from "@/db/home-repo";
import {
  cakeVideoStatus,
  makeMainPhoto,
  removeCakeMedia,
  reorderCakeMedia,
  updateCakePhoto,
  type VideoStatus,
} from "@/db/cake-media-repo";
import { removeCardVideo } from "@/db/card-video-repo";
import { connect } from "@/db/client";
import {
  checkCakeForm,
  type CakeErrors,
  type CakeForm,
} from "@/lib/admin/cake-form";
import { memberForSave } from "@/lib/admin/session";

/** Drag ⠿ (§9.13, Owner): the new catalogue order, saved at once; the site follows from the next page load. */
export async function reorderCakesAction(
  ids: number[],
): Promise<{ kind: "saved" | "changed" | "signed-out" | "failed" }> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  if (!Array.isArray(ids) || ids.some((x) => !Number.isInteger(x)))
    return { kind: "failed" };
  const { db, close } = connect();
  try {
    if (!(await reorderCakes(db, ids))) return { kind: "changed" };
    // The public pages that show the order (Home's row, the catalogue); not the admin, so the list keeps its focus.
    updateTag(CAKES_TAG);
    revalidatePath("/");
    revalidatePath("/cakes");
    return { kind: "saved" };
  } catch (e) {
    console.error("reorder cakes", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

export type SaveCakeOutcome =
  | { kind: "saved"; id: number }
  | { kind: "invalid"; errors: CakeErrors }
  | { kind: "gone" }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Save (§9.13, Owner): checked again here; live on the site from the next page load. */
export async function saveCakeAction(
  id: number | null,
  form: CakeForm,
): Promise<SaveCakeOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const checked = checkCakeForm(form);
  if (!checked.value) return { kind: "invalid", errors: checked.errors };
  const { db, close } = connect();
  try {
    const r = await saveCake(db, id, checked.value);
    if (r.kind === "name-taken")
      return {
        kind: "invalid",
        errors: {
          name: `Another cake is already called ${checked.value.name}.`,
        },
      };
    if (r.kind === "needs-photo")
      return {
        kind: "invalid",
        errors: { visible: "Add a photo before showing it on the site" },
      };
    if (r.kind === "gone") return r;
    revalidateSite(r.slug);
    return { kind: "saved", id: r.id };
  } catch (e) {
    console.error("save cake", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** Delete this design (“Delete it”) or “Hide it instead” (§9.13, Owner). */
export async function removeCakeAction(
  id: number,
  how: "delete" | "hide",
): Promise<{ kind: "saved" | "gone" | "signed-out" | "failed" }> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    if (!(await removeCake(db, id, how))) return { kind: "gone" };
    revalidateSite(null);
    return { kind: "saved" };
  } catch (e) {
    console.error("remove cake", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

/** The public pages that show cakes (Home's row, the catalogue, the cake pages). */
function revalidateSite(slug: string | null) {
  // The Home row and the catalogue read through the "cakes" cache (home-repo).
  updateTag(CAKES_TAG);
  revalidatePath("/");
  revalidatePath("/cakes");
  if (slug) revalidatePath(`/cakes/${slug}`);
  else revalidatePath("/cakes/[slug]", "page");
}

type MediaOutcome = {
  kind: "saved" | "last-photo" | "gone" | "signed-out" | "failed";
};

/** One photo change (§9.13, Owner), saved at once; the site follows from the next page load. */
async function mediaChange(
  cakeId: number,
  run: (
    db: ReturnType<typeof connect>["db"],
  ) => Promise<boolean | "last-photo">,
): Promise<MediaOutcome> {
  const member = await memberForSave("owner");
  if (!member) return { kind: "signed-out" };
  const { db, close } = connect();
  try {
    const r = await run(db);
    if (r === true) revalidateSite(null);
    return {
      kind: r === true ? "saved" : r === "last-photo" ? "last-photo" : "gone",
    };
  } catch (e) {
    console.error("cake media", e);
    return { kind: "failed" };
  } finally {
    await close();
  }
}

export async function reorderMediaAction(cakeId: number, ids: number[]) {
  return mediaChange(cakeId, (db) => reorderCakeMedia(db, cakeId, ids));
}

export async function makeMainPhotoAction(cakeId: number, id: number) {
  return mediaChange(cakeId, (db) => makeMainPhoto(db, cakeId, id));
}

export async function updatePhotoAction(
  cakeId: number,
  id: number,
  patch: { alt?: string; focalX?: number; focalY?: number },
) {
  return mediaChange(cakeId, (db) => updateCakePhoto(db, cakeId, id, patch));
}

export async function removeMediaAction(cakeId: number, id: number) {
  return mediaChange(cakeId, async (db) => {
    const r = await removeCakeMedia(db, cakeId, id);
    return r.kind === "removed"
      ? true
      : r.kind === "last-photo"
        ? "last-photo"
        : false;
  });
}

/** The tiles' question every few seconds while a video is preparing (§9.13); a ready one shows on the site from now. */
export async function videoStatusAction(
  cakeId: number,
  ids: number[],
): Promise<VideoStatus[] | null> {
  if (!(await memberForSave("owner"))) return null;
  if (!Array.isArray(ids) || ids.some((x) => !Number.isInteger(x))) return null;
  const { db, close } = connect();
  try {
    const r = await cakeVideoStatus(db, cakeId, ids.slice(0, 10));
    if (r.some((v) => v.state === "ready")) revalidateSite(null);
    return r;
  } catch (e) {
    console.error("cake video status", e);
    return null;
  } finally {
    await close();
  }
}

/** Card video · Remove (§9.13): the card shows the main photo again and has no corner button. */
export async function removeCardVideoAction(cakeId: number) {
  return mediaChange(cakeId, async (db) => {
    await removeCardVideo(db, cakeId);
    return true;
  });
}

/** After a new card video is in place (the upload route): the cards show it from the next page load. */
export async function cardVideoChangedAction(cakeId: number) {
  return mediaChange(cakeId, async () => true);
}
