"use server";

import { revalidatePath } from "next/cache";
import { removeCake, saveCake } from "@/db/admin-cake-form-repo";
import { reorderCakes } from "@/db/admin-cakes-repo";
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
  revalidatePath("/");
  revalidatePath("/cakes");
  if (slug) revalidatePath(`/cakes/${slug}`);
  else revalidatePath("/cakes/[slug]", "page");
}
