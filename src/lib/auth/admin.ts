import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Restaurant } from "@/lib/types";

/** Restaurants the signed-in admin user can manage. */
export async function myRestaurants(): Promise<Restaurant[]> {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from("restaurant_users").select("restaurant:restaurants(*)").eq("user_id", user.id);
  return (data ?? []).map((r) => r.restaurant as unknown as Restaurant);
}

/** Ensure the signed-in admin manages `slug`; returns the restaurant. */
export async function requireAdmin(slug: string): Promise<Restaurant> {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/admin/login?next=/admin/${slug}`);
  const { data: r } = await supabaseAdmin().from("restaurants").select("*").eq("slug", slug).maybeSingle();
  if (!r) redirect("/admin");
  const { data: m } = await supabaseAdmin().from("restaurant_users").select("role").eq("restaurant_id", r.id).eq("user_id", user.id).maybeSingle();
  if (!m) redirect("/admin");
  return r as Restaurant;
}
