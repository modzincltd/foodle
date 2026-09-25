"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { Order } from "@/lib/types";
import { useRestaurantChannel } from "@/components/useRestaurantChannel";
import { kdsBump, kdsOrders, kdsSetItem } from "../actions";

export function Kds({ slug, restaurantId, initial }: { slug: string; restaurantId: string; initial: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [station, setStation] = useState<string>("all");
  const [now, setNow] = useState(Date.now());
  const [, start] = useTransition();
  const refresh = useCallback(() => kdsOrders(slug).then(setOrders), [slug]);
  useRestaurantChannel(restaurantId, "orders", refresh);
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); }, 10_000);
    const p = setInterval(refresh, 20_000); // safety net if realtime drops
    return () => { clearInterval(t); clearInterval(p); };
  }, [refresh]);

  const stations = Array.from(new Set(orders.flatMap((o) => o.items?.map((i) => i.kitchen_station ?? "kitchen") ?? []))).sort();
  const visible = orders
    .map((o) => ({ ...o, items: (o.items ?? []).filter((i) => station === "all" || (i.kitchen_station ?? "kitchen") === station).filter((i) => i.kitchen_status !== "served") }))
    .filter((o) => o.items.length && o.items.some((i) => i.kitchen_status !== "ready"));

  const mins = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 60000);
  const ageCls = (m: number) => (m >= 15 ? "bg-red-600" : m >= 8 ? "bg-amber-500 text-stone-900" : "bg-stone-700");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-stone-800 px-3 py-2 text-sm">
        <span className="text-stone-400">Station:</span>
        {["all", ...stations].map((s) => (
          <button key={s} onClick={() => setStation(s)} className={`rounded-lg px-3 py-1 font-semibold capitalize ${station === s ? "bg-accent text-stone-900" : "bg-stone-800"}`}>{s}</button>
        ))}
        <span className="ml-auto text-stone-400">{visible.length} open</span>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-3 md:grid-cols-3 xl:grid-cols-5">
        {visible.length === 0 && <p className="col-span-full p-6 text-center text-stone-500">All clear 🎉</p>}
        {visible.map((o) => {
          const sentAt = o.items.reduce((min, i) => (i.sent_at && i.sent_at < min ? i.sent_at : min), o.items[0].sent_at!);
          const m = mins(sentAt);
          return (
            <div key={o.id} className="flex flex-col overflow-hidden rounded-2xl bg-stone-900">
              <div className={`flex items-center justify-between px-3 py-2 ${ageCls(m)}`}>
                <div className="font-black">
                  {o.type === "dine_in" ? `T${o.table?.name ?? "?"}` : o.type === "collection" ? "COLLECT" : "DELIVERY"} <span className="font-normal opacity-80">#{o.number}</span>
                </div>
                <div className="text-sm font-semibold tabular-nums">{m}m</div>
              </div>
              {o.type !== "dine_in" && (
                <div className="px-3 pt-2 text-xs text-stone-400">
                  {o.customer_name} {o.requested_at && `· for ${new Date(o.requested_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                </div>
              )}
              {o.notes && <div className="px-3 pt-1 text-xs italic text-amber-300">{o.notes}</div>}
              <ul className="flex-1 divide-y divide-stone-800 px-3 py-1">
                {o.items.map((i) => (
                  <li key={i.id}>
                    <button
                      className={`flex w-full items-start gap-2 py-2 text-left ${i.kitchen_status === "ready" ? "line-through opacity-40" : i.kitchen_status === "preparing" ? "text-amber-300" : ""}`}
                      onClick={() => start(async () => { await kdsSetItem(slug, i.id, i.kitchen_status === "pending" ? "preparing" : i.kitchen_status === "preparing" ? "ready" : "pending"); refresh(); })}
                    >
                      <span className="w-6 text-lg font-black">{i.qty}</span>
                      <span className="flex-1">
                        <span className="font-semibold">{i.name}</span>
                        {i.modifiers.length > 0 && <div className="text-sm text-stone-300">{i.modifiers.map((x) => x.name).join(", ")}</div>}
                        {i.notes && <div className="text-sm italic text-amber-300">{i.notes}</div>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button className="bg-green-700 py-3 font-bold hover:bg-green-600" onClick={() => start(async () => { await kdsBump(slug, o.id); refresh(); })}>
                BUMP
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
