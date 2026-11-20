import { like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  checkCode,
  endSession,
  ensureFirstOwner,
  requestCode,
  sessionMember,
} from "./admin-auth-repo";
import { connect } from "./client";
import {
  adminSessions,
  formSends,
  mailSends,
  signInCodes,
  teamMembers,
} from "./schema";

const url = process.env.TEST_DATABASE_URL;
const device = { name: "Chrome on macOS", place: "Edinburgh" };
const t0 = new Date("2026-11-20T10:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60 * 1000);

describe.skipIf(!url)("database: sign in and sessions (§9.2, §9.15)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  beforeAll(() => migrate(db(), { migrationsFolder: "drizzle" }));
  beforeEach(async () => {
    await db().delete(teamMembers);
    await db().delete(formSends).where(like(formSends.form, "code:%"));
    await db().delete(mailSends).where(like(mailSends.key, "sign-in:%"));
  });
  afterAll(() => conn?.close());

  /** The code in the outbox (the development transport keeps it). */
  async function lastCode() {
    const [m] = await db()
      .select()
      .from(mailSends)
      .where(like(mailSends.key, "sign-in:%"))
      .orderBy(mailSends.id);
    const rows = await db()
      .select()
      .from(mailSends)
      .where(like(mailSends.key, "sign-in:%"));
    const last = rows.sort((a, b) => b.id - a.id)[0] ?? m;
    return (last.data as { view: { code: string } }).view.code.replace(" ", "");
  }
  const owner = () =>
    ensureFirstOwner(db(), { email: "Info@BakedByLinda.co.uk", name: "Linda" });

  it("the first Owner is created once, from the deploy settings, only while the team is empty", async () => {
    expect(await owner()).toBe(true);
    expect(await owner()).toBe(false);
    const rows = await db().select().from(teamMembers);
    expect(rows).toMatchObject([
      { name: "Linda", email: "info@bakedbylinda.co.uk", role: "owner" },
    ]);
    expect(await ensureFirstOwner(db(), { email: "", name: "" })).toBe(false);
  });

  it("a code only for a team member, with the same answer for a stranger", async () => {
    await owner();
    expect(await requestCode(db(), "stranger@example.com", "1.1.1.1", t0)).toBe(
      "sent",
    );
    expect(
      await db()
        .select()
        .from(mailSends)
        .where(like(mailSends.key, "sign-in:%")),
    ).toHaveLength(0);
    expect(
      await requestCode(db(), "INFO@bakedbylinda.co.uk", "1.1.1.1", t0),
    ).toBe("sent");
    const [mail] = await db()
      .select()
      .from(mailSends)
      .where(like(mailSends.key, "sign-in:%"));
    expect(mail).toMatchObject({
      to: "info@bakedbylinda.co.uk",
      template: "alert",
    });
  });

  it("right code → a session for 30 days; wrong ones count down; the 5th wrong uses it up", async () => {
    await owner();
    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", t0);
    const code = await lastCode();
    const bad = code === "000000" ? "111111" : "000000";
    expect(
      await checkCode(db(), "info@bakedbylinda.co.uk", bad, device, at(1)),
    ).toEqual({ kind: "wrong", left: 4 });
    const ok = await checkCode(
      db(),
      "info@bakedbylinda.co.uk",
      code,
      device,
      at(2),
    );
    expect(ok.kind).toBe("ok");
    if (ok.kind !== "ok") return;
    const s = await sessionMember(db(), ok.sessionId, at(3));
    expect(s?.member.name).toBe("Linda");
    expect(s?.session).toMatchObject({
      device: "Chrome on macOS",
      place: "Edinburgh",
    });
    expect(
      await sessionMember(db(), ok.sessionId, at(30 * 24 * 60 + 2)),
    ).toBeNull();
    // The code is used: it cannot sign in twice.
    expect(
      (await checkCode(db(), "info@bakedbylinda.co.uk", code, device, at(4)))
        .kind,
    ).toBe("expired");

    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(5));
    for (const left of [4, 3, 2, 1])
      expect(
        await checkCode(db(), "info@bakedbylinda.co.uk", bad, device, at(6)),
      ).toEqual({ kind: "wrong", left });
    expect(
      await checkCode(db(), "info@bakedbylinda.co.uk", bad, device, at(6)),
    ).toEqual({ kind: "usedUp" });
    expect(
      (
        await checkCode(
          db(),
          "info@bakedbylinda.co.uk",
          await lastCode(),
          device,
          at(7),
        )
      ).kind,
    ).toBe("usedUp");
  });

  it("a code runs out after 10 minutes; a new one ends the earlier", async () => {
    await owner();
    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", t0);
    const first = await lastCode();
    expect(
      (await checkCode(db(), "info@bakedbylinda.co.uk", first, device, at(10)))
        .kind,
    ).toBe("expired");
    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(11));
    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(12));
    const third = await lastCode();
    const live = await db().select().from(signInCodes);
    expect(live.filter((c) => !c.endedAt)).toHaveLength(1);
    expect(
      (await checkCode(db(), "info@bakedbylinda.co.uk", third, device, at(13)))
        .kind,
    ).toBe("ok");
  });

  it("5 an hour per address from one connection, 10 per address, 20 per connection", async () => {
    await owner();
    for (let i = 0; i < 5; i++)
      expect(
        await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(i)),
      ).toBe("sent");
    expect(
      await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(6)),
    ).toBe("tooMany");
    // Another connection can still ask, so a stranger cannot lock Linda out from one place.
    for (let i = 0; i < 5; i++)
      expect(
        await requestCode(db(), "info@bakedbylinda.co.uk", "2.2.2.2", at(7)),
      ).toBe("sent");
    expect(
      await requestCode(db(), "info@bakedbylinda.co.uk", "3.3.3.3", at(8)),
    ).toBe("tooMany");
    expect(
      await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(61)),
    ).toBe("sent");
    for (let i = 0; i < 20; i++)
      await requestCode(db(), `x${i}@example.com`, "9.9.9.9", at(1));
    expect(await requestCode(db(), "y@example.com", "9.9.9.9", at(2))).toBe(
      "tooMany",
    );
  });

  it("sign out and leaving the team end the session at once", async () => {
    await owner();
    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", t0);
    const ok = await checkCode(
      db(),
      "info@bakedbylinda.co.uk",
      await lastCode(),
      device,
      at(1),
    );
    if (ok.kind !== "ok") throw new Error("no session");
    await endSession(db(), ok.sessionId);
    expect(await sessionMember(db(), ok.sessionId, at(2))).toBeNull();
    await requestCode(db(), "info@bakedbylinda.co.uk", "1.1.1.1", at(3));
    const again = await checkCode(
      db(),
      "info@bakedbylinda.co.uk",
      await lastCode(),
      device,
      at(4),
    );
    if (again.kind !== "ok") throw new Error("no session");
    await db().update(teamMembers).set({ status: "invited" });
    expect(await sessionMember(db(), again.sessionId, at(5))).toBeNull();
    expect(await db().select().from(adminSessions)).toHaveLength(1);
  });
});
