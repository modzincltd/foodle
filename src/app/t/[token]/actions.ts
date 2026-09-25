"use server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addItemsToOrder, createOrder, getOrder, openTableOrders } from "@/lib/data/orders";
import type { BasketLine } from "@/lib/types";

const linesSchema = z.array(z.object({
  key: z.string(), menu_item_id: z.string().uuid(), name: z.string(), unit_price_pence: z.number(),
  qty: z.number().int().min(1).max(20),
  modifiers: z.array(z.object({ group: z.string(), name: z.string(), price_pence: z.number() })),
  notes: z.string().max(200).optional(), kitchen_station: z.string().nullable(),
})).min(1).max(40);

async function tableFromToken(token: string) {
  const { data } = await supabaseAdmin().from("tables").select("id,restaurant_id,active").eq("tablet_token", token).maybeSingle();
  if (!data || !data.active) throw new Error("This table is not accepting orders");
  return data;
}

/** Customers at the table send items straight to the kitchen. */
export async function tabletOrder(token: string, rawLines: unknown) {
  try {
    const table = await tableFromToken(token);
    const lines = linesSchema.parse(rawLines) as BasketLine[];
    const open = await openTableOrders(table.restaurant_id);
    const existing = open[table.id];
    const order = existing
      ? await addItemsToOrder(existing.id, lines, true)
      : await createOrder({ restaurantId: table.restaurant_id, type: "dine_in", source: "tablet", lines, tableId: table.id, status: "placed", sendToKitchen: true });
    return { order };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function tabletOrderState(token: string) {
  const table = await tableFromToken(token);
  const open = await openTableOrders(table.restaurant_id);
  const o = open[table.id];
  return o ? await getOrder(o.id) : null;
}

export async function tabletCallWaiter(token: string) {
  const table = await tableFromToken(token);
  await supabaseAdmin().from("print_jobs").insert({
    restaurant_id: table.restaurant_id, printer: "receipt", kind: "alert",
    payload: { message: "Table needs assistance", table_id: table.id, at: new Date().toISOString() },
  });
  return {};
}
