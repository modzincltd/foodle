"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BasketLine, Menu } from "@/lib/types";
import { createBasketStore, basketTotal, basketCount } from "@/lib/basket";
import { formatMoney, lineTotal } from "@/lib/money";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { getCollectionSlots, placeCollectionOrder } from "../actions";

export function OrderClient({ slug, currency, menus, days }: { slug: string; currency: string; menus: Menu[]; days: string[] }) {
  const useBasket = useMemo(() => createBasketStore(`web-${slug}`), [slug]);
  const { lines, add, setQty, clear } = useBasket();
  const [checkout, setCheckout] = useState(false);
  const total = basketTotal(lines);
  const count = basketCount(lines);

  return (
    <div className="pt-4">
      <h1 className="mb-2 text-2xl font-bold">Order for collection</h1>
      <MenuBrowser menus={menus} currency={currency} onAdd={(item, mods, qty, notes) => add(item, mods, qty, notes)} />

      {count > 0 && !checkout && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-4">
          <button className="btn-primary mx-auto flex w-full max-w-md justify-between py-4 shadow-xl" onClick={() => setCheckout(true)}>
            <span>Basket · {count} item{count > 1 ? "s" : ""}</span>
            <span>{formatMoney(total, currency)}</span>
          </button>
        </div>
      )}

      {checkout && (
        <Checkout slug={slug} currency={currency} days={days} lines={lines} setQty={setQty} clear={clear} onClose={() => setCheckout(false)} />
      )}
    </div>
  );
}

function Checkout({
  slug, currency, days, lines, setQty, clear, onClose,
}: {
  slug: string; currency: string; days: string[];
  lines: BasketLine[];
  setQty: (k: string, q: number) => void; clear: () => void; onClose: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState<{ at: string; label: string }[]>([]);
  const [slot, setSlot] = useState<string>("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = basketTotal(lines);

  useEffect(() => {
    getCollectionSlots(slug, date).then((s) => { setSlots(s); setSlot(s[0]?.at ?? ""); });
  }, [slug, date]);

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await placeCollectionOrder(slug, { ...form, requestedAt: slot, lines });
      if ("error" in res) return setError(res.error ?? "Something went wrong");
      clear();
      router.push(`/r/${slug}/order/${res.orderId}`);
    });

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--background)]">
      <div className="mx-auto max-w-lg p-4 pb-32">
        <button className="btn-ghost mb-4" onClick={onClose}>← Back to menu</button>
        <h2 className="text-2xl font-bold">Your order</h2>
        <ul className="my-4 divide-y divide-border">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="font-medium">{l.name}</div>
                {l.modifiers.length > 0 && <div className="text-xs text-muted">{l.modifiers.map((m) => m.name).join(", ")}</div>}
                {l.notes && <div className="text-xs italic text-muted">{l.notes}</div>}
              </div>
              <div className="flex items-center rounded-lg border border-border">
                <button className="px-3 py-1" onClick={() => setQty(l.key, l.qty - 1)}>−</button>
                <span className="w-6 text-center text-sm">{l.qty}</span>
                <button className="px-3 py-1" onClick={() => setQty(l.key, l.qty + 1)}>+</button>
              </div>
              <div className="w-16 text-right text-sm font-semibold">{formatMoney(lineTotal(l.unit_price_pence, l.modifiers, l.qty), currency)}</div>
            </li>
          ))}
        </ul>
        {lines.length === 0 && <p className="text-muted">Your basket is empty.</p>}

        <h3 className="mt-6 font-bold">Collection time</h3>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button key={d} onClick={() => setDate(d)} className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${date === d ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}>
              {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </button>
          ))}
        </div>
        {slots.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No collection times available on this day.</p>
        ) : (
          <select className="input mt-2" value={slot} onChange={(e) => setSlot(e.target.value)}>
            {slots.map((s) => <option key={s.at} value={s.at}>{s.label}</option>)}
          </select>
        )}

        <h3 className="mt-6 font-bold">Your details</h3>
        <div className="mt-2 grid gap-2">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Mobile number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <textarea className="input" placeholder="Notes for the kitchen (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 rounded-2xl bg-stone-100 p-4 text-sm">
          Pay at the counter when you collect. <span className="text-muted">Online payment coming soon.</span>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-4">
        <button className="btn-primary mx-auto flex w-full max-w-lg justify-between py-4" disabled={pending || !slot || lines.length === 0 || !form.name || !form.phone} onClick={submit}>
          <span>{pending ? "Placing order…" : "Place order"}</span>
          <span>{formatMoney(total, currency)}</span>
        </button>
      </div>
    </div>
  );
}
