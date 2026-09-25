"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRestaurantChannel } from "@/components/useRestaurantChannel";
import type { OrderStatus } from "@/lib/types";

const LABELS: Record<OrderStatus, { text: string; cls: string }> = {
  draft: { text: "Draft", cls: "bg-stone-100 text-stone-700" },
  placed: { text: "Waiting for the restaurant to confirm", cls: "bg-amber-100 text-amber-800" },
  accepted: { text: "Confirmed – being prepared", cls: "bg-blue-100 text-blue-800" },
  preparing: { text: "Being prepared", cls: "bg-blue-100 text-blue-800" },
  ready: { text: "Ready to collect!", cls: "bg-green-100 text-green-800" },
  completed: { text: "Collected – enjoy!", cls: "bg-green-100 text-green-800" },
  cancelled: { text: "Cancelled – please call us", cls: "bg-red-100 text-red-800" },
};

export function OrderStatusLive({ orderId, initial, restaurantId }: { orderId: string; initial: OrderStatus; restaurantId: string }) {
  const router = useRouter();
  const [status] = useState(initial);
  useRestaurantChannel(restaurantId, "orders", () => router.refresh());
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router, orderId]);
  const l = LABELS[status];
  return <div className={`mx-auto mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${l.cls}`}>{l.text}</div>;
}
