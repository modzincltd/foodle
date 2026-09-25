import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Booking, BookingStatus, Restaurant, Table } from "@/lib/types";
import { getOpeningHours, getTables } from "./restaurant";
import { slotsForDate, type Slot } from "./slots";
import { notifyRestaurant } from "./realtime";

const ACTIVE: BookingStatus[] = ["pending", "confirmed", "seated"];

export async function listBookings(restaurantId: string, fromIso: string, toIso: string): Promise<Booking[]> {
  const { data } = await supabaseAdmin()
    .from("bookings")
    .select("*, table:tables(name)")
    .eq("restaurant_id", restaurantId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at");
  return (data as Booking[]) ?? [];
}

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number) {
  return aStart < bStart + bDur * 60_000 && bStart < aStart + aDur * 60_000;
}

/** Find a free table that fits the party at the given time (smallest suitable first). */
async function findFreeTable(
  restaurantId: string,
  startsAt: Date,
  duration: number,
  partySize: number,
): Promise<Table | null> {
  const { tables } = await getTables(restaurantId);
  const dayStart = new Date(startsAt.getTime() - 6 * 3600_000).toISOString();
  const dayEnd = new Date(startsAt.getTime() + 6 * 3600_000).toISOString();
  const { data: existing } = await supabaseAdmin()
    .from("bookings")
    .select("table_id, starts_at, duration_minutes")
    .eq("restaurant_id", restaurantId)
    .in("status", ACTIVE)
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd);
  const busy = new Set(
    (existing ?? [])
      .filter((b) => overlaps(startsAt.getTime(), duration, new Date(b.starts_at).getTime(), b.duration_minutes))
      .map((b) => b.table_id),
  );
  const candidates = tables
    .filter((t) => t.bookable && t.seats >= partySize && !busy.has(t.id))
    .sort((a, b) => a.seats - b.seats);
  return candidates[0] ?? null;
}

/** Slots on a date that still have a table free for the party. */
export async function availableBookingSlots(r: Restaurant, date: string, partySize: number): Promise<Slot[]> {
  const hours = await getOpeningHours(r.id);
  const slots = slotsForDate(date, hours, "booking", r.settings, r.timezone);
  const out: Slot[] = [];
  for (const s of slots) {
    const t = await findFreeTable(r.id, new Date(s.at), r.settings.booking_default_duration_minutes, partySize);
    if (t) out.push(s);
  }
  return out;
}

export async function createBooking(
  r: Restaurant,
  input: { name: string; phone?: string; email?: string; partySize: number; startsAt: string; notes?: string; source?: string; tableId?: string | null; status?: BookingStatus },
): Promise<Booking> {
  const duration = r.settings.booking_default_duration_minutes;
  let tableId = input.tableId ?? null;
  if (!tableId) {
    const t = await findFreeTable(r.id, new Date(input.startsAt), duration, input.partySize);
    if (!t) throw new Error("No table available at that time");
    tableId = t.id;
  }
  const { data, error } = await supabaseAdmin()
    .from("bookings")
    .insert({
      restaurant_id: r.id,
      table_id: tableId,
      customer_name: input.name,
      customer_phone: input.phone ?? null,
      customer_email: input.email ?? null,
      party_size: input.partySize,
      starts_at: input.startsAt,
      duration_minutes: duration,
      notes: input.notes ?? null,
      source: input.source ?? "web",
      status: input.status ?? "confirmed",
    })
    .select("*, table:tables(name)")
    .single();
  if (error) throw new Error(error.message);
  await notifyRestaurant(r.id, "bookings");
  return data as Booking;
}

export async function setBookingStatus(bookingId: string, status: BookingStatus) {
  const { data } = await supabaseAdmin().from("bookings").update({ status }).eq("id", bookingId).select("restaurant_id").single();
  if (data) await notifyRestaurant(data.restaurant_id, "bookings");
}
