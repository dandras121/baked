import type { Metadata } from "next";
import { connection } from "next/server";
import { TodayScreen } from "@/components/admin/today/today-screen";
import { connect, databaseUrl } from "@/db/client";
import { readSettings } from "@/db/settings-repo";
import { nextHandoverDay, todayBoard, todayNumbers } from "@/db/today-repo";
import { requireMember } from "@/lib/admin/session";
import { SIGN_IN_COPY } from "@/lib/admin/sign-in";
import { londonDate } from "@/lib/london-time";

export const metadata: Metadata = { title: "Today" };
export const instant = false;

// Today (§9.3; 932:8165, phone 948:8761).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  await connection();
  const { member } = await requireMember();
  const { for: forWho } = await searchParams;
  const day = londonDate(new Date());
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const rows = await todayBoard(db, day);
    const [numbers, settings, next] = await Promise.all([
      todayNumbers(db, day, rows),
      readSettings(db),
      rows.length ? Promise.resolve(null) : nextHandoverDay(db, day),
    ]);
    return (
      <TodayScreen
        day={day}
        rows={rows}
        numbers={numbers}
        owner={member.role === "owner"}
        kitchen={settings.addressLine}
        next={next}
        notice={forWho === "owner" ? SIGN_IN_COPY.owner : null}
      />
    );
  } finally {
    await close();
  }
}
