import { notFound } from "next/navigation";
import { getMenus, getOpeningHours, getRestaurantBySlug } from "@/lib/data/restaurant";
import { normalizeTheme } from "@/lib/site/theme";
import { HomeContent } from "@/components/site/HomeContent";

export default async function RestaurantHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const [menus, hours] = await Promise.all([getMenus(r.id, { channel: "website" }), getOpeningHours(r.id)]);
  return <HomeContent theme={normalizeTheme(r.theme)} restaurant={r} menus={menus} hours={hours.filter((h) => h.kind === "service")} />;
}
