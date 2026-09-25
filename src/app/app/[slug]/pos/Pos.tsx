"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { BasketLine, ChosenModifier, MenuItem, Order } from "@/lib/types";
import { formatMoney, lineTotal } from "@/lib/money";
import { basketKey } from "@/lib/basket";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { useRestaurantChannel } from "@/components/useRestaurantChannel";
import { posBootstrap, posFire, posGetOrder, posPay, posRemoveItem, posSetStatus, posSubmitTable, posSubmitTakeaway, posVoidOrder } from "../actions";

type Boot = Awaited<ReturnType<typeof posBootstrap>>;
type Mode = { kind: "floor" } | { kind: "table"; tableId: string } | { kind: "takeaway" };

export function Pos({ slug, initial }: { slug: string; initial: Boot }) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<Mode>({ kind: "floor" });
  const refresh = useCallback(() => posBootstrap(slug).then(setData), [slug]);
  useRestaurantChannel(data.restaurant.id, "orders", refresh);

  const currency = data.restaurant.currency;

  if (mode.kind === "floor") {
    return <Floor data={data} onTable={(id) => setMode({ kind: "table", tableId: id })} onTakeaway={() => setMode({ kind: "takeaway" })} slug={slug} refresh={refresh} />;
  }
  const table = mode.kind === "table" ? data.tables.find((t) => t.id === mode.tableId) : null;
  const open = mode.kind === "table" ? data.openByTable[mode.tableId] : undefined;
  return (
    <OrderScreen
      key={mode.kind === "table" ? mode.tableId : "takeaway"}
      slug={slug}
      currency={currency}
      menus={data.menus}
      title={table ? `Table ${table.name}` : "Takeaway"}
      existing={open}
      takeaway={mode.kind === "takeaway"}
      tableId={table?.id}
      defaultCovers={table?.seats ?? null}
      onBack={() => { setMode({ kind: "floor" }); refresh(); }}
    />
  );
}

// ---------------- Floor / table map ----------------

