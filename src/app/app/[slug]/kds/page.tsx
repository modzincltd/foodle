import { requireStaffPage, StaffShell } from "../StaffShell";
import { kdsOrders } from "../actions";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
import { Kds } from "./Kds";

export default async function KdsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await requireStaffPage(slug, `/app/${slug}/kds`);
  const [orders, r] = await Promise.all([kdsOrders(slug), getRestaurantBySlug(slug)]);
  return (
    <StaffShell slug={slug} staff={staff} active="kds">
      <Kds slug={slug} restaurantId={r!.id} initial={orders} />
    </StaffShell>
  );
}
