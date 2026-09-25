"use server";
import { z } from "zod";
import { getRestaurantBySlug, getOpeningHours } from "@/lib/data/restaurant";
import { createOrder } from "@/lib/data/orders";
import { availableBookingSlots, createBooking } from "@/lib/data/bookings";
import { slotsForDate } from "@/lib/data/slots";
import type { BasketLine } from "@/lib/types";

const lineSchema = z.object({
  key: z.string(),
  menu_item_id: z.string().uuid(),
  name: z.string(),
  unit_price_pence: z.number(),
  qty: z.number().int().min(1).max(99),
  modifiers: z.array(z.object({ group: z.string(), name: z.string(), price_pence: z.number() })),
  notes: z.string().max(200).optional(),
  kitchen_station: z.string().nullable(),
});

const collectionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  requestedAt: z.string().datetime(),
  notes: z.string().max(300).optional(),
  lines: z.array(lineSchema).min(1),
});

export async function getCollectionSlots(slug: string, date: string) {
  const r = await getRestaurantBySlug(slug);
  if (!r) return [];
  const hours = await getOpeningHours(r.id);
  return slotsForDate(date, hours, "collection", r.settings, r.timezone);
}

export async function placeCollectionOrder(slug: string, raw: unknown) {
  const r = await getRestaurantBySlug(slug);
  if (!r || !r.settings.collection_enabled) return { error: "Collection orders are not available" };
  const parsed = collectionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid order" };
  const d = parsed.data;
  // Slot must still be valid
  const date = d.requestedAt.slice(0, 10);
  const hours = await getOpeningHours(r.id);
  const slots = slotsForDate(date, hours, "collection", r.settings, r.timezone);
  const ok = slots.some((s) => Math.abs(new Date(s.at).getTime() - new Date(d.requestedAt).getTime()) < 60_000);
  if (!ok) return { error: "That collection time is no longer available – please pick another" };
  try {
    const order = await createOrder({
      restaurantId: r.id,
      type: "collection",
      source: "web",
      lines: d.lines as BasketLine[],
      customer: { name: d.name, phone: d.phone, email: d.email || undefined },
      notes: d.notes,
      requestedAt: d.requestedAt,
      status: r.settings.auto_accept_online_orders ? "accepted" : "placed",
      sendToKitchen: r.settings.auto_accept_online_orders,
    });
    return { orderId: order.id, number: order.number };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  partySize: z.number().int().min(1).max(50),
  startsAt: z.string().datetime(),
  notes: z.string().max(300).optional(),
});

export async function getBookingSlots(slug: string, date: string, partySize: number) {
  const r = await getRestaurantBySlug(slug);
  if (!r) return [];
  return availableBookingSlots(r, date, partySize);
}

export async function placeBooking(slug: string, raw: unknown) {
  const r = await getRestaurantBySlug(slug);
  if (!r || !r.settings.booking_enabled) return { error: "Bookings are not available" };
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid booking" };
  const d = parsed.data;
  if (d.partySize > r.settings.booking_max_party) return { error: `For parties over ${r.settings.booking_max_party} please call us` };
  try {
    const b = await createBooking(r, { ...d, email: d.email || undefined, source: "web" });
    return { bookingId: b.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
