import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dayState } from "@/lib/capacity";
import { readCakePage } from "./cake-page-repo";
import { ensureSampleCatalogue } from "./cake-repo";
import { connect } from "./client";
import { addLine, removeLine } from "./draft-repo";
import { capacityFor, extendHold, liveHold, takeHold } from "./hold-repo";
import { closedDays, draftLines, drafts, settings } from "./schema";

const url = process.env.TEST_DATABASE_URL;
process.env.BBL_HOLD_MINUTES = "20";

describe.skipIf(!url)(
  "database: the date hold and capacity (§10.3, §10.4)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let line: Parameters<typeof addLine>[2];
    // Monday 2 November 2026, noon in London; lead time 5 → the earliest day is Saturday 7 November.
    const now = new Date("2026-11-02T12:00:00Z");
    const day = "2026-11-12";

    async function draftWith(cakes: number) {
      const a = await addLine(db(), undefined, line, now);
      for (let i = 1; i < cakes; i++) await addLine(db(), a.draftId, line, now);
      return a.draftId;
    }
    const draftRow = async (id: string) =>
      (await db().select().from(drafts).where(eq(drafts.id, id)))[0];

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSampleCatalogue(db());
      const c = (await readCakePage(db(), "the-lothian"))!;
      line = {
        cakeId: c.id,
        sizeId: c.sizes[0].id,
        answers: { picks: {}, texts: {} },
        inscription: "",
      };
    });
    beforeEach(async () => {
      await db().delete(drafts);
      await db().delete(closedDays);
      await db()
        .update(settings)
        .set({ dailyCap: 2, weeklyCap: 9, leadTimeDays: 5 });
    });
    afterAll(async () => conn?.close());

    it("a hold counts every cake of the order on that day for everyone else; your own never blocks you", async () => {
      const mine = await draftWith(2);
      expect((await takeHold(db(), mine, day, "a", now)).kind).toBe("held");
      const other = await draftWith(1);
      const forOther = await capacityFor(db(), await draftRow(other), now);
      expect(forOther.dayCounts.get(day)).toBe(2);
      expect(dayState(day, forOther)).toBe("full");
      const forMe = await capacityFor(db(), await draftRow(mine), now);
      expect(dayState(day, forMe)).toBe("selected");
    });

    it("the last slot: two buyers at the same moment — one holds, the other is offered other dates", async () => {
      const a = await draftWith(1);
      const b = await draftWith(1);
      const c = await draftWith(1);
      await takeHold(db(), c, day, "c", now); // one of two slots taken
      const both = await Promise.all([
        takeHold(db(), a, day, "a", now),
        takeHold(db(), b, day, "b", now),
      ]);
      expect(both.map((r) => r.kind).sort()).toEqual(["held", "taken"]);
      const taken = both.find((r) => r.kind === "taken");
      expect(taken && taken.kind === "taken" && taken.chips.length).toBe(3);
    });

    it("an expired hold is gone: the day is back for others and liveHold is null", async () => {
      const a = await draftWith(2);
      await takeHold(db(), a, day, "a", now);
      const later = new Date(now.getTime() + 20 * 60_000 + 1000);
      expect(liveHold(await draftRow(a), later)).toBeNull();
      const b = await draftWith(1);
      expect(
        dayState(day, await capacityFor(db(), await draftRow(b), later)),
      ).toBe("available");
    });

    it("Continue on the same date renews (an extension) at most twice; then the hold is kept as it is", async () => {
      const a = await draftWith(1);
      await takeHold(db(), a, day, "a", now);
      const t1 = new Date(now.getTime() + 5 * 60_000);
      const r1 = await takeHold(db(), a, day, "a", t1);
      expect(r1.kind === "held" && r1.hold.extensions).toBe(1);
      const r2 = await takeHold(
        db(),
        a,
        day,
        "a",
        new Date(t1.getTime() + 60_000),
      );
      expect(r2.kind === "held" && r2.hold.extensions).toBe(2);
      const t3 = new Date(t1.getTime() + 120_000);
      const r3 = await takeHold(db(), a, day, "a", t3);
      expect(r3.kind === "held" && r3.hold.expiresAt.getTime()).toBe(
        r2.kind === "held" ? r2.hold.expiresAt.getTime() : 0,
      );
      expect(await extendHold(db(), a, t3)).toBeNull();
    });

    it("Keep holding extends by the hold length while the date is free", async () => {
      const a = await draftWith(1);
      await takeHold(db(), a, day, "a", now);
      const t = new Date(now.getTime() + 18 * 60_000);
      const h = await extendHold(db(), a, t);
      expect(h?.expiresAt.getTime()).toBe(t.getTime() + 20 * 60_000);
    });

    it("a different date replaces the old hold in the same step", async () => {
      const a = await draftWith(2);
      await takeHold(db(), a, day, "a", now);
      await takeHold(db(), a, "2026-11-13", "a", now);
      const b = await draftWith(1);
      const cap = await capacityFor(db(), await draftRow(b), now);
      expect(cap.dayCounts.get(day)).toBeUndefined();
      expect(cap.dayCounts.get("2026-11-13")).toBe(2);
    });

    it("two live holds per connection: a third draft is refused; moving its own hold is never refused", async () => {
      const a = await draftWith(1);
      const b = await draftWith(1);
      const c = await draftWith(1);
      await takeHold(db(), a, "2026-11-10", "same", now);
      await takeHold(db(), b, "2026-11-11", "same", now);
      expect((await takeHold(db(), c, "2026-11-12", "same", now)).kind).toBe(
        "connection",
      );
      expect((await takeHold(db(), a, "2026-11-14", "same", now)).kind).toBe(
        "held",
      );
    });

    it("closed days and too-soon days cannot be held", async () => {
      await db().insert(closedDays).values({ day });
      const a = await draftWith(1);
      expect((await takeHold(db(), a, day, "a", now)).kind).toBe("taken");
      expect((await takeHold(db(), a, "2026-11-05", "a", now)).kind).toBe(
        "taken",
      );
    });

    it("removing cakes shrinks the hold; removing the last releases it", async () => {
      const a = await draftWith(2);
      await takeHold(db(), a, day, "a", now);
      const rows = await db()
        .select()
        .from(draftLines)
        .where(eq(draftLines.draftId, a));
      await removeLine(db(), a, rows[0].id, now);
      const b = await draftWith(1);
      expect(
        (await capacityFor(db(), await draftRow(b), now)).dayCounts.get(day),
      ).toBe(1);
      await removeLine(db(), a, rows[1].id, now);
      expect((await draftRow(a)).holdDate).toBeNull();
    });
  },
);
