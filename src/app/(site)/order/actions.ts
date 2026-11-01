"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connect, databaseUrl } from "@/db/client";
import { connectionKey } from "@/db/contact-repo";
import {
  DRAFT_COOKIE,
  draftLineViews,
  liveDraft,
  removeLine,
  saveHandover,
} from "@/db/draft-repo";
import { extendHold, takeHold } from "@/db/hold-repo";
import { readSettings } from "@/db/settings-repo";
import {
  handoverErrors,
  normalisePostcode,
  type HandoverErrors,
  type HandoverInput,
} from "@/lib/handover";
import type { CalendarDate } from "@/lib/london-time";
import { EMPTY_ORDER, myOrder, type MyOrder } from "@/lib/my-order";

const STEPS = ["when", "details", "pay"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Remove a cake (§5.4 Line Remove): the line goes and the same step shows again — with the last cake gone, “There is
 * nothing in your order”. The hold counts the remaining cakes; the last one removed releases it (§10.3).
 */
export async function removeFromOrder(form: FormData): Promise<void> {
  const step = String(form.get("step") ?? "");
  const back = `/order/${STEPS.includes(step) ? step : "when"}`;
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const id = (await cookies()).get(DRAFT_COOKIE)?.value;
      await removeLine(db, id, Number(form.get("line")));
    } finally {
      await close();
    }
  }
  redirect(back);
}

export type WhenState = {
  /** pick: the answers are not complete (`errors`, and no date when `date` is null). */
  kind: "idle" | "pick" | "taken" | "connection";
  /** The handover errors on Continue (§5.2); “outside” = the postcode is outside the delivery area. */
  errors?: HandoverErrors;
  /** The date the customer chose, kept so the page shows it again. */
  date: CalendarDate | null;
  /** B · the nearest free dates (§5.2). */
  chips: CalendarDate[];
};

async function connectionOf(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return connectionKey(ip);
}

/**
 * Step 2's Continue, and a chip in B / G (§5.2, §10.3): the server re-checks the date and takes (or renews) the
 * hold, then goes to `next` — step 3, or the same step for a chip on steps 3–4. Date taken → B with chips; two other
 * live holds from this connection → the limit notice. Nothing is lost either way.
 */
export async function holdDate(
  prev: WhenState,
  form: FormData,
): Promise<WhenState> {
  // A chip names its date; otherwise the calendar's chosen day.
  const date = String(form.get("chip") || form.get("date") || "");
  const next = String(form.get("next") ?? "details");
  // Step 2's own form carries the handover; a chip on steps 3–4 does not (it was saved on step 2).
  const withHandover = form.has("withHandover");
  const h: HandoverInput = {
    handover: String(form.get("handover") ?? ""),
    address: String(form.get("address") ?? ""),
    town: String(form.get("town") ?? ""),
    postcode: String(form.get("postcode") ?? ""),
    window: String(form.get("window") ?? ""),
  };
  const dateOk = DATE.test(date);
  if (!databaseUrl()) return { ...prev, kind: "taken", date, chips: [] };
  const { db, close } = connect();
  let ok = false;
  try {
    const errors = withHandover
      ? handoverErrors(h, (await readSettings(db)).postcodeDistricts)
      : {};
    if (!dateOk || Object.keys(errors).length)
      return { kind: "pick", date: dateOk ? date : null, chips: [], errors };
    const d = await liveDraft(db, (await cookies()).get(DRAFT_COOKIE)?.value);
    if (!d) redirect("/cakes");
    const r = await takeHold(db, d.id, date, await connectionOf());
    if (r.kind === "taken") return { kind: "taken", date, chips: r.chips };
    if (r.kind === "connection") return { kind: "connection", date, chips: [] };
    if (withHandover)
      await saveHandover(db, d.id, {
        ...h,
        handover: h.handover as "delivery" | "collection",
        postcode: h.postcode.trim() ? normalisePostcode(h.postcode) : "",
      });
    ok = true;
  } finally {
    await close();
  }
  if (ok) redirect(`/order/${STEPS.includes(next) ? next : "details"}`);
  return prev;
}

/** Keep holding for 20 more minutes (§10.3): back to the same step; when it cannot, the page shows why. */
export async function keepHolding(form: FormData): Promise<void> {
  const step = String(form.get("step") ?? "details");
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const d = await liveDraft(db, (await cookies()).get(DRAFT_COOKIE)?.value);
      if (d) await extendHold(db, d.id);
    } finally {
      await close();
    }
  }
  redirect(`/order/${STEPS.includes(step) ? step : "details"}`);
}

/** A chip on steps 3–4 (§5.5 G): a new hold and back to the same step; when it went too, step 2 shows why. */
export async function holdDateAndGo(form: FormData): Promise<void> {
  const r = await holdDate({ kind: "idle", date: null, chips: [] }, form);
  if (r.kind !== "idle") redirect("/order/when");
}

/** Remove from the “My order” panel (slice 4.2c): the same rule as the summary's Remove, and the order as it is now. */
export async function removeFromMyOrder(lineId: number): Promise<MyOrder> {
  if (!databaseUrl()) return EMPTY_ORDER;
  const { db, close } = connect();
  try {
    const id = (await cookies()).get(DRAFT_COOKIE)?.value;
    await removeLine(db, id, lineId);
    const d = await liveDraft(db, id);
    return d ? myOrder(await draftLineViews(db, d.id)) : EMPTY_ORDER;
  } finally {
    await close();
  }
}
