import Link from "next/link";
import { notFound } from "next/navigation";
import { getMenus, getOpeningHours, getRestaurantBySlug } from "@/lib/data/restaurant";
import { formatMoney } from "@/lib/money";
import { Badges } from "@/components/menu/ItemModal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function RestaurantHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const [menus, hours] = await Promise.all([getMenus(r.id, { channel: "website" }), getOpeningHours(r.id)]);
  const service = hours.filter((h) => h.kind === "service");

  return (
    <div>
      <section className="relative -mx-4 mb-8 overflow-hidden bg-stone-900 text-white">
        {r.hero_url && <img src={r.hero_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <h1 className="text-4xl font-black sm:text-6xl">{r.name}</h1>
          {r.tagline && <p className="mt-2 text-lg opacity-90">{r.tagline}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {r.settings.collection_enabled && <Link href={`/r/${slug}/order`} className="btn-primary">Order for collection</Link>}
            {r.settings.booking_enabled && <Link href={`/r/${slug}/book`} className="btn bg-white text-stone-900">Book a table</Link>}
            <a href={`/api/r/${slug}/menu.pdf`} className="btn border border-white/40 text-white">Menu PDF</a>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <div>
          {r.description && <p className="mb-8 text-lg text-muted">{r.description}</p>}
          {menus.map((m) => (
            <div key={m.id} className="mb-10">
              <h2 className="text-2xl font-bold">{m.name}</h2>
              {m.available_from && <p className="text-sm text-muted">{m.available_from.slice(0, 5)} – {m.available_until?.slice(0, 5)}</p>}
              {m.categories.map((c) => (
                <div key={c.id} className="mt-6">
                  <h3 className="mb-2 text-lg font-semibold uppercase tracking-wide text-primary">{c.name}</h3>
                  <ul className="divide-y divide-border">
                    {c.items.map((i) => (
                      <li key={i.id} className="flex items-start justify-between gap-4 py-3">
                        <div>
                          <div className="font-medium">{i.name}</div>
                          {i.description && <div className="text-sm text-muted">{i.description}</div>}
                          <Badges item={i} />
                        </div>
                        <div className="shrink-0 font-semibold">{formatMoney(i.price_pence, r.currency)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        <aside className="card h-fit p-5 text-sm">
          <h3 className="mb-3 font-bold">Opening hours</h3>
          <ul className="space-y-1">
            {DAYS.map((d, i) => {
              const h = service.filter((x) => x.day_of_week === i);
              return (
                <li key={d} className="flex justify-between">
                  <span>{d}</span>
                  <span className="text-muted">{h.length ? h.map((x) => `${x.opens.slice(0, 5)}–${x.closes.slice(0, 5)}`).join(", ") : "Closed"}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-1 text-muted">
            {r.address_line1 && <div>{[r.address_line1, r.address_line2, r.city, r.postcode].filter(Boolean).join(", ")}</div>}
            {r.phone && <div><a href={`tel:${r.phone}`}>{r.phone}</a></div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
