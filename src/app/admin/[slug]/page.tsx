import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { listOrders } from "@/lib/data/orders";
import { listBookings } from "@/lib/data/bookings";
import { getTables } from "@/lib/data/restaurant";
import { formatMoney } from "@/lib/money";

export default async function Overview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const [orders, bookings, { tables }] = await Promise.all([
    listOrders(r.id, { since: dayStart.toISOString(), limit: 500 }),
    listBookings(r.id, dayStart.toISOString(), dayEnd.toISOString()),
    getTables(r.id),
  ]);
  const paid = orders.filter((o) => o.payment_status === "paid");
  const revenue = paid.reduce((s, o) => s + o.total_pence, 0);
  const live = orders.filter((o) => ["placed", "accepted", "preparing", "ready"].includes(o.status));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (paid)" value={formatMoney(revenue, r.currency)} />
        <Stat label="Orders" value={String(orders.filter((o) => o.status !== "cancelled").length)} sub={`${live.length} live`} />
        <Stat label="Avg ticket" value={paid.length ? formatMoney(Math.round(revenue / paid.length), r.currency) : "–"} />
        <Stat label="Bookings" value={String(bookings.filter((b) => !["cancelled", "no_show"].includes(b.status)).length)} sub={`${bookings.reduce((s, b) => s + b.party_size, 0)} covers`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold">Live orders</h2>
          {live.length === 0 && <p className="text-sm text-muted">Nothing in progress.</p>}
          <ul className="divide-y divide-border text-sm">
            {live.map((o) => (
              <li key={o.id} className="flex justify-between py-2">
                <span>#{o.number} · {o.type === "dine_in" ? `Table ${o.table?.name}` : o.customer_name} <span className="chip bg-stone-100 capitalize">{o.status}</span></span>
                <span>{formatMoney(o.total_pence, r.currency)}</span>
              </li>
            ))}
          </ul>
          <Link href={`/admin/${slug}/orders`} className="mt-3 inline-block text-sm font-semibold text-primary">All orders →</Link>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold">Set-up links</h2>
          <ul className="space-y-2 text-sm">
            <li><b>Public site:</b> <code className="rounded bg-stone-100 px-1">{base}/r/{slug}</code></li>
            <li><b>Staff till / kitchen:</b> <code className="rounded bg-stone-100 px-1">{base}/app/{slug}</code> — install as an app on each tablet (Share → Add to Home Screen).</li>
            <li><b>Table tablets / QR codes:</b> each table has a unique link — see <Link className="text-primary" href={`/admin/${slug}/tables`}>Tables</Link>. {tables.length} tables set up.</li>
            <li><b>Kitchen printer:</b> run <code className="rounded bg-stone-100 px-1">tools/print-bridge</code> on a machine on your network with <code className="rounded bg-stone-100 px-1">RESTAURANT_ID={r.id}</code>.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
