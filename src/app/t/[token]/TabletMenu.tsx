"use client";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { Menu, Order } from "@/lib/types";
import { createBasketStore, basketTotal, basketCount } from "@/lib/basket";
import { formatMoney, lineTotal } from "@/lib/money";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { useRestaurantChannel } from "@/components/useRestaurantChannel";
import { tabletOrder, tabletOrderState } from "./actions";

export function TabletMenu({
  token, restaurant, table, menus, order: initialOrder,
}: {
  token: string;
  restaurant: { id: string; name: string; currency: string; theme: { primary: string; accent: string } };
  table: { id: string; name: string };
  menus: Menu[];
  order: Order | null;
}) {
  const useBasket = useMemo(() => createBasketStore(`tablet-${token}`), [token]);
  const { lines, add, setQty, clear } = useBasket();
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [view, setView] = useState<"menu" | "basket" | "bill">("menu");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, start] = useTransition();
  const refresh = useCallback(() => tabletOrderState(token).then(setOrder), [token]);
  useRestaurantChannel(restaurant.id, "orders", refresh);

  const total = basketTotal(lines);
  const count = basketCount(lines);

  const send = () =>
    start(async () => {
      setError(null);
      const res = await tabletOrder(token, lines);
      if ("error" in res) return setError(res.error ?? "Failed");
      setOrder(res.order);
      clear();
      setSent(true);
      setTimeout(() => setSent(false), 4000);
      setView("menu");
    });

  return (
    <div className="staff-app flex h-dvh flex-col" style={{ ["--primary" as string]: restaurant.theme.primary, ["--accent" as string]: restaurant.theme.accent }}>
      <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-stone-400">{restaurant.name}</div>
          <div className="text-xl font-black">Table {table.name}</div>
        </div>
        <div className="flex gap-2 text-sm font-semibold">
          <button className={`rounded-full px-4 py-2 ${view === "menu" ? "bg-stone-100 text-stone-900" : "bg-stone-800"}`} onClick={() => setView("menu")}>Menu</button>
          <button className={`rounded-full px-4 py-2 ${view === "bill" ? "bg-stone-100 text-stone-900" : "bg-stone-800"}`} onClick={() => { refresh(); setView("bill"); }}>Your bill {order ? `· ${formatMoney(order.total_pence, restaurant.currency)}` : ""}</button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
        {view === "menu" && <MenuBrowser menus={menus} currency={restaurant.currency} dark onAdd={(item, mods, qty, notes) => add(item, mods, qty, notes)} />}

        {view === "basket" && (
          <div className="mx-auto max-w-lg pt-4">
            <h2 className="text-2xl font-bold">Your selection</h2>
            <ul className="my-4 divide-y divide-stone-800">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <div className="font-medium">{l.name}</div>
                    {l.modifiers.length > 0 && <div className="text-xs text-stone-400">{l.modifiers.map((m) => m.name).join(", ")}</div>}
                    {l.notes && <div className="text-xs italic text-stone-400">{l.notes}</div>}
                  </div>
                  <div className="flex items-center rounded-lg border border-stone-700">
                    <button className="px-3 py-1" onClick={() => setQty(l.key, l.qty - 1)}>−</button>
                    <span className="w-6 text-center text-sm">{l.qty}</span>
                    <button className="px-3 py-1" onClick={() => setQty(l.key, l.qty + 1)}>+</button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold">{formatMoney(lineTotal(l.unit_price_pence, l.modifiers, l.qty), restaurant.currency)}</div>
                </li>
              ))}
            </ul>
            {lines.length === 0 && <p className="text-stone-400">Nothing selected yet.</p>}
            {error && <p className="rounded-xl bg-red-900/50 p-3 text-sm text-red-200">{error}</p>}
            <p className="mt-4 text-sm text-stone-400">Items go straight to the kitchen. Pay at the end with your server.</p>
          </div>
        )}

        {view === "bill" && (
          <div className="mx-auto max-w-lg pt-4">
            <h2 className="text-2xl font-bold">Your bill</h2>
            {!order ? <p className="mt-2 text-stone-400">Nothing ordered yet.</p> : (
              <ul className="my-4 divide-y divide-stone-800">
                {order.items?.map((i) => (
                  <li key={i.id} className="flex justify-between py-2">
                    <span>{i.qty} × {i.name}<span className="text-stone-400"> {i.modifiers.length ? `· ${i.modifiers.map((m) => m.name).join(", ")}` : ""}</span>
                      <span className="ml-2 chip bg-stone-800 capitalize">{i.kitchen_status}</span></span>
                    <span className="tabular-nums">{formatMoney(i.line_total_pence, restaurant.currency)}</span>
                  </li>
                ))}
                <li className="flex justify-between pt-3 text-xl font-black"><span>Total</span><span>{formatMoney(order.total_pence, restaurant.currency)}</span></li>
              </ul>
            )}
            <p className="text-sm text-stone-400">Ready to pay? Just ask your server.</p>
          </div>
        )}
      </main>

      {sent && <div className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-green-600 px-5 py-2 font-semibold shadow-lg">Sent to the kitchen ✓</div>}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-stone-800 bg-stone-950 p-4">
          <div className="mx-auto flex max-w-lg gap-2">
            {view !== "basket" ? (
              <button className="btn bg-stone-800 flex-1 py-4" onClick={() => setView("basket")}>Review ({count})</button>
            ) : (
              <button className="btn bg-stone-800 py-4 px-5" onClick={() => setView("menu")}>Add more</button>
            )}
            <button className="btn-primary flex-[2] justify-between py-4" disabled={busy} onClick={send}>
              <span>{busy ? "Sending…" : "Send to kitchen"}</span><span>{formatMoney(total, restaurant.currency)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
