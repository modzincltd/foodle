"use client";
import { useMemo, useState } from "react";
import type { ChosenModifier, MenuItem } from "@/lib/types";
import { formatMoney, lineTotal } from "@/lib/money";

export function ItemModal({
  item,
  currency,
  onClose,
  onAdd,
  dark,
}: {
  item: MenuItem;
  currency: string;
  onClose: () => void;
  onAdd: (modifiers: ChosenModifier[], qty: number, notes?: string) => void;
  dark?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [chosen, setChosen] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.modifier_groups) {
      // pre-select the first option for required single-choice groups
      init[g.id] = g.min_select >= 1 && g.max_select === 1 && g.options[0] ? [g.options[0].id] : [];
    }
    return init;
  });

  const modifiers: ChosenModifier[] = useMemo(
    () =>
      item.modifier_groups.flatMap((g) =>
        (chosen[g.id] ?? []).map((oid) => {
          const o = g.options.find((x) => x.id === oid)!;
          return { group: g.name, name: o.name, price_pence: o.price_pence };
        }),
      ),
    [chosen, item],
  );

  const valid = item.modifier_groups.every((g) => {
    const n = (chosen[g.id] ?? []).length;
    return n >= g.min_select && n <= g.max_select;
  });

  const toggle = (gid: string, oid: string, max: number) =>
    setChosen((c) => {
      const cur = c[gid] ?? [];
      if (max === 1) return { ...c, [gid]: [oid] };
      if (cur.includes(oid)) return { ...c, [gid]: cur.filter((x) => x !== oid) };
      if (cur.length >= max) return c;
      return { ...c, [gid]: [...cur, oid] };
    });

  const total = lineTotal(item.price_pence, modifiers, qty);
  const bg = dark ? "bg-stone-900 text-stone-50 border-stone-700" : "bg-white text-stone-900 border-stone-200";
  const opt = (on: boolean) =>
    `flex items-center justify-between rounded-xl border px-3 py-3 text-left ${on ? "border-primary bg-primary/10" : dark ? "border-stone-700" : "border-stone-200"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border ${bg}`} onClick={(e) => e.stopPropagation()}>
        {item.image_url && <img src={item.image_url} alt="" className="h-48 w-full object-cover" />}
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{item.name}</h2>
              <span className="font-semibold">{formatMoney(item.price_pence, currency)}</span>
            </div>
            {item.description && <p className="mt-1 text-sm opacity-70">{item.description}</p>}
            <Badges item={item} />
          </div>

          {item.modifier_groups.map((g) => (
            <div key={g.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-semibold">{g.name}</h3>
                <span className="text-xs opacity-60">
                  {g.min_select > 0 ? "Required" : "Optional"}
                  {g.max_select > 1 ? ` · up to ${g.max_select}` : ""}
                </span>
              </div>
              <div className="grid gap-2">
                {g.options.map((o) => {
                  const on = (chosen[g.id] ?? []).includes(o.id);
                  return (
                    <button key={o.id} type="button" className={opt(on)} onClick={() => toggle(g.id, o.id, g.max_select)}>
                      <span>{o.name}</span>
                      {o.price_pence > 0 && <span className="text-sm opacity-70">+{formatMoney(o.price_pence, currency)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <textarea
            className={`w-full rounded-xl border px-3 py-2 text-sm ${dark ? "bg-stone-800 border-stone-700" : "border-stone-200"}`}
            placeholder="Any notes? (e.g. no onions)"
            value={notes}
            maxLength={200}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <div className={`flex items-center rounded-xl border ${dark ? "border-stone-700" : "border-stone-200"}`}>
              <button type="button" className="px-4 py-2 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button type="button" className="px-4 py-2 text-xl" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
            </div>
            <button type="button" className="btn-primary flex-1 py-3" disabled={!valid || item.sold_out} onClick={() => onAdd(modifiers, qty, notes || undefined)}>
              {item.sold_out ? "Sold out" : `Add · ${formatMoney(total, currency)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Badges({ item }: { item: MenuItem }) {
  if (!item.dietary.length && !item.allergens.length && !item.spice) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {item.dietary.map((d) => (
        <span key={d} className="chip bg-green-100 text-green-800 uppercase">{d}</span>
      ))}
      {item.spice > 0 && <span className="chip bg-red-100 text-red-800">{"🌶".repeat(Math.min(3, item.spice))}</span>}
      {item.allergens.length > 0 && <span className="chip bg-amber-100 text-amber-800">Contains: {item.allergens.join(", ")}</span>}
    </div>
  );
}
