import { requireAdmin } from "@/lib/auth/admin";
import { listOrders } from "@/lib/data/orders";
import { formatMoney } from "@/lib/money";

export default async function OrdersAdmin({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ days?: string }> }) {
  const { slug } = await params;
  const { days } = await searchParams;
  const r = await requireAdmin(slug);
  const n = Number(days ?? 1);
  const since = new Date(Date.now() - n * 86_400_000).toISOString();
  const orders = await listOrders(r.id, { since, limit: 500 });
  const paid = orders.filter((o) => o.payment_status === "paid");
  const rev = paid.reduce((s, o) => s + o.total_pence, 0);
  const cash = paid.filter((o) => o.payment_method === "cash").reduce((s, o) => s + o.total_pence, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-1 text-sm">
          {[1, 7, 30].map((d) => <a key={d} href={`?days=${d}`} className={`rounded-lg px-3 py-1 ${n === d ? "bg-stone-900 text-white" : "bg-stone-100"}`}>{d === 1 ? "Today" : `${d} days`}</a>)}
        </div>
        <div className="ml-auto text-sm text-muted">
          {paid.length} paid · <b className="text-foreground">{formatMoney(rev, r.currency)}</b> · cash {formatMoney(cash, r.currency)} · card {formatMoney(rev - cash, r.currency)}
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-muted"><tr><th className="px-4 py-2">#</th><th>When</th><th>Type</th><th>Who</th><th>Items</th><th>Status</th><th>Payment</th><th className="pr-4 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => (
              <tr key={o.id} className={o.status === "cancelled" ? "opacity-50" : ""}>
                <td className="px-4 py-2 font-semibold">{o.number}</td>
                <td className="whitespace-nowrap text-muted">{new Date(o.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: r.timezone })}</td>
                <td className="capitalize">{o.type.replace("_", "-")} <span className="text-xs text-muted">{o.source}</span></td>
                <td>{o.type === "dine_in" ? `Table ${o.table?.name ?? "?"}` : o.customer_name}</td>
                <td className="max-w-sm truncate text-muted">{o.items?.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                <td><span className="chip bg-stone-100 capitalize">{o.status}</span></td>
                <td className="capitalize">{o.payment_status}{o.payment_method ? ` · ${o.payment_method.replace("_", " ")}` : ""}</td>
                <td className="pr-4 text-right font-semibold tabular-nums">{formatMoney(o.total_pence, r.currency)}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">No orders in this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
