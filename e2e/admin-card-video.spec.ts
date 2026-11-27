import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { eq, like } from "drizzle-orm";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { saveCake } from "../src/db/admin-cake-form-repo";
import { addCakePhoto } from "../src/db/cake-media-repo";
import { connect } from "../src/db/client";
import { cakes } from "../src/db/schema";
import { checkCakeForm, EMPTY_CAKE } from "../src/lib/admin/cake-form";
import { settled, signIn } from "./admin-helpers";

// Slice 9.2c: the card video (§9.13, 1801:13221) — Add photo / video, the wrong-file words, the closed and open crops,
// Replace, Remove, and the corner button on the site's card (ANIM-11).
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const name = `Zz Card ${tag}`;
let id = 0;

async function clip(seconds: number, side: number) {
  const dir = await mkdtemp(join(tmpdir(), "bbl-e2e-card-"));
  try {
    const out = join(dir, "card.mp4");
    await promisify(execFile)(ffmpegPath as unknown as string, [
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=${side}x${side}:rate=30:duration=${seconds}`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-y",
      out,
    ]);
    return {
      name: "card.mp4",
      mimeType: "video/mp4",
      buffer: await readFile(out),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test.beforeAll(async () => {
  const { db, close } = connect();
  try {
    const r = await saveCake(
      db,
      null,
      checkCakeForm({
        ...EMPTY_CAKE,
        name,
        whatItIs: "For the card video test.",
        flavour: "Strawberry",
        sizes: [{ id: null, serves: "12", tiers: "1", price: "95" }],
      }).value!,
    );
    id = (r as { id: number }).id;
    const photo = await sharp({
      create: { width: 1800, height: 2250, channels: 3, background: "#e8b4c8" },
    })
      .jpeg()
      .toBuffer();
    await addCakePhoto(db, id, photo);
    await db
      .update(cakes)
      .set({ visible: true })
      .where(eq(cakes.id, id));
  } finally {
    await close();
  }
});
test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(cakes).where(like(cakes.name, `Zz Card ${tag}%`));
  } finally {
    await close();
  }
});

test("card video: wrong file refused, add, crops, replace, remove; the card gets its corner button", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "one cake: one viewport");
  test.setTimeout(180_000);
  await signIn(page, "Linda");
  await page.goto(`/admin/cakes/${id}`);
  const card = page.getByRole("region", { name: "Card video" });
  const pick = async (label: string, f: object) => {
    const chooser = page.waitForEvent("filechooser");
    await card.getByRole("button", { name: label }).click();
    await (await chooser).setFiles(f as never);
  };
  await expect(card.getByText("Closed crop · 8:5")).toBeVisible();
  await expect(card.getByText("Open crop · 1.2:1")).toBeVisible();
  await expect(card.getByRole("button", { name: "Replace" })).toHaveCount(0);

  // Not square: refused before uploading, with the words of §9.13.
  await pick("Add photo / video", await clip(5, 1080));
  await expect(
    card.getByText(
      "The card video must be a square video of about 5 seconds, at least 1440 × 1440.",
    ),
  ).toBeVisible();

  await pick("Add photo / video", await clip(5, 1440));
  const still = card.locator("figure").first().locator("img");
  await expect(still).toHaveAttribute(
    "src",
    new RegExp(`^/media/cakes/${id}/card-.+-still\\.webp$`),
    { timeout: 90_000 },
  );
  const served = await page.request.get((await still.getAttribute("src"))!);
  expect(served.headers()["content-type"]).toBe("image/webp");
  const video = card.locator("figure").nth(1).locator("video");
  await expect(video).toHaveAttribute("src", /-1080\.mp4$/);
  // The crops share the video's bottom edge: the square's bottom meets the box's bottom.
  for (const f of await card.locator("figure").all()) {
    const box = (await f.locator("div").first().boundingBox())!;
    const sq = (await f.locator("div div").first().boundingBox())!;
    expect(Math.abs(sq.y + sq.height - (box.y + box.height))).toBeLessThan(1.5);
  }
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  // The site's card has its corner button now.
  const site = await page.context().newPage();
  await site.goto("/cakes");
  await site.getByRole("searchbox").first().fill(tag);
  await expect(
    site.getByRole("button", { name: `Show the ${name} video` }),
  ).toBeVisible();

  // Replace: a new still; Remove: back to one button, and the card loses its corner button.
  const before = await still.getAttribute("src");
  await pick("Replace", await clip(5, 1440));
  await expect(still).not.toHaveAttribute("src", before!, { timeout: 90_000 });
  await card.getByRole("button", { name: "Remove" }).click();
  await expect(
    card.getByRole("button", { name: "Add photo / video" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Card video" })
      .getByRole("button", { name: "Add photo / video" }),
  ).toBeVisible();
  await site.goto("/cakes");
  await site.getByRole("searchbox").first().fill(tag);
  await expect(site.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(
    site.getByRole("button", { name: `Show the ${name} video` }),
  ).toHaveCount(0);
  // Off the site through the admin, so the cached Home row and catalogue forget it too.
  await page.getByRole("button", { name: "Delete this design" }).click();
  await page
    .getByRole("dialog", { name: `Delete ${name} for good?` })
    .getByRole("button", { name: "Delete it" })
    .click();
  await expect(page).toHaveURL(/\/admin\/cakes\?deleted=1$/);
});
