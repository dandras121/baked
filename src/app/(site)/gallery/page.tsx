import type { Metadata } from "next";
import { GalleryPage } from "@/components/gallery/gallery-page";
import { getGalleryTiles } from "@/db/gallery-repo";
import { GALLERY_INTRO } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  // §4.8 SEO: the intro's first sentence.
  description: GALLERY_INTRO.split(". ")[0] + ".",
  alternates: { canonical: "/gallery" },
};

// Gallery (§4.8). Every showing photo is in the page; the browser pages them 12 at a time and reads `?shown=`.
export default async function Page() {
  return <GalleryPage tiles={await getGalleryTiles()} />;
}
