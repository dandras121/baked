import { like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "@/db/client";
import { hashForToken, listState } from "@/db/consent-repo";
import { attemptByToken } from "@/db/delivery-repo";
import { orderForToken } from "@/db/order-link-repo";
import { payLinkByToken, payLinkState } from "@/db/pay-link-repo";
import { orders } from "@/db/schema";
import { ensureSettings } from "@/db/settings-repo";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { statusState } from "@/lib/order-status";
import {
  CHECK_UNSUBSCRIBE,
  checkLinks,
  checkOrders,
  resetCheckOrders,
} from "./check-pack";

const url = process.env.TEST_DATABASE_URL;
const today = "2026-11-08";
const now = new Date("2026-11-08T11:00:00Z");
const tok = (path: string) => path.split("/").pop()!;

describe.skipIf(!url)("the check orders of the phase 6 document", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  afterAll(async () => {
    await db().delete(orders).where(like(orders.number, "BBL-CHK-%"));
    await conn?.close();
  });

  it("reset twice keeps the same links; each opens its order in the state the document says", async () => {
    await resetCheckOrders(db(), today, now);
    await resetCheckOrders(db(), today, now);
    const rows = await db()
      .select()
      .from(orders)
      .where(like(orders.number, "BBL-CHK-%"));
    expect(rows).toHaveLength(checkOrders(today).length);
    const state = async (key: string) => {
      const f = await orderForToken(db(), tok(checkLinks.status(key)), now);
      expect(f, key).not.toBeNull();
      return f!.valid
        ? statusState(
            { status: f!.order.status, date: String(f!.order.date) },
            today,
          )
        : "D";
    };
    expect(await state("a-delivery")).toBe("A");
    expect(await state("b-tomorrow")).toBe("B");
    expect(await state("b2-today")).toBe("B2");
    expect(await state("c-after")).toBe("C");
    expect(await state("expired")).toBe("D");
    for (const k of [
      "collect",
      "redeliver",
      "free",
      "tomorrow-closed",
      "choices-closed",
      "first-attempt",
    ])
      expect(
        await attemptByToken(db(), tok(checkLinks.delivery(k))),
        k,
      ).not.toBeNull();
    for (const [k, s] of [
      ["deposit", "open"],
      ["withdrawn", "gone"],
      ["paid", "paid"],
    ] as const) {
      const f = await payLinkByToken(db(), tok(checkLinks.pay(k)));
      expect(payLinkState(f!.link, f!.order, today), k).toBe(s);
    }
    const hash = await hashForToken(db(), CHECK_UNSUBSCRIBE);
    expect(await listState(db(), hash!, "yearly")).toBe("in");
  });
});
