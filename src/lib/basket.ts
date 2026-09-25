"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BasketLine, ChosenModifier, MenuItem } from "@/lib/types";
import { lineTotal } from "@/lib/money";

interface BasketState {
  lines: BasketLine[];
  add: (item: MenuItem, modifiers: ChosenModifier[], qty?: number, notes?: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export function basketKey(itemId: string, modifiers: ChosenModifier[], notes?: string) {
  return `${itemId}|${modifiers.map((m) => `${m.group}:${m.name}`).sort().join(",")}|${notes ?? ""}`;
}

export function basketTotal(lines: BasketLine[]) {
  return lines.reduce((s, l) => s + lineTotal(l.unit_price_pence, l.modifiers, l.qty), 0);
}

export function basketCount(lines: BasketLine[]) {
  return lines.reduce((s, l) => s + l.qty, 0);
}

/** One basket per storage namespace so POS tabs, tablets and the website don't collide. */
export function createBasketStore(namespace: string) {
  return create<BasketState>()(
    persist(
      (set) => ({
        lines: [],
        add: (item, modifiers, qty = 1, notes) =>
          set((s) => {
            const key = basketKey(item.id, modifiers, notes);
            const existing = s.lines.find((l) => l.key === key);
            if (existing) {
              return { lines: s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) };
            }
            return {
              lines: [
                ...s.lines,
                { key, menu_item_id: item.id, name: item.name, unit_price_pence: item.price_pence, qty, modifiers, notes, kitchen_station: item.kitchen_station },
              ],
            };
          }),
        setQty: (key, qty) =>
          set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)) })),
        remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
        clear: () => set({ lines: [] }),
      }),
      { name: `foodle-basket-${namespace}`, storage: createJSONStorage(() => localStorage) },
    ),
  );
}
