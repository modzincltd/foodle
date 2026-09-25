import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrder } from "@/lib/data/orders";
import { getRestaurantBySlug } from "@/lib/data/restaurant";
import { formatMoney } from "@/lib/money";
import { OrderStatusLive } from "./OrderStatusLive";

export default async function OrderConfirmation({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params;
  const r = await getRestaurantBySlug(slug);
  const order = await getOrder(orderId);
  if (!r || !order || order.restaurant_id !== r.id) notFound();
  const time = order.requested_at ? new Date(order.requested_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: r.timezone }) : "";

  return (
    <div className="mx-auto max-w-lg pt-8">
      <div className="card p-6 text-center">
        <div className="text-sm uppercase tracking-wide text-muted">Order</div>
        <div className="text-5xl font-black">#{order.number}</div>
        <OrderStatusLive orderId={order.id} initial={order.status} restaurantId={r.id} />
        <p className="mt-4 text-muted">Collection at <b className="text-foreground">{time}</b> · {r.name}</p>
        {order.status === "placed" && <p className="mt-2 text-sm text-muted">We&apos;ll confirm your order shortly. Keep this page open.</p>}
      </div>
      <ul className="card mt-4 divide-y divide-border p-4">
        {order.items?.map((i) => (
          <li key={i.id} className="flex justify-between py-2 text-sm">
            <span>{i.qty} × {i.name}{i.modifiers.length ? <span className="text-muted"> · {i.modifiers.map((m) => m.name).join(", ")}</span> : null}</span>
            <span>{formatMoney(i.line_total_pence, r.currency)}</span>
          </li>
        ))}
        <li className="flex justify-between pt-3 font-bold"><span>Total to pay on collection</span><span>{formatMoney(order.total_pence, r.currency)}</span></li>
      </ul>
      <Link href={`/r/${slug}`} className="btn-ghost mt-6 w-full">Back to {r.name}</Link>
    </div>
  );
}
