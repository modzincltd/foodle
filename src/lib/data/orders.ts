import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { lineTotal } from "@/lib/money";
import type { BasketLine, Order, OrderItem, OrderStatus, OrderType } from "@/lib/types";
import { getMenus } from "./restaurant";
import { notifyRestaurant } from "./realtime";

const ORDER_SELECT = "*, items:order_items(*), table:tables(name)";

export async function getOrder(orderId: string): Promise<Order | null> {
  const { data } = await supabaseAdmin().from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  return (data as Order) ?? null;
}

export async function listOrders(
  restaurantId: string,
  opts: { statuses?: OrderStatus[]; since?: string; limit?: number; types?: OrderType[] } = {},
): Promise<Order[]> {
  let q = supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.statuses) q = q.in("status", opts.statuses);
  if (opts.types) q = q.in("type", opts.types);
  if (opts.since) q = q.gte("created_at", opts.since);
  const { data } = await q;
  return (data as Order[]) ?? [];
}

/** Open dine-in orders keyed by table id (for the POS floor view). */
export async function openTableOrders(restaurantId: string): Promise<Record<string, Order>> {
  const orders = await listOrders(restaurantId, {
    statuses: ["draft", "placed", "accepted", "preparing", "ready"],
    types: ["dine_in"],
  });
  const map: Record<string, Order> = {};
  for (const o of orders) if (o.table_id && !map[o.table_id]) map[o.table_id] = o;
  return map;
}

/**
 * Validate basket lines against the live menu (prices come from the DB, never the client)
 * and return order_items rows ready to insert.
 */
export async function priceBasket(restaurantId: string, lines: BasketLine[]) {
  const menus = await getMenus(restaurantId, { includeHidden: false });
  const items = new Map(menus.flatMap((m) => m.categories.flatMap((c) => c.items)).map((i) => [i.id, i]));
  const rows: Omit<OrderItem, "id" | "order_id" | "created_at" | "sent_at" | "kitchen_status">[] = [];
  for (const l of lines) {
    const item = items.get(l.menu_item_id);
    if (!item || item.sold_out) throw new Error(`"${l.name}" is no longer available`);
    const optionPrices = new Map(
      item.modifier_groups.flatMap((g) => g.options.map((o) => [`${g.name}::${o.name}`, o.price_pence] as const)),
    );
    const modifiers = l.modifiers.map((m) => {
      const p = optionPrices.get(`${m.group}::${m.name}`);
      if (p === undefined) throw new Error(`Option "${m.name}" not available for ${item.name}`);
      return { group: m.group, name: m.name, price_pence: p };
    });
    for (const g of item.modifier_groups) {
      const n = modifiers.filter((m) => m.group === g.name).length;
      if (n < g.min_select) throw new Error(`Choose ${g.name} for ${item.name}`);
      if (n > g.max_select) throw new Error(`Too many ${g.name} for ${item.name}`);
    }
    const qty = Math.max(1, Math.min(99, Math.floor(l.qty)));
    rows.push({
      menu_item_id: item.id,
      name: item.name,
      unit_price_pence: item.price_pence,
      qty,
      modifiers,
      line_total_pence: lineTotal(item.price_pence, modifiers, qty),
      notes: l.notes?.slice(0, 200) ?? null,
      kitchen_station: item.kitchen_station,
      course: 1,
    });
  }
  return rows;
}

