import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { SignOut } from "./SignOut";

const NAV = [
  ["", "Overview"], ["orders", "Orders"], ["bookings", "Bookings"], ["menu", "Menu"],
  ["tables", "Tables"], ["website", "Website"], ["staff", "Staff"], ["settings", "Settings"],
] as const;

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-card p-4">
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Foodle</div>
          <div className="truncate font-bold">{r.name}</div>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map(([p, label]) => (
            <Link key={p} href={`/admin/${slug}${p ? `/${p}` : ""}`} className="block rounded-lg px-3 py-2 font-medium hover:bg-black/5">{label}</Link>
          ))}
        </nav>
        <div className="mt-6 space-y-1 border-t border-border pt-4 text-xs text-muted">
          <a className="block hover:text-foreground" href={`/r/${slug}`} target="_blank">Public site ↗</a>
          <a className="block hover:text-foreground" href={`/app/${slug}`} target="_blank">Staff till ↗</a>
          <a className="block hover:text-foreground" href={`/api/r/${slug}/menu.pdf`} target="_blank">Menu PDF ↗</a>
          <SignOut />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
