import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession, type StaffSession } from "@/lib/auth/staff";
import { staffLogout } from "./actions";

export async function requireStaffPage(slug: string, path: string): Promise<StaffSession> {
  const s = await getStaffSession();
  if (!s || s.slug !== slug) redirect(`/app/${slug}?next=${encodeURIComponent(path)}`);
  return s;
}

export function StaffShell({ slug, staff, active, children }: { slug: string; staff: StaffSession; active: "pos" | "kds" | "foh"; children: React.ReactNode }) {
  const tabs = [
    ["pos", "Till"],
    ["kds", "Kitchen"],
    ["foh", "Orders & Bookings"],
  ] as const;
  return (
    <div className="staff-app flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-stone-800 bg-stone-950 px-3 py-2">
        <span className="mr-2 font-black text-accent">Foodle</span>
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/app/${slug}/${k}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${active === k ? "bg-stone-800 text-white" : "text-stone-400 hover:text-white"}`}>{label}</Link>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm text-stone-400">
          <span>{staff.name} · {staff.role}</span>
          <form action={staffLogout.bind(null, slug)}>
            <button className="rounded-lg border border-stone-700 px-2 py-1 text-xs">Lock</button>
          </form>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
