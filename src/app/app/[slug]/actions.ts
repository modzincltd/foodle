"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginWithPin, logoutStaff, requireStaff } from "@/lib/auth/staff";
import { getRestaurantBySlug, getMenus, getTables } from "@/lib/data/restaurant";
import {
  addItemsToOrder, bumpOrder, createOrder, getOrder, listOrders, openTableOrders,
  recordPayment, removeOrderItem, sendOrderToKitchen, setKitchenStatus, setOrderStatus,
} from "@/lib/data/orders";
import { listBookings, setBookingStatus } from "@/lib/data/bookings";
import type { BasketLine, BookingStatus, KitchenStatus, OrderStatus } from "@/lib/types";

export async function staffLogin(slug: string, pin: string, next?: string) {
  if (!/^\d{4,6}$/.test(pin)) return { error: "Enter your 4–6 digit PIN" };
  const s = await loginWithPin(slug, pin);
  if (!s) return { error: "Wrong PIN" };
  redirect(next && next.startsWith(`/app/${slug}`) ? next : `/app/${slug}/pos`);
}

export async function staffLogout(slug: string) {
  await logoutStaff();
  redirect(`/app/${slug}`);
}

async function ctx(slug: string) {
  const s = await requireStaff(slug);
  return s;
}

// ---------- POS ----------

export async function posBootstrap(slug: string) {
  const s = await ctx(slug);
  const r = (await getRestaurantBySlug(slug))!;
  const [menus, { tables, areas }, open, active] = await Promise.all([
    getMenus(r.id, { channel: "dine_in", includeHidden: true }),
    getTables(r.id),
    openTableOrders(r.id),
    listOrders(r.id, { statuses: ["placed", "accepted", "preparing", "ready"], types: ["collection", "delivery"] }),
  ]);
  return { staff: s, restaurant: r, menus, tables, areas, openByTable: open, activeTakeaway: active };
}

const linesSchema = z.array(z.object({
  key: z.string(), menu_item_id: z.string().uuid(), name: z.string(), unit_price_pence: z.number(),
  qty: z.number().int().min(1).max(99),
  modifiers: z.array(z.object({ group: z.string(), name: z.string(), price_pence: z.number() })),
  notes: z.string().max(200).optional(), kitchen_station: z.string().nullable(),
}));

/** Start (or add to) a table order. `fire` sends to kitchen immediately. */
export async function posSubmitTable(slug: string, tableId: string, covers: number | null, rawLines: unknown, fire: boolean) {
  const s = await ctx(slug);
  const lines = linesSchema.parse(rawLines) as BasketLine[];
  const open = await openTableOrders(s.restaurant_id);
  try {
    const existing = open[tableId];
    const order = existing
      ? await addItemsToOrder(existing.id, lines, fire)
      : await createOrder({ restaurantId: s.restaurant_id, type: "dine_in", source: "pos", lines, tableId, staffId: s.staff_id, covers, status: fire ? "placed" : "draft", sendToKitchen: fire });
    return { order };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Walk-in takeaway from the till. */
export async function posSubmitTakeaway(slug: string, rawLines: unknown, customerName: string, requestedAt: string | null) {
  const s = await ctx(slug);
  const lines = linesSchema.parse(rawLines) as BasketLine[];
  try {
    const order = await createOrder({
      restaurantId: s.restaurant_id, type: "collection", source: "pos", lines, staffId: s.staff_id,
      customer: { name: customerName || "Walk-in" }, requestedAt, status: "accepted", sendToKitchen: true,
    });
    return { order };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function posGetOrder(slug: string, orderId: string) {
  await ctx(slug);
  return getOrder(orderId);
}

export async function posFire(slug: string, orderId: string) {
  await ctx(slug);
  await sendOrderToKitchen(orderId);
}

export async function posRemoveItem(slug: string, orderItemId: string) {
  await ctx(slug);
  try { await removeOrderItem(orderItemId); return {}; } catch (e) { return { error: (e as Error).message }; }
}

export async function posVoidOrder(slug: string, orderId: string, reason: string) {
  await ctx(slug);
  await setOrderStatus(orderId, "cancelled", { cancelled_reason: reason } as never);
}

export async function posPay(slug: string, orderId: string, method: "cash" | "card_terminal", discountPence: number) {
  const s = await ctx(slug);
  if (discountPence > 0 && !["owner", "manager"].includes(s.role)) return { error: "Manager PIN required for discounts" };
  await recordPayment(orderId, method, Math.max(0, Math.floor(discountPence)));
  return {};
}

export async function posSetStatus(slug: string, orderId: string, status: OrderStatus) {
  await ctx(slug);
  await setOrderStatus(orderId, status);
}

// ---------- KDS ----------

export async function kdsOrders(slug: string) {
  const s = await ctx(slug);
  const orders = await listOrders(s.restaurant_id, { statuses: ["placed", "accepted", "preparing", "ready"], limit: 60 });
  // Kitchen only sees fired items; web orders appear once accepted
  return orders
    .map((o) => ({ ...o, items: (o.items ?? []).filter((i) => i.sent_at) }))
    .filter((o) => o.items.length && !(o.source === "web" && o.status === "placed"))
    .sort((a, b) => new Date(a.placed_at ?? a.created_at).getTime() - new Date(b.placed_at ?? b.created_at).getTime());
}

export async function kdsSetItem(slug: string, orderItemId: string, status: KitchenStatus) {
  await ctx(slug);
  await setKitchenStatus(orderItemId, status);
}

export async function kdsBump(slug: string, orderId: string) {
  await ctx(slug);
  await bumpOrder(orderId);
}

// ---------- Front of house: online orders + bookings ----------

export async function fohBookingsToday(slug: string) {
  const s = await ctx(slug);
  const r = (await getRestaurantBySlug(slug))!;
  const now = new Date();
  const from = new Date(now.getTime() - 4 * 3600_000).toISOString();
  const to = new Date(now.getTime() + 20 * 3600_000).toISOString();
  return { bookings: await listBookings(s.restaurant_id, from, to), tz: r.timezone };
}

export async function fohSetBooking(slug: string, bookingId: string, status: BookingStatus) {
  await ctx(slug);
  await setBookingStatus(bookingId, status);
}
