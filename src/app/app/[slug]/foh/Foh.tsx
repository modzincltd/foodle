"use client";
import { useCallback, useState, useTransition } from "react";
import type { Booking, BookingStatus } from "@/lib/types";
import { useRestaurantChannel } from "@/components/useRestaurantChannel";
import { fohBookingsToday, fohSetBooking } from "../actions";

const NEXT: Partial<Record<BookingStatus, { label: string; to: BookingStatus; cls: string }[]>> = {
  pending: [{ label: "Confirm", to: "confirmed", cls: "bg-blue-600" }, { label: "Decline", to: "cancelled", cls: "bg-stone-700" }],
  confirmed: [{ label: "Seat", to: "seated", cls: "bg-green-600" }, { label: "No-show", to: "no_show", cls: "bg-stone-700" }, { label: "Cancel", to: "cancelled", cls: "bg-stone-700" }],
  seated: [{ label: "Finished", to: "completed", cls: "bg-stone-600" }],
};

export function Foh({ slug, restaurantId, tz, initial }: { slug: string; restaurantId: string; tz: string; initial: Booking[] }) {
  const [bookings, setBookings] = useState(initial);
  const [, start] = useTransition();
  const refresh = useCallback(() => fohBookingsToday(slug).then((r) => setBookings(r.bookings)), [slug]);
  useRestaurantChannel(restaurantId, "bookings", refresh);
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-3 text-xl font-bold">Bookings — next 24h</h1>
      {bookings.length === 0 && <p className="text-stone-500">No bookings.</p>}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {bookings.map((b) => (
          <div key={b.id} className={`rounded-2xl bg-stone-900 p-4 ${["cancelled", "no_show", "completed"].includes(b.status) ? "opacity-50" : ""}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black tabular-nums">{time(b.starts_at)}</span>
              <span className="chip bg-stone-800 capitalize">{b.status.replace("_", " ")}</span>
            </div>
            <div className="mt-1 font-semibold">{b.customer_name} <span className="text-stone-400">· {b.party_size} guests · {b.table?.name ?? "unassigned"}</span></div>
            <div className="text-sm text-stone-400">{b.customer_phone} {b.customer_email && `· ${b.customer_email}`}</div>
            {b.notes && <div className="mt-1 text-sm italic text-amber-300">{b.notes}</div>}
            <div className="mt-3 flex gap-2">
              {(NEXT[b.status] ?? []).map((a) => (
                <button key={a.to} className={`btn flex-1 py-1.5 text-sm text-white ${a.cls}`} onClick={() => start(async () => { await fohSetBooking(slug, b.id, a.to); refresh(); })}>{a.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
