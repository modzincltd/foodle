import { requireAdmin } from "@/lib/auth/admin";
import { getAllModifierGroups, getMenus } from "@/lib/data/restaurant";
import type { ModifierGroup } from "@/lib/types";
import { MenuEditor } from "./MenuEditor";

export default async function MenuAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  const [menus, { data: groups }] = await Promise.all([getMenus(r.id, { includeHidden: true }), getAllModifierGroups(r.id)]);
  return <MenuEditor slug={slug} currency={r.currency} menus={menus} groups={(groups ?? []) as ModifierGroup[]} />;
}
