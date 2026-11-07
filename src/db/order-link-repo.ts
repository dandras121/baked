// The status link's server side (§6.1, §6.7, §10.5): the order behind a token, the second check with its limits,
// and “Send me a new link” (e-mail 16 for the address's orders whose link still works; never says whether any did).
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { londonDate } from "@/lib/london-time";
import { CHECK, statusLinkValid } from "@/lib/order-link";
import type { connect } from "./client";
import { takeFormSend } from "./contact-repo";
import { emailHash, normalEmail } from "./consent-repo";
import { queueMail } from "./mail-repo";
import { linkChecks, orderLines, orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];

const HOUR = 60 * 60 * 1000;

/** The order behind a status token, and whether the link still works; null for an unknown token. */
export async function orderForToken(db: Db, token: string, now = new Date()) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.token, token));
  if (!o) return null;
  return { order: o, valid: statusLinkValid(String(o.date), now) };
}

/** “link” when this link has had 5 wrong answers in the last 15 minutes, “connection” at 20 wrong in an hour. */
export async function checkLocked(
  db: Db,
  orderId: number,
  connection: string,
  now = new Date(),
): Promise<"link" | "connection" | null> {
  const [{ n: onLink }] = await db
    .select({ n: count() })
    .from(linkChecks)
    .where(
      and(
        eq(linkChecks.orderId, orderId),
        eq(linkChecks.ok, false),
        gte(linkChecks.at, new Date(now.getTime() - CHECK.lockMs)),
      ),
    );
  if (onLink >= CHECK.perLink) return "link";
  const [{ n: fromHere }] = await db
    .select({ n: count() })
    .from(linkChecks)
    .where(
      and(
        eq(linkChecks.connection, connection),
        eq(linkChecks.ok, false),
        gte(linkChecks.at, new Date(now.getTime() - HOUR)),
      ),
    );
  return fromHere >= CHECK.perConnection ? "connection" : null;
}

export async function recordCheck(
  db: Db,
  orderId: number,
  connection: string,
  ok: boolean,
  now = new Date(),
) {
  await db.insert(linkChecks).values({ orderId, connection, ok, at: now });
}

/**
 * Send me a new link / Find my order (§6.1 D, §6.7): counted per address (3 an hour) and per connection (5 an hour)
 * — one shared counter for both pages. Then e-mail 16 lists the address's orders whose link still works (only the
 * one with that number when a number is given). The answer is the same whether anything matched.
 */
export async function sendOrderLinks(
  db: Db,
  input: { email: string; number?: string | null; connection: string },
  now = new Date(),
): Promise<"sent" | "limit-address" | "limit-connection"> {
  const email = normalEmail(input.email);
  if (!(await takeFormSend(db, "find-ip", input.connection, now, 5)))
    return "limit-connection";
  if (!(await takeFormSend(db, "find-address", emailHash(email), now, 3)))
    return "limit-address";
  const wanted = input.number ? numberDigits(input.number) : null;
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      date: orders.date,
      token: orders.token,
    })
    .from(orders)
    .where(
      and(
        sql`lower(trim(${orders.email})) = ${email}`,
        inArray(orders.status, [
          "confirmed",
          "completed",
          "cancelled",
          "refunded",
        ]),
      ),
    );
  const live = rows
    .filter((o) => statusLinkValid(String(o.date), now))
    .filter(
      (o) =>
        !wanted ||
        (wanted.length >= 4 && numberDigits(o.number).endsWith(wanted)),
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!live.length) return "sent";
  const lines = await db
    .select({ orderId: orderLines.orderId, name: orderLines.name })
    .from(orderLines)
    .where(
      inArray(
        orderLines.orderId,
        live.map((o) => o.id),
      ),
    )
    .orderBy(orderLines.position);
  await queueMail(
    db,
    {
      key: `link:${emailHash(email).slice(0, 16)}:${now.getTime()}`,
      template: "order-link",
      data: {
        view: {
          today: londonDate(now),
          orders: live.map((o) => ({
            number: o.number,
            date: String(o.date),
            token: o.token,
            cakes: lines
              .filter((l) => l.orderId === o.id)
              .map((l) => l.name)
              .join(", "),
          })),
        },
      },
      to: input.email.trim(),
    },
    now,
  );
  return "sent";
}

/** “BBL-2026-0147”, “bbl20260147” and “0147” all match BBL-2026-0147 (§6.7). */
export const numberDigits = (n: string) => n.replace(/\D/g, "");
