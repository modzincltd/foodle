import { notFound, redirect } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
import { getStaffSession } from "@/lib/auth/staff";
import { PinPad } from "./PinPad";

export default async function StaffLogin({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ next?: string }> }) {
  const { slug } = await params;
  const { next } = await searchParams;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const s = await getStaffSession();
  if (s?.slug === slug) redirect(next ?? `/app/${slug}/pos`);
  return (
    <main className="staff-app flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-6 text-center">
        <div className="text-sm uppercase tracking-widest text-stone-400">Staff</div>
        <h1 className="text-3xl font-bold">{r.name}</h1>
      </div>
      <PinPad slug={slug} next={next} />
    </main>
  );
}
