"use client";
import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Subscribe to the restaurant's broadcast channel. The server sends bare
 * "something changed" events; the callback should refetch via a server action
 * or router.refresh(). Debounced so bursts collapse into one refetch.
 */
export function useRestaurantChannel(restaurantId: string, topic: "orders" | "bookings" | "menu" | "*", onEvent: () => void) {
  const cb = useRef(onEvent);
  cb.current = onEvent;
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const sb = supabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 250);
    };
    const ch = sb.channel(`restaurant:${restaurantId}`);
    if (topic === "*") ch.on("broadcast", { event: "*" }, fire);
    else ch.on("broadcast", { event: topic }, fire);
    ch.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      sb.removeChannel(ch);
    };
  }, [restaurantId, topic]);
}