export interface CreateOrderInput {
  restaurantId: string;
  type: OrderType;
  source: "pos" | "web" | "tablet";
  lines: BasketLine[];
  tableId?: string | null;
  staffId?: string | null;
  covers?: number | null;
  customer?: { name?: string; phone?: string; email?: string };
  notes?: string;
  requestedAt?: string | null;
  status?: OrderStatus;
  sendToKitchen?: boolean;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const db = supabaseAdmin();
  const rows = await priceBasket(input.restaurantId, input.lines);
  const status = input.status ?? "placed";
  const { data: order, error } = await db
    .from("orders")
    .insert({
      restaurant_id: input.restaurantId,
      type: input.type,
      source: input.source,
      status,
      table_id: input.tableId ?? null,
      staff_id: input.staffId ?? null,
      covers: input.covers ?? null,
      customer_name: input.customer?.name ?? null,
      customer_phone: input.customer?.phone ?? null,
      customer_email: input.customer?.email ?? null,
      notes: input.notes ?? null,
      requested_at: input.requestedAt ?? null,
      placed_at: status === "draft" ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(error?.message ?? "Could not create order");

  if (rows.length) {
    const sentAt = input.sendToKitchen ? new Date().toISOString() : null;
    const { error: e2 } = await db.from("order_items").insert(
      rows.map((r) => ({ ...r, order_id: order.id, restaurant_id: input.restaurantId, sent_at: sentAt })),
    );
    if (e2) throw new Error(e2.message);
    if (input.sendToKitchen) await queueKitchenTicket(order.id);
  }
  await notifyRestaurant(input.restaurantId, "orders");
  return (await getOrder(order.id))!;
}

/** Add lines to an existing (dine-in) order and optionally fire them to the kitchen. */
export async function addItemsToOrder(orderId: string, lines: BasketLine[], sendToKitchen: boolean) {
  const db = supabaseAdmin();
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");
  const rows = await priceBasket(order.restaurant_id, lines);
  const sentAt = sendToKitchen ? new Date().toISOString() : null;
  const { error } = await db.from("order_items").insert(
    rows.map((r) => ({ ...r, order_id: orderId, restaurant_id: order.restaurant_id, sent_at: sentAt })),
  );
  if (error) throw new Error(error.message);
  if (sendToKitchen) await queueKitchenTicket(orderId, true);
  await notifyRestaurant(order.restaurant_id, "orders");
  return (await getOrder(orderId))!;
}

/** Fire all unsent items on an order to the kitchen. */
export async function sendOrderToKitchen(orderId: string) {
  const db = supabaseAdmin();
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");
  await db.from("order_items").update({ sent_at: new Date().toISOString() }).eq("order_id", orderId).is("sent_at", null);
  if (order.status === "draft") await db.from("orders").update({ status: "placed", placed_at: new Date().toISOString() }).eq("id", orderId);
  await queueKitchenTicket(orderId, true);
  await notifyRestaurant(order.restaurant_id, "orders");
}

export async function removeOrderItem(orderItemId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("order_items").select("restaurant_id, sent_at").eq("id", orderItemId).single();
  if (!data) return;
  if (data.sent_at) throw new Error("Item already sent to kitchen – void it instead");
  await db.from("order_items").delete().eq("id", orderItemId);
  await notifyRestaurant(data.restaurant_id, "orders");
}

export async function setOrderStatus(orderId: string, status: OrderStatus, extra: Partial<Order> = {}) {
  const db = supabaseAdmin();
  const stamp: Partial<Order> = {};
  if (status === "accepted") stamp.accepted_at = new Date().toISOString();
  if (status === "ready") stamp.ready_at = new Date().toISOString();
  if (status === "completed") stamp.completed_at = new Date().toISOString();
  const { data } = await db.from("orders").update({ status, ...stamp, ...extra }).eq("id", orderId).select("restaurant_id").single();
  if (status === "accepted") {
    // Web orders are fired to the kitchen on acceptance
    await db.from("order_items").update({ sent_at: new Date().toISOString() }).eq("order_id", orderId).is("sent_at", null);
    await queueKitchenTicket(orderId);
  }
  if (data) await notifyRestaurant(data.restaurant_id, "orders");
}

export async function recordPayment(orderId: string, method: "cash" | "card_terminal", discountPence = 0) {
  const db = supabaseAdmin();
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");
  const total = Math.max(0, order.subtotal_pence - discountPence + order.service_pence);
  await db
    .from("orders")
    .update({
      discount_pence: discountPence,
      total_pence: total,
      payment_status: "paid",
      payment_method: method,
      status: order.type === "dine_in" ? "completed" : order.status,
      completed_at: order.type === "dine_in" ? new Date().toISOString() : order.completed_at,
    })
    .eq("id", orderId);
  await queueReceipt(orderId);
  await notifyRestaurant(order.restaurant_id, "orders");
}

export async function setKitchenStatus(orderItemId: string, status: OrderItem["kitchen_status"]) {
  const db = supabaseAdmin();
  const { data } = await db.from("order_items").update({ kitchen_status: status }).eq("id", orderItemId).select("order_id, restaurant_id").single();
  if (!data) return;
  // If everything is ready, bump the order
  const { data: items } = await db.from("order_items").select("kitchen_status").eq("order_id", data.order_id).not("sent_at", "is", null);
  if (items && items.length && items.every((i) => i.kitchen_status === "ready" || i.kitchen_status === "served")) {
    const { data: o } = await db.from("orders").select("status,type").eq("id", data.order_id).single();
    if (o && ["placed", "accepted", "preparing"].includes(o.status)) {
      await db.from("orders").update({ status: "ready", ready_at: new Date().toISOString() }).eq("id", data.order_id);
    }
  } else if (status === "preparing") {
    await db.from("orders").update({ status: "preparing" }).eq("id", data.order_id).in("status", ["placed", "accepted"]);
  }
  await notifyRestaurant(data.restaurant_id, "orders");
}

export async function bumpOrder(orderId: string) {
  const db = supabaseAdmin();
  await db.from("order_items").update({ kitchen_status: "ready" }).eq("order_id", orderId).not("sent_at", "is", null);
  const { data } = await db.from("orders").update({ status: "ready", ready_at: new Date().toISOString() }).eq("id", orderId).select("restaurant_id").single();
  if (data) await notifyRestaurant(data.restaurant_id, "orders");
}

// ---------- printing ----------

async function queueKitchenTicket(orderId: string, onlyUnprinted = false) {
  const db = supabaseAdmin();
  const order = await getOrder(orderId);
  if (!order || !order.items?.length) return;
  const items = order.items.filter((i) => i.sent_at && (!onlyUnprinted || Date.now() - new Date(i.sent_at).getTime() < 60_000));
  if (!items.length) return;
  const stations = Array.from(new Set(items.map((i) => i.kitchen_station ?? "kitchen")));
  for (const station of stations) {
    await db.from("print_jobs").insert({
      restaurant_id: order.restaurant_id,
      printer: station === "bar" ? "bar" : "kitchen",
      kind: "ticket",
      payload: {
        order_number: order.number,
        type: order.type,
        table: order.table?.name ?? null,
        customer: order.customer_name,
        requested_at: order.requested_at,
        notes: order.notes,
        station,
        items: items
          .filter((i) => (i.kitchen_station ?? "kitchen") === station)
          .map((i) => ({ qty: i.qty, name: i.name, modifiers: i.modifiers.map((m) => m.name), notes: i.notes })),
        at: new Date().toISOString(),
      },
    });
  }
}

async function queueReceipt(orderId: string) {
  const db = supabaseAdmin();
  const order = await getOrder(orderId);
  if (!order) return;
  const { data: r } = await db.from("restaurants").select("name,address_line1,city,postcode,phone,settings").eq("id", order.restaurant_id).single();
  await db.from("print_jobs").insert({
    restaurant_id: order.restaurant_id,
    printer: "receipt",
    kind: "receipt",
    payload: {
      restaurant: r,
      order_number: order.number,
      table: order.table?.name ?? null,
      items: (order.items ?? []).map((i) => ({ qty: i.qty, name: i.name, modifiers: i.modifiers.map((m) => m.name), line_total_pence: i.line_total_pence })),
      subtotal_pence: order.subtotal_pence,
      discount_pence: order.discount_pence,
      service_pence: order.service_pence,
      total_pence: order.total_pence,
      payment_method: order.payment_method,
      at: new Date().toISOString(),
    },
  });
}
