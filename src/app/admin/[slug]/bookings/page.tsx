import { requireAdmin } from "@/lib/auth/admin";
import { listBookings } from "@/lib/data/bookings";
import { getTables } from "@/lib/data/restaurant";
import { fromLocal, localParts } from "@/lib/data/slots";
import { BookingsDay } from "./BookingsDay";

export default async function BookingsAdmin({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> }) {
  const { slug } = await params;
  const { date } = await searchParams;
  const r = await requireAdmin(slug);
  const day = date ?? localParts(new Date(), r.timezone).date;
  const from = fromLocal(day, 0, r.timezone), to = new Date(from.getTime() + 86_400_000);
  const [bookings, { tables }] = await Promise.all([listBookings(r.id, from.toISOString(), to.toISOString()), getTables(r.id)]);
  return <BookingsDay slug={slug} day={day} tz={r.timezone} bookings={bookings} tables={tables} />;
}
