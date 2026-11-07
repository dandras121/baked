import { eq } from "drizzle-orm";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { legalPdfFor } from "@/db/legal-pdf-repo";
import { TEMPLATES } from "@/db/mail-templates";
import { mailSends } from "@/db/schema";

/** GET /dev/mail/pdf?id={send}&name={file}: an attachment of an outbox e-mail (developer page; removed live, 10.2). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = Number(u.searchParams.get("id"));
  const name = u.searchParams.get("name") ?? "";
  if (!databaseUrl() || !id) return new Response("Not found", { status: 404 });
  const { db, close } = connect();
  try {
    const [row] = await db.select().from(mailSends).where(eq(mailSends.id, id));
    const template = row && TEMPLATES[row.template];
    const email =
      template &&
      (await template(
        row.data as Record<string, unknown>,
        db,
        SITE_URL,
        new Date(),
      ));
    const file = email?.attachments?.find((a) => a.name === name);
    const base64 =
      file && (await legalPdfFor(db, file.revisionId, file.facts, file.name));
    if (!base64) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(base64, "base64"), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
      },
    });
  } finally {
    await close();
  }
}
