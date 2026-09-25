"use client";
import { useMemo, useState } from "react";
import type { ChosenModifier, Menu, MenuItem } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { ItemModal, Badges } from "./ItemModal";

/**
 * Category-tabbed menu list. Used by the website, the table tablet and the POS
 * (POS passes `compact` for a denser grid).
 */
export function MenuBrowser({
  menus,
  currency,
  onAdd,
  dark,
  compact,
  search,
}: {
  menus: Menu[];
  currency: string;
  onAdd: (item: MenuItem, modifiers: ChosenModifier[], qty: number, notes?: string) => void;
  dark?: boolean;
  compact?: boolean;
  search?: string;
}) {
  const categories = useMemo(() => menus.flatMap((m) => m.categories).filter((c) => c.items.length), [menus]);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<MenuItem | null>(null);

  const visible = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      return categories
        .map((c) => ({ ...c, items: c.items.filter((i) => i.name.toLowerCase().includes(q)) }))
        .filter((c) => c.items.length);
    }
    return active ? categories.filter((c) => c.id === active) : categories;
  }, [categories, active, search]);

  const pick = (item: MenuItem) => {
    if (item.sold_out) return;
    if (item.modifier_groups.length === 0 && compact) return onAdd(item, [], 1);
    setOpen(item);
  };

  const tab = (on: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${on ? "bg-primary text-white" : dark ? "bg-stone-800 text-stone-200" : "bg-stone-100 text-stone-700"}`;

  return (
    <div>
      {!search && (
        <div className={`sticky top-0 z-10 -mx-4 px-4 py-2 flex gap-2 overflow-x-auto ${dark ? "bg-stone-950/95" : "bg-[var(--background)]/95"} backdrop-blur`}>
          <button className={tab(active === null)} onClick={() => setActive(null)}>All</button>
          {categories.map((c) => (
            <button key={c.id} className={tab(active === c.id)} onClick={() => setActive(c.id)}>{c.name}</button>
          ))}
        </div>
      )}

      {visible.map((c) => (
        <section key={c.id} className="mt-4">
          <h2 className="mb-2 text-lg font-bold">{c.name}</h2>
          {c.description && <p className="mb-3 text-sm opacity-70">{c.description}</p>}
          <div className={compact ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2" : "grid gap-3 sm:grid-cols-2"}>
            {c.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => pick(item)}
                disabled={item.sold_out}
                className={`text-left rounded-2xl border transition active:scale-[0.99] disabled:opacity-40 ${
                  dark ? "border-stone-800 bg-stone-900 hover:bg-stone-800" : "border-stone-200 bg-white hover:shadow-md"
                } ${compact ? "p-3 min-h-20 flex flex-col justify-between" : "p-4 flex gap-3"}`}
              >
                {!compact && item.image_url && <img src={item.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-semibold ${compact ? "text-sm leading-tight" : ""}`}>{item.name}</span>
                    <span className={`shrink-0 ${compact ? "text-xs opacity-70" : "font-semibold"}`}>{formatMoney(item.price_pence, currency)}</span>
                  </div>
                  {!compact && item.description && <p className="mt-1 line-clamp-2 text-sm opacity-70">{item.description}</p>}
                  {!compact && <Badges item={item} />}
                  {item.sold_out && <span className="chip mt-1 bg-red-100 text-red-800">Sold out</span>}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {open && (
        <ItemModal
          item={open}
          currency={currency}
          dark={dark}
          onClose={() => setOpen(null)}
          onAdd={(mods, qty, notes) => {
            onAdd(open, mods, qty, notes);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
