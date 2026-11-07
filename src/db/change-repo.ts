// Change your order (§6.4), the customer's side. 6.2a: the message on each cake (no money moves). Every save carries
// the order's version (a page out of date saves nothing) and checks the change window again (A2 when it has closed).
import { and, eq } from "drizzle-orm";
import { londonDate } from "@/lib/london-time";
import type { ChangeView } from "@/lib/mail/after-emails";
import { inscriptionError, normaliseText } from "@/lib/order-line";
import { statusState } from "@/lib/order-status";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { orderChanges, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

export type SaveResult =
  | { kind: "saved"; changeId: number }
  | { kind: "stale" }
  | { kind: "closed" }
  | { kind: "nothing" }
  | { kind: "invalid"; errors: Record<number, string> };

const shown = (m: string | null) => (m ? `“${m}”` : "No message");

/** Saves new messages ({ line id: text }) on a catalogue order whose change window is open. */
export async function saveMessages(
  db: Db,
  input: { orderId: number; version: number; messages: Record<number, string> },
  now = new Date(),
): Promise<SaveResult> {
  const today = londonDate(now);
  const result = await db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!o) return { kind: "stale" } as const;
    if (
      o.kind !== "catalogue" ||
      statusState({ status: o.status, date: String(o.date) }, today) !== "A"
    )
      return { kind: "closed" } as const;
    if (o.version !== input.version) return { kind: "stale" } as const;
    const lines = await tx
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const errors: Record<number, string> = {};
    const changes: [string, string, string][] = [];
    const updates: { id: number; message: string }[] = [];
    for (const [key, raw] of Object.entries(input.messages)) {
      const line = lines.find((l) => l.id === Number(key));
      if (!line || line.message === null) continue;
      const error = inscriptionError(raw);
      if (error) {
        errors[line.id] = error;
        continue;
      }
      const text = normaliseText(raw);
      if (text === line.message) continue;
      updates.push({ id: line.id, message: text });
      changes.push([
        lines.length > 1 ? `Message on ${line.name}` : "Message",
        shown(line.message),
        shown(text),
      ]);
    }
    if (Object.keys(errors).length) return { kind: "invalid", errors } as const;
    if (!updates.length) return { kind: "nothing" } as const;
    for (const u of updates)
      await tx
        .update(orderLines)
        .set({ message: u.message })
        .where(and(eq(orderLines.id, u.id), eq(orderLines.orderId, o.id)));
    await tx
      .update(orders)
      .set({ version: o.version + 1 })
      .where(eq(orders.id, o.id));
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "customer",
        changes,
        moneyKind: "none",
        moneyPence: 0,
        newTotalPence: o.totalPence,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    return { kind: "saved", changeId: c.id, order: o, changes } as const;
  });
  if (result.kind !== "saved") return result;

  // E-mail 12 to the customer and “Customer changed” to Linda (§8.1, §8.3), once each, from this change.
  const { order: o, changes, changeId } = result;
  const view: ChangeView = {
    number: o.number,
    token: o.token,
    date: String(o.date),
    today,
    changes,
    same: [
      "size",
      "date",
      o.handover === "delivery" ? "delivery time" : "",
      o.handover === "delivery" ? "address" : "",
    ].filter(Boolean),
    newTotalPence: o.totalPence,
    money: { kind: "none", pence: 0 },
    newDeadline: null,
  };
  if (o.email)
    await queueMail(
      db,
      {
        key: `order:${o.id}:12:${changeId}`,
        template: "change-saved",
        data: { view },
        to: o.email,
      },
      now,
    );
  await queueMail(
    db,
    {
      key: `alert:change:${changeId}`,
      template: "alert",
      data: {
        kind: "customer-changed",
        view: {
          number: o.number,
          what: changes
            .map(([w, , after]) => `${w.toLowerCase()}: ${after}`)
            .join(", "),
          detail: "No money changed.",
        },
      },
      to: (await readSettings(db)).email,
      replyTo: o.email || null,
    },
    now,
  );
  return { kind: "saved", changeId };
}

/** The change just saved, for the status page's banner (§6.3: shown once, gone on the next load). */
export async function recentChange(
  db: Db,
  orderId: number,
  changeId: number,
  now = new Date(),
) {
  const [c] = await db
    .select()
    .from(orderChanges)
    .where(
      and(eq(orderChanges.id, changeId), eq(orderChanges.orderId, orderId)),
    );
  return c && now.getTime() - c.createdAt.getTime() < 2 * 60_000 ? c : null;
}
