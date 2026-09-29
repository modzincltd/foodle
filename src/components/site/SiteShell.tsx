import Link from "next/link";
import type { Restaurant } from "@/lib/types";
import { googleFontsHref, themeVars, type SiteTheme } from "@/lib/site/theme";

/** Themed wrapper (fonts, colours, header, footer) shared by every public page. */
export function SiteShell({ restaurant: r, theme, children }: { restaurant: Restaurant; theme: SiteTheme; children: React.ReactNode }) {
  const base = `/r/${r.slug}`;
  const nav: [string, string][] = [
    ["Menu", base],
    ...(r.settings.collection_enabled ? [["Order", `${base}/order`] as [string, string]] : []),
    ...(r.settings.booking_enabled ? [["Book a table", `${base}/book`] as [string, string]] : []),
  ];
  const address = [r.address_line1, r.city, r.postcode].filter(Boolean).join(", ");
  const logo = r.logo_url ? <img src={r.logo_url} alt="" className="h-10 w-auto max-w-40 object-contain" /> : <span className="h-9 w-9 rounded-full bg-primary" />;

  return (
    <div style={themeVars(theme)} className={`site site-${theme.template} flex min-h-screen flex-col`}>
      <link rel="stylesheet" href={googleFontsHref([theme.heading_font, theme.body_font])} precedence="default" />

      {theme.template === "classic" && (
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href={base} className="heading flex items-center gap-2 text-lg font-bold">{logo}{r.name}</Link>
            <nav className="flex gap-1 text-sm font-semibold">
              {nav.map(([label, href]) => <Link key={href} href={href} className="rounded-full px-3 py-1.5 hover:bg-black/5">{label}</Link>)}
            </nav>
          </div>
        </header>
      )}

      {theme.template === "modern" && (
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Link href={base} className="heading flex items-center gap-3 text-2xl uppercase tracking-wide">{logo}{r.name}</Link>
            <nav className="flex items-center gap-5 text-sm font-medium">
              {nav.slice(0, 1).map(([label, href]) => <Link key={href} href={href} className="hover:text-primary">{label}</Link>)}
              {nav.slice(1).map(([label, href]) => <Link key={href} href={href} className="btn-primary !rounded-full !px-4 !py-2">{label}</Link>)}
            </nav>
          </div>
        </header>
      )}

      {theme.template === "bistro" && (
        <header className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 pt-8 pb-4 text-center">
            <Link href={base} className="heading inline-flex flex-col items-center gap-2 text-4xl italic">
              {r.logo_url && <img src={r.logo_url} alt="" className="h-16 w-auto max-w-56 object-contain" />}
              {r.name}
            </Link>
            {r.tagline && <div className="mt-1 text-xs uppercase tracking-[0.3em] text-accent">{r.tagline}</div>}
            <nav className="mt-4 flex justify-center gap-8 text-sm uppercase tracking-widest">
              {nav.map(([label, href]) => <Link key={href} href={href} className="hover:text-primary">{label}</Link>)}
            </nav>
          </div>
        </header>
      )}

      <main className={`mx-auto w-full flex-1 px-4 pb-24 ${theme.template === "modern" ? "max-w-6xl" : theme.template === "bistro" ? "max-w-4xl" : "max-w-5xl"}`}>{children}</main>

      <footer className={`border-t border-border py-8 text-xs text-muted ${theme.template === "modern" ? "" : "text-center"}`}>
        <div className={theme.template === "modern" ? "mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4" : ""}>
          <div>{address} {r.phone && `· ${r.phone}`}</div>
          <div className="mt-1 opacity-60">Powered by Foodle</div>
        </div>
      </footer>
    </div>
  );
}
