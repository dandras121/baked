import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/home/hero";
import {
  LocalHomeBaked,
  SocialBand,
  WeGotYou,
} from "@/components/home/home-sections";
import styles from "@/components/home/home-sections.module.css";
import { getSiteSettings } from "@/db/site-settings";
import { heroPlaceholdersEnabled, wantsLiveHero } from "@/lib/hero";

// Home: the default title “Baked by Linda — Celebration cakes in West Lothian”; the description is
// the footer tagline (§10.12), with the delivery area from Settings.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return s
    ? {
        description: `Bespoke celebration cakes, made by hand in West Lothian and delivered across ${s.deliveryArea}.`,
      }
    : {};
}

/** Previews: the placeholder slides unless `?hero=live` asks for the live view (decided for 2.1). */
async function PreviewHero({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Hero placeholders={!wantsLiveHero(await searchParams)} />;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <div className={styles.home}>
      {heroPlaceholdersEnabled() ? (
        <Suspense fallback={<Hero placeholders={false} />}>
          <PreviewHero searchParams={searchParams} />
        </Suspense>
      ) : (
        <Hero placeholders={false} />
      )}
      <WeGotYou />
      {/* Slice 2.3: “Try my recipes.” and the cake row open the pink band above “Local, home baked.” */}
      {settings && <LocalHomeBaked town={settings.town} />}
      {/* Slice 2.3: “Special idea?” · slice 2.2: “Thoughts on my work.” (Google reviews) */}
      {settings && (
        <SocialBand
          instagram={settings.instagram}
          facebook={settings.facebook}
        />
      )}
    </div>
  );
}
