import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
import { nextDays } from "@/lib/data/slots";
import { BookClient } from "./BookClient";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r || !r.settings.booking_enabled) notFound();
  return (
    <div className="mx-auto max-w-lg pt-6">
      <h1 className="text-2xl font-bold">Book a table</h1>
      <p className="mb-6 text-muted">{r.name}</p>
      <BookClient slug={slug} days={nextDays(30, r.timezone)} maxParty={r.settings.booking_max_party} phone={r.phone} />
    </div>
  );
}
