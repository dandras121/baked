"use server";

import { revalidatePath } from "next/cache";
import { reorderCakes } from "@/db/admin-cakes-repo";
import { connect } from "@/db/client";
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
