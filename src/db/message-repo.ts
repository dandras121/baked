// Message Linda (§6.5): the customer's message from the status link, kept on the order and e-mailed to Linda with the
// order number, Reply-To the customer. At most five an hour per order.
import { and, count, eq, gte } from "drizzle-orm";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { orderMessages, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

export const MESSAGE_MAX = 400;
export const MESSAGES_PER_HOUR = 5;
const HOUR = 60 * 60_000;
/** “Message sent.” shows only right after sending (§6.5: gone on the next load). */
const BANNER_MS = 2 * 60_000;

export type SendResult =
  | { kind: "sent"; messageId: number }
  | { kind: "empty" }
  | { kind: "too-long" }
  | { kind: "limit" }
  | { kind: "missing" };

export async function sendOrderMessage(
  db: Db,
  input: { orderId: number; body: string; formKey: string | null },
  now = new Date(),
): Promise<SendResult> {
  const body = input.body.trim();
  if (!body) return { kind: "empty" };
  if ([...body].length > MESSAGE_MAX) return { kind: "too-long" };
  const result = await db.transaction(async (tx) => {
    // The order row is the lock, so two presses at once count one after the other.
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!o) return null;
    if (input.formKey) {
      const [same] = await tx
        .select({ id: orderMessages.id })
        .from(orderMessages)
        .where(
          and(
            eq(orderMessages.orderId, o.id),
            eq(orderMessages.formKey, input.formKey),
          ),
        );
      // A repeated press or a retry of the same message: already sent.
      if (same)
        return { kind: "sent", messageId: same.id, order: null } as const;
    }
    const [{ n }] = await tx
      .select({ n: count() })
      .from(orderMessages)
      .where(
        and(
          eq(orderMessages.orderId, o.id),
          gte(orderMessages.createdAt, new Date(now.getTime() - HOUR)),
        ),
      );
    if (n >= MESSAGES_PER_HOUR) return { kind: "limit" } as const;
    const [m] = await tx
      .insert(orderMessages)
      .values({
        orderId: o.id,
        body,
        formKey: input.formKey,
        createdAt: now,
      })
      .returning({ id: orderMessages.id });
    return { kind: "sent", messageId: m.id, order: o } as const;
  });
  if (!result) return { kind: "missing" };
  if (result.kind !== "sent") return result;
  if (result.order)
    await queueMail(
      db,
      {
        key: `alert:message:${result.messageId}`,
        template: "alert",
        data: {
          kind: "message-linda",
          view: {
            name: result.order.customerName,
            number: result.order.number,
            message: body,
          },
        },
        to: (await readSettings(db)).email,
        replyTo: result.order.email || null,
      },
      now,
    );
  return { kind: "sent", messageId: result.messageId };
}

/** The message just sent, for the status page banner (`?message=id`, within two minutes). */
export async function recentMessage(
  db: Db,
  orderId: number,
  messageId: number,
  now = new Date(),
) {
  const [m] = await db
    .select({ id: orderMessages.id, at: orderMessages.createdAt })
    .from(orderMessages)
    .where(
      and(eq(orderMessages.orderId, orderId), eq(orderMessages.id, messageId)),
    );
  return m && now.getTime() - m.at.getTime() < BANNER_MS ? m : null;
}
