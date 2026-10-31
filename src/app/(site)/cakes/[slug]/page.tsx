import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CakePage } from "@/components/cake-page/cake-page";
import { getCakePage } from "@/db/cake-page-repo";
import { getVisibleSlugs } from "@/db/home-repo";

// The cake page (§5.1). Hidden and deleted cakes are 404 (§11.3).

// Unknown and hidden slugs never reach this page: src/proxy.ts answers them with a real 404.
export async function generateStaticParams() {
  const slugs = await getVisibleSlugs();
  // Next needs at least one entry with cache components; an unknown slug then renders as 404.
  return (slugs.length ? slugs : ["the-lothian"]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const cake = await getCakePage((await params).slug);
  return cake ? { title: cake.name, description: cake.whatItIs } : {};
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cake = await getCakePage((await params).slug);
  if (!cake) notFound();
  return <CakePage cake={cake} />;
}
