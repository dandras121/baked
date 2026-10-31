import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/legal-page";
import { getLegalPage } from "@/db/legal-repo";
import { getSiteSettings } from "@/db/site-settings";
import { fillLegal, parseLegal, updatedLabel } from "@/lib/legal";
import type { LegalSlug } from "@/lib/legal-seed";
import { placeholderValues } from "@/lib/placeholders";

/** Title = the page heading, description = its intro line (§10.12). */
export async function legalMetadata(slug: LegalSlug): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getLegalPage(slug),
    getSiteSettings(),
  ]);
  if (!page) return {};
  return {
    title: page.title,
    description: settings
      ? fillLegal(page.intro, placeholderValues(settings))
      : undefined,
  };
}

/** A legal page from its newest revision, its placeholders filled from the current Settings (§11.8). */
export async function LegalRoute({ slug }: { slug: LegalSlug }) {
  const [page, settings] = await Promise.all([
    getLegalPage(slug),
    getSiteSettings(),
  ]);
  if (!page || !settings) notFound();
  const values = placeholderValues(settings);
  return (
    <LegalPage
      title={page.title}
      intro={fillLegal(page.intro, values)}
      updated={updatedLabel(page.updatedOn)}
      sections={parseLegal(fillLegal(page.body, values))}
      email={settings.email}
      phone={settings.phone}
    />
  );
}
