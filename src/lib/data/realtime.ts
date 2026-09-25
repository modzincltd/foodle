import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Tell every POS / KDS / admin screen for a restaurant that something changed.
 * Payload is just a topic; screens refetch through their own authenticated
 * server actions, so nothing sensitive travels over the public channel.
 */
export async function notifyRestaurant(restaurantId: string, topic: "orders" | "bookings" | "menu") {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messages: [{ topic: channelFor(restaurantId), event: topic, payload: { at: Date.now() } }],
      }),
    });
  } catch (e) {
    console.warn("broadcast failed", e);
  }
  void supabaseAdmin; // keep import for future DB-driven notifications
}

export function channelFor(restaurantId: string) {
  return `restaurant:${restaurantId}`;
}
