import { requireStaffPage, StaffShell } from "../StaffShell";
import { fohBookingsToday } from "../actions";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
import { Foh } from "./Foh";

export default async function FohPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await requireStaffPage(slug, `/app/${slug}/foh`);
  const [{ bookings, tz }, r] = await Promise.all([fohBookingsToday(slug), getRestaurantBySlug(slug)]);
  return (
    <StaffShell slug={slug} staff={staff} active="foh">
      <Foh slug={slug} restaurantId={r!.id} tz={tz} initial={bookings} />
    </StaffShell>
  );
}
