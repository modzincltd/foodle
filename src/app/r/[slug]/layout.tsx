import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
import { normalizeTheme } from "@/lib/site/theme";
import { SiteShell } from "@/components/site/SiteShell";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  return { title: r ? { absolute: r.name } : "Restaurant", description: r?.tagline ?? undefined };
}

export default async function RestaurantLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  return <SiteShell restaurant={r} theme={normalizeTheme(r.theme)}>{children}</SiteShell>;
}
