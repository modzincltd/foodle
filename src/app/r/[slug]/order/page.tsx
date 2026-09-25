import { notFound } from "next/navigation";
import { getMenus, getRestaurantBySlug } from "@/lib/data/restaurant";
import { nextDays } from "@/lib/data/slots";
import { OrderClient } from "./OrderClient";

export default async function OrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r || !r.settings.collection_enabled) notFound();
  const menus = await getMenus(r.id, { channel: "collection" });
  return <OrderClient slug={slug} currency={r.currency} menus={menus} days={nextDays(7, r.timezone)} />;
}
