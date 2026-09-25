import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Area, Menu, MenuItem, ModifierGroup, OpeningHours, Restaurant, Table } from "@/lib/types";

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const { data } = await supabaseAdmin().from("restaurants").select("*").eq("slug", slug).maybeSingle();
  return (data as Restaurant) ?? null;
}

export async function getOpeningHours(restaurantId: string): Promise<OpeningHours[]> {
  const { data } = await supabaseAdmin()
    .from("opening_hours")
    .select("id,kind,day_of_week,opens,closes")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week")
    .order("opens");
  return (data as OpeningHours[]) ?? [];
}

export async function getTables(restaurantId: string): Promise<{ tables: Table[]; areas: Area[] }> {
  const db = supabaseAdmin();
  const [t, a] = await Promise.all([
    db.from("tables").select("*").eq("restaurant_id", restaurantId).eq("active", true).order("sort"),
    db.from("areas").select("id,name,sort").eq("restaurant_id", restaurantId).order("sort"),
  ]);
  return { tables: (t.data as Table[]) ?? [], areas: (a.data as Area[]) ?? [] };
}

/**
 * Full menu tree for a restaurant. `channel` filters menus (dine_in, collection, website...).
 * Includes unavailable items only when `includeHidden` (admin / POS 86 view).
 */
export async function getMenus(
  restaurantId: string,
  opts: { channel?: string; includeHidden?: boolean } = {},
): Promise<Menu[]> {
  const db = supabaseAdmin();
  let mq = db.from("menus").select("*").eq("restaurant_id", restaurantId).order("sort");
  if (!opts.includeHidden) mq = mq.eq("active", true);
  const { data: menus } = await mq;
  if (!menus || menus.length === 0) return [];

  const menuIds = menus.map((m) => m.id);
  const [{ data: cats }, { data: items }, { data: groups }, { data: options }, { data: links }] =
    await Promise.all([
      db.from("menu_categories").select("*").in("menu_id", menuIds).order("sort"),
      db.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort"),
      db.from("modifier_groups").select("*").eq("restaurant_id", restaurantId).order("sort"),
      db.from("modifier_options").select("*").order("sort"),
      db.from("item_modifier_groups").select("*").order("sort"),
    ]);

  const groupMap = new Map<string, ModifierGroup>();
  for (const g of groups ?? []) {
    groupMap.set(g.id, {
      ...g,
      options: (options ?? [])
        .filter((o) => o.group_id === g.id && (opts.includeHidden || o.available))
        .map((o) => ({ id: o.id, name: o.name, price_pence: o.price_pence, available: o.available, sort: o.sort })),
    });
  }

  const linksByItem = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = linksByItem.get(l.item_id) ?? [];
    arr.push(l.group_id);
    linksByItem.set(l.item_id, arr);
  }

  const itemsByCat = new Map<string, MenuItem[]>();
  for (const it of items ?? []) {
    if (!opts.includeHidden && !it.available) continue;
    const mi: MenuItem = {
      ...it,
      modifier_groups: (linksByItem.get(it.id) ?? [])
        .map((gid) => groupMap.get(gid))
        .filter((g): g is ModifierGroup => !!g),
    };
    const arr = itemsByCat.get(it.category_id) ?? [];
    arr.push(mi);
    itemsByCat.set(it.category_id, arr);
  }

  return menus
    .filter((m) => !opts.channel || (m.channels as string[]).includes(opts.channel))
    .map((m) => ({
      ...m,
      categories: (cats ?? [])
        .filter((c) => c.menu_id === m.id)
        .map((c) => ({ ...c, items: itemsByCat.get(c.id) ?? [] })),
    }));
}

export function getAllModifierGroups(restaurantId: string) {
  return supabaseAdmin()
    .from("modifier_groups")
    .select("*, options:modifier_options(*)")
    .eq("restaurant_id", restaurantId)
    .order("sort");
}
