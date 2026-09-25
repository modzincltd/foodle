import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
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
  const base = `/r/${slug}`;
  const nav = [
    ["Menu", base],
    ...(r.settings.collection_enabled ? [["Order", `${base}/order`]] : []),
    ...(r.settings.booking_enabled ? [["Book a table", `${base}/book`]] : []),
  ];
  return (
    <div style={{ ["--primary" as string]: r.theme.primary, ["--accent" as string]: r.theme.accent }} className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href={base} className="flex items-center gap-2 font-bold text-lg">
            {r.logo_url ? <img src={r.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="h-8 w-8 rounded-full bg-primary" />}
            {r.name}
          </Link>
          <nav className="flex gap-1 text-sm font-semibold">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full px-3 py-1.5 hover:bg-black/5">{label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        {[r.address_line1, r.city, r.postcode].filter(Boolean).join(", ")} {r.phone && `· ${r.phone}`}
        <div className="mt-1 opacity-60">Powered by Foodle</div>
      </footer>
    </div>
  );
}
