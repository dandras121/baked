import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { like } from "drizzle-orm";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { saveCake } from "../src/db/admin-cake-form-repo";
import { connect } from "../src/db/client";
import { cakes } from "../src/db/schema";
import { checkCakeForm, EMPTY_CAKE } from "../src/lib/admin/cake-form";
import { settled, signIn } from "./admin-helpers";

// Slice 9.2a: a cake's photos (§9.13) — Add photos, the main photo's focal point, Describe this photo, Make the main
// photo, × Remove, and the card on the site. Slice 9.2b: Add a video, “Preparing the video…”, Change the cover.
const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const name = `Zz Photo ${tag}`;
let id = 0;

const file = async (colour: string) => ({
  name: `${colour}.jpg`,
  mimeType: "image/jpeg",
  buffer: await sharp({
    create: { width: 1800, height: 2250, channels: 3, background: colour },
  })
    .jpeg()
    .toBuffer(),
});

/** A synthetic clip (ffmpeg's test pattern), as a phone would send it. */
async function clip(seconds: number) {
  const dir = await mkdtemp(join(tmpdir(), "bbl-e2e-clip-"));
  try {
    const out = join(dir, "clip.mp4");
    await promisify(execFile)(ffmpegPath as unknown as string, [
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=360x640:rate=10:duration=${seconds}`,
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
      name: "cake.mp4",
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
        whatItIs: "For the photo test.",
        flavour: "Strawberry",
        sizes: [{ id: null, serves: "12", tiers: "1", price: "95" }],
      }).value!,
    );
    id = (r as { id: number }).id;
  } finally {
    await close();
  }
});
test.afterAll(async () => {
  const { db, close } = connect();
  try {
    await db.delete(cakes).where(like(cakes.name, `Zz Photo ${tag}%`));
  } finally {
    await close();
  }
});

test("photos: add, describe, focal point, make main, remove; the card shows the main photo", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "one cake: one viewport");
  await signIn(page, "Linda");
  await page.goto(`/admin/cakes/${id}`);
  await expect(
    page.getByText("Pinch or drag to reposition.", { exact: false }),
  ).toBeVisible();
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([await file("#e8b4c8"), await file("#b4c8e8")]);
  const main = page.getByRole("group", { name: /^The main photo/ });
  await expect(main.locator("img")).toHaveAttribute(
    "src",
    new RegExp(`^/media/cakes/${id}/`),
  );
  await expect(
    page.getByRole("button", { name: /^Select this photo/ }),
  ).toHaveCount(1);
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  // Describe the main photo; move its focal point with the keyboard.
  await page
    .getByLabel("Describe this photo (alt text)")
    .fill("Pink sponge, three tiers");
  await main.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await expect(main.locator("img")).toHaveAttribute(
    "style",
    /object-position: ?55% 45%/,
  );
  await page.waitForTimeout(400);
  await page.reload();
  await expect(main.locator("img")).toHaveAttribute(
    "alt",
    "Pink sponge, three tiers",
  );
  await expect(main.locator("img")).toHaveAttribute(
    "style",
    /object-position: ?55% 45%/,
  );

  // Make the second one the main photo, then remove the first.
  const firstSrc = await main.locator("img").getAttribute("src");
  await page.getByRole("button", { name: "Make the main photo" }).click();
  await expect(main.locator("img")).not.toHaveAttribute("src", firstSrc!);
  await page
    .getByRole("button", { name: "Remove Pink sponge, three tiers" })
    .click();
  const confirm = page.getByRole("dialog", { name: "Remove this photo?" });
  await expect(confirm).toContainText("Orders already placed keep their copy.");
  await confirm.getByRole("button", { name: "Remove it" }).click();
  await expect(page.getByRole("button", { name: /^Select / })).toHaveCount(0);

  // Show it on the site: the card has the photo.
  await page.locator("label").filter({ hasText: "Showing" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/cakes\?saved=1$/);
  await page.goto("/cakes");
  // Found with the catalogue's own search (it may be past the first page).
  await page.getByRole("searchbox").first().fill(tag);
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(card.locator("img").first()).toHaveAttribute(
    "src",
    new RegExp(`^/media/cakes/${id}/`),
  );
  const shown = await card.locator("img").first().getAttribute("src");
  const r = await page.request.get(shown!);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("image/jpeg");
  expect(r.headers()["cache-control"]).toContain("immutable");

  // The last photo of a showing cake stays.
  await page.goto(`/admin/cakes/${id}`);
  await expect(
    page.getByRole("button", { name: "Replace the main photo" }),
  ).toBeVisible();
});

test("videos: preparing, then a tile with its cover; Change the cover; too long is refused; two at most", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "one cake: one viewport");
  test.setTimeout(120_000);
  await signIn(page, "Linda");
  await page.goto(`/admin/cakes/${id}`);
  const addVideo = page.getByRole("button", { name: "Add a video" });
  const pick = async (button: typeof addVideo, f: object) => {
    const chooser = page.waitForEvent("filechooser");
    await button.click();
    await (await chooser).setFiles(f as never);
  };

  await pick(addVideo, await clip(2));
  await expect(page.getByText("Preparing the video…")).toBeVisible();
  const cover = page.getByRole("button", { name: "Change the cover" });
  await expect(cover).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Preparing the video…")).toHaveCount(0);
  const tile = page.getByRole("button", { name: /^Select this video/ });
  const poster = await tile.locator("img").getAttribute("src");
  expect(poster).toMatch(new RegExp(`^/media/cakes/${id}/.+-cover\\.jpg$`));

  // Change the cover: an uploaded picture replaces the first frame.
  await pick(cover, await file("#c8e8b4"));
  await expect(tile.locator("img")).not.toHaveAttribute("src", poster!, {
    timeout: 20_000,
  });
  await settled(page);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);

  // Longer than a minute: nothing is added, the words say so.
  await pick(addVideo, await clip(61));
  await expect(
    page.getByText("That video is longer than a minute. Nothing was added."),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("button", { name: /^Select this video/ }),
  ).toHaveCount(1);

  // A second video fills the two places: Add a video is disabled.
  await pick(addVideo, await clip(1));
  await expect(
    page.getByRole("button", { name: "Change the cover" }),
  ).toHaveCount(2, {
    timeout: 60_000,
  });
  await expect(addVideo).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /^Select this video/ }),
  ).toHaveCount(2);
});
