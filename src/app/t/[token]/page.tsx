import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMenus } from "@/lib/data/restaurant";
import { openTableOrders } from "@/lib/data/orders";
import type { Restaurant } from "@/lib/types";
import { TabletMenu } from "./TabletMenu";

export default async function TabletPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: table } = await supabaseAdmin().from("tables").select("id,name,restaurant_id,active").eq("tablet_token", token).maybeSingle();
  if (!table || !table.active) notFound();
  const { data: r } = await supabaseAdmin().from("restaurants").select("*").eq("id", table.restaurant_id).single();
  const restaurant = r as Restaurant;
  const [menus, open] = await Promise.all([getMenus(restaurant.id, { channel: "dine_in" }), openTableOrders(restaurant.id)]);
  return (
    <TabletMenu
      token={token}
      restaurant={{ id: restaurant.id, name: restaurant.name, currency: restaurant.currency, theme: restaurant.theme }}
      table={{ id: table.id, name: table.name }}
      menus={menus}
      order={open[table.id] ?? null}
    />
  );
}