function Floor({ data, onTable, onTakeaway, slug, refresh }: { data: Boot; onTable: (id: string) => void; onTakeaway: () => void; slug: string; refresh: () => void }) {
  const [, start] = useTransition();
  const ago = (iso: string) => `${Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))}m`;
  return (
    <div className="grid h-full grid-cols-[1fr_320px]">
      <div className="overflow-y-auto p-4">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-xl font-bold">Tables</h1>
          <button className="btn bg-accent text-stone-900 ml-auto" onClick={onTakeaway}>+ Takeaway</button>
        </div>
        {data.areas.map((a) => (
          <section key={a.id} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">{a.name}</h2>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {data.tables.filter((t) => t.area_id === a.id).map((t) => {
                const o = data.openByTable[t.id];
                return (
                  <button key={t.id} onClick={() => onTable(t.id)} className={`flex aspect-square flex-col justify-between rounded-2xl p-3 text-left ${o ? (o.status === "ready" ? "bg-green-700" : o.status === "draft" ? "bg-stone-600" : "bg-primary") : "bg-stone-800 hover:bg-stone-700"}`}>
                    <div className="flex justify-between text-sm"><span className="font-bold text-lg">{t.name}</span><span className="text-stone-300">{o?.covers ?? t.seats}👤</span></div>
                    {o ? (
                      <div className="text-sm">
                        <div className="font-semibold">{formatMoney(o.total_pence, data.restaurant.currency)}</div>
                        <div className="text-xs opacity-80">{ago(o.created_at)} · {o.status}</div>
                      </div>
                    ) : <div className="text-xs text-stone-500">Free</div>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {data.tables.filter((t) => !t.area_id).length > 0 && (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {data.tables.filter((t) => !t.area_id).map((t) => (
              <button key={t.id} onClick={() => onTable(t.id)} className="aspect-square rounded-2xl bg-stone-800 p-3 text-left font-bold">{t.name}</button>
            ))}
          </div>
        )}
      </div>

      <aside className="flex flex-col border-l border-stone-800 bg-stone-950">
        <h2 className="px-4 py-3 font-bold">Takeaway & online</h2>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
          {data.activeTakeaway.length === 0 && <p className="px-1 text-sm text-stone-500">No active takeaway orders.</p>}
          {data.activeTakeaway.map((o) => (
            <div key={o.id} className="rounded-xl bg-stone-900 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold">#{o.number} <span className="font-normal text-stone-400">{o.customer_name}</span></span>
                <StatusChip status={o.status} />
              </div>
              <div className="mt-1 text-xs text-stone-400">
                {o.source === "web" ? "Online" : "Till"} · {o.requested_at ? new Date(o.requested_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "ASAP"} · {formatMoney(o.total_pence, data.restaurant.currency)} · {o.payment_status}
              </div>
              <div className="mt-2 flex gap-2">
                {o.status === "placed" && <button className="btn bg-green-600 text-white flex-1 py-1.5 text-xs" onClick={() => start(async () => { await posSetStatus(slug, o.id, "accepted"); refresh(); })}>Accept</button>}
                {o.status === "placed" && <button className="btn bg-stone-700 py-1.5 text-xs" onClick={() => start(async () => { await posVoidOrder(slug, o.id, "Rejected at till"); refresh(); })}>Reject</button>}
                {["accepted", "preparing"].includes(o.status) && <button className="btn bg-stone-700 flex-1 py-1.5 text-xs" onClick={() => start(async () => { await posSetStatus(slug, o.id, "ready"); refresh(); })}>Mark ready</button>}
                {o.status === "ready" && o.payment_status !== "paid" && <PayButtons slug={slug} order={o} currency={data.restaurant.currency} onDone={refresh} compact />}
                {o.status === "ready" && o.payment_status === "paid" && <button className="btn bg-green-700 flex-1 py-1.5 text-xs" onClick={() => start(async () => { await posSetStatus(slug, o.id, "completed"); refresh(); })}>Collected</button>}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls: Record<string, string> = { placed: "bg-amber-500 text-stone-900", accepted: "bg-blue-600", preparing: "bg-blue-600", ready: "bg-green-600", draft: "bg-stone-600" };
  return <span className={`chip ${cls[status] ?? "bg-stone-700"}`}>{status}</span>;
}

// ---------------- Order screen ----------------

function OrderScreen({
  slug, currency, menus, title, existing, takeaway, tableId, defaultCovers, onBack,
}: {
  slug: string; currency: string; menus: Boot["menus"]; title: string; existing?: Order; takeaway: boolean; tableId?: string; defaultCovers: number | null; onBack: () => void;
}) {
  const [order, setOrder] = useState<Order | undefined>(existing);
  const [pendingLines, setPendingLines] = useState<BasketLine[]>([]);
  const [covers, setCovers] = useState<number | null>(existing?.covers ?? defaultCovers);
  const [customer, setCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => setOrder(existing), [existing]);

  const addLine = (item: MenuItem, modifiers: ChosenModifier[], qty: number, notes?: string) => {
    const key = basketKey(item.id, modifiers, notes);
    setPendingLines((ls) => {
      const ex = ls.find((l) => l.key === key);
      if (ex) return ls.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [...ls, { key, menu_item_id: item.id, name: item.name, unit_price_pence: item.price_pence, qty, modifiers, notes, kitchen_station: item.kitchen_station }];
    });
  };

  const pendingTotal = pendingLines.reduce((s, l) => s + lineTotal(l.unit_price_pence, l.modifiers, l.qty), 0);
  const grandTotal = (order?.subtotal_pence ?? 0) + pendingTotal;

  const submit = (fire: boolean) =>
    start(async () => {
      setError(null);
      const res = takeaway
        ? await posSubmitTakeaway(slug, pendingLines, customer, null)
        : await posSubmitTable(slug, tableId!, covers, pendingLines, fire);
      if ("error" in res) return setError(res.error ?? "Failed");
      setOrder(res.order);
      setPendingLines([]);
      if (takeaway) onBack();
    });

  const reload = async (id: string) => { const o = await posGetOrder(slug, id); if (o) setOrder(o); };
  const fireExisting = () => order && start(async () => { await posFire(slug, order.id); await reload(order.id); });

  const unsent = (order?.items ?? []).filter((i) => !i.sent_at);

  return (
    <div className="grid h-full grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-stone-800 px-4 py-2">
          <button className="btn-dark py-1.5" onClick={onBack}>← Tables</button>
          <h1 className="text-lg font-bold">{title}</h1>
          {order && <span className="text-stone-400">#{order.number}</span>}
          <input className="input ml-auto max-w-xs border-stone-700 bg-stone-900 py-1.5 text-white" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <MenuBrowser menus={menus} currency={currency} onAdd={addLine} dark compact search={search || undefined} />
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-l border-stone-800 bg-stone-950">
        <div className="flex items-center gap-2 border-b border-stone-800 px-3 py-2 text-sm">
          {takeaway ? (
            <input className="input border-stone-700 bg-stone-900 py-1.5 text-white" placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          ) : (
            <>
              <span className="text-stone-400">Covers</span>
              <div className="flex items-center rounded-lg border border-stone-700">
                <button className="px-3 py-1" onClick={() => setCovers((c) => Math.max(1, (c ?? 1) - 1))}>−</button>
                <span className="w-6 text-center">{covers ?? "–"}</span>
                <button className="px-3 py-1" onClick={() => setCovers((c) => (c ?? 0) + 1)}>+</button>
              </div>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {order?.items?.map((i) => (
            <div key={i.id} className={`flex items-start gap-2 border-b border-stone-900 px-3 py-2 text-sm ${i.sent_at ? "" : "bg-stone-900/60"}`}>
              <span className="w-6 text-right font-bold">{i.qty}</span>
              <div className="flex-1">
                <div>{i.name}</div>
                {i.modifiers.length > 0 && <div className="text-xs text-stone-400">{i.modifiers.map((m) => m.name).join(", ")}</div>}
                {i.notes && <div className="text-xs italic text-stone-400">{i.notes}</div>}
                <div className="text-[10px] uppercase tracking-wide text-stone-500">{i.sent_at ? `sent · ${i.kitchen_status}` : "not sent"}</div>
              </div>
              <span className="tabular-nums">{formatMoney(i.line_total_pence, currency)}</span>
              {!i.sent_at && <button className="text-stone-500 hover:text-red-400" onClick={() => start(async () => { await posRemoveItem(slug, i.id); await reload(order.id); })}>✕</button>}
            </div>
          ))}
          {pendingLines.map((l) => (
            <div key={l.key} className="flex items-start gap-2 border-b border-stone-900 bg-accent/10 px-3 py-2 text-sm">
              <div className="flex flex-col items-center">
                <button className="px-2 text-stone-400" onClick={() => setPendingLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                <span className="font-bold">{l.qty}</span>
                <button className="px-2 text-stone-400" onClick={() => setPendingLines((ls) => ls.flatMap((x) => (x.key === l.key ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])))}>−</button>
              </div>
              <div className="flex-1">
                <div>{l.name}</div>
                {l.modifiers.length > 0 && <div className="text-xs text-stone-400">{l.modifiers.map((m) => m.name).join(", ")}</div>}
                {l.notes && <div className="text-xs italic text-stone-400">{l.notes}</div>}
              </div>
              <span className="tabular-nums">{formatMoney(lineTotal(l.unit_price_pence, l.modifiers, l.qty), currency)}</span>
            </div>
          ))}
          {!order?.items?.length && pendingLines.length === 0 && <p className="p-4 text-sm text-stone-500">Tap items to add them.</p>}
        </div>

        {error && <p className="mx-3 mb-2 rounded-lg bg-red-900/50 p-2 text-xs text-red-200">{error}</p>}

        <div className="border-t border-stone-800 p-3">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-stone-400">Total</span>
            <span className="text-2xl font-black tabular-nums">{formatMoney(grandTotal, currency)}</span>
          </div>
          {takeaway ? (
            <button className="btn-primary w-full py-3" disabled={busy || pendingLines.length === 0} onClick={() => submit(true)}>Send to kitchen</button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-dark py-3" disabled={busy || pendingLines.length === 0} onClick={() => submit(false)}>Hold</button>
              <button className="btn-primary py-3" disabled={busy || (pendingLines.length === 0 && unsent.length === 0)} onClick={() => (pendingLines.length ? submit(true) : fireExisting())}>
                Send to kitchen
              </button>
              <button className="btn bg-green-600 text-white col-span-2 py-3" disabled={busy || !order || pendingLines.length > 0 || order.total_pence === 0} onClick={() => setPaying(true)}>
                Pay {order ? formatMoney(order.total_pence, currency) : ""}
              </button>
              {order && (
                <button className="col-span-2 text-xs text-stone-500 hover:text-red-400" disabled={busy} onClick={() => { if (confirm("Void this whole order?")) start(async () => { await posVoidOrder(slug, order.id, "Voided at till"); onBack(); }); }}>
                  Void order
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {paying && order && <PayModal slug={slug} order={order} currency={currency} onClose={() => setPaying(false)} onDone={onBack} />}
    </div>
  );
}

// ---------------- Payment ----------------

function PayButtons({ slug, order, currency, onDone, compact }: { slug: string; order: Order; currency: string; onDone: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn bg-green-600 text-white flex-1 ${compact ? "py-1.5 text-xs" : "py-3"}`} onClick={() => setOpen(true)}>Take payment</button>
      {open && <PayModal slug={slug} order={order} currency={currency} onClose={() => setOpen(false)} onDone={onDone} />}
    </>
  );
}

function PayModal({ slug, order, currency, onClose, onDone }: { slug: string; order: Order; currency: string; onClose: () => void; onDone: () => void }) {
  const [discount, setDiscount] = useState(0);
  const [cash, setCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const due = Math.max(0, order.subtotal_pence - discount + order.service_pence);
  const tendered = Math.round(parseFloat(cash || "0") * 100);
  const change = tendered - due;
  const pay = (method: "cash" | "card_terminal") =>
    start(async () => {
      const res = await posPay(slug, order.id, method, discount);
      if (res.error) return setError(res.error);
      onDone();
    });
  const quick = useMemo(() => [500, 1000, 2000, 5000].filter((v) => v >= due).slice(0, 3), [due]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-stone-900 p-5 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Order #{order.number}</h2>
          <span className="text-3xl font-black">{formatMoney(due, currency)}</span>
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-wide text-stone-400">Discount (manager)</label>
          <div className="mt-1 flex gap-2">
            {[0, 10, 20, 50].map((p) => (
              <button key={p} className={`btn flex-1 py-2 text-sm ${discount === Math.round((order.subtotal_pence * p) / 100) ? "bg-accent text-stone-900" : "bg-stone-800"}`} onClick={() => setDiscount(Math.round((order.subtotal_pence * p) / 100))}>{p ? `${p}%` : "None"}</button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-wide text-stone-400">Cash tendered</label>
          <div className="mt-1 flex gap-2">
            <input className="input border-stone-700 bg-stone-800 text-white" inputMode="decimal" placeholder="0.00" value={cash} onChange={(e) => setCash(e.target.value)} />
            {quick.map((v) => <button key={v} className="btn bg-stone-800 px-3 text-sm" onClick={() => setCash((v / 100).toFixed(2))}>{formatMoney(v, currency)}</button>)}
            <button className="btn bg-stone-800 px-3 text-sm" onClick={() => setCash((due / 100).toFixed(2))}>Exact</button>
          </div>
          {tendered > 0 && <p className={`mt-1 text-sm ${change < 0 ? "text-red-400" : "text-green-400"}`}>{change < 0 ? `Short by ${formatMoney(-change, currency)}` : `Change ${formatMoney(change, currency)}`}</p>}
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-900/50 p-2 text-sm text-red-200">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn bg-green-600 py-4 text-white" disabled={busy || (tendered > 0 && change < 0)} onClick={() => pay("cash")}>Cash</button>
          <button className="btn bg-blue-600 py-4 text-white" disabled={busy} onClick={() => pay("card_terminal")}>Card (terminal)</button>
        </div>
        <button className="mt-3 w-full text-sm text-stone-400" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
