import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuildStub } from "@/components/stub/build-stub";
import { getVisibleCake, getVisibleSlugs } from "@/db/home-repo";

// Temporary stand-in so the Home cards' View can be followed (2.3); the real cake page is slice 3.3.
// Hidden and deleted cakes are 404 (§11.3).

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
  const cake = await getVisibleCake((await params).slug);
  return cake ? { title: cake.name } : {};
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cake = await getVisibleCake((await params).slug);
  if (!cake) notFound();
  return <BuildStub title={cake.name} slice="3.3" />;
}
