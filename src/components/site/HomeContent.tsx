import Link from "next/link";
import type { Menu, OpeningHours, Restaurant } from "@/lib/types";
import type { SiteTheme } from "@/lib/site/theme";
import { formatMoney } from "@/lib/money";
import { Badges } from "@/components/menu/ItemModal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface HomeData { restaurant: Restaurant; menus: Menu[]; hours: OpeningHours[] }

/** Home page body for the chosen template. `hours` should be service hours. */
export function HomeContent({ theme, ...d }: HomeData & { theme: SiteTheme }) {
  if (theme.template === "modern") return <Modern {...d} />;
  if (theme.template === "bistro") return <Bistro {...d} />;
  return <Classic {...d} />;
}

function Ctas({ r, light }: { r: Restaurant; light?: boolean }) {
  const slug = r.slug;
  return (
    <div className="flex flex-wrap gap-3">
      {r.settings.collection_enabled && <Link href={`/r/${slug}/order`} className="btn-primary">Order for collection</Link>}
      {r.settings.booking_enabled && <Link href={`/r/${slug}/book`} className={light ? "btn bg-white text-stone-900" : "btn-ghost"}>Book a table</Link>}
      <a href={`/api/r/${slug}/menu.pdf`} className={light ? "btn border border-white/40 text-white" : "btn-ghost"}>Menu PDF</a>
    </div>
  );
}

/** Header banner: video (with the banner image as poster) or image. */
function HeroMedia({ r, className }: { r: Restaurant; className: string }) {
  if (r.hero_video_url)
    return <video key={r.hero_video_url} src={r.hero_video_url} poster={r.hero_url ?? undefined} className={className} autoPlay muted loop playsInline />;
  if (r.hero_url) return <img src={r.hero_url} alt="" className={className} />;
  return null;
}

function Gallery({ r, title, variant }: { r: Restaurant; title: string; variant: "grid" | "mosaic" | "strip" }) {
  if (!r.gallery?.length) return null;
  const media = (g: Restaurant["gallery"][number], cls: string) =>
    g.type === "video"
      ? <video src={g.url} className={cls} autoPlay muted loop playsInline />
      : <img src={g.url} alt={g.caption ?? ""} className={cls} loading="lazy" />;
  return (
    <section className="mb-14">
      <h2 className={variant === "mosaic" ? "mb-6 text-5xl uppercase" : variant === "strip" ? "mb-6 text-center text-4xl italic" : "mb-4 text-2xl font-bold"}>{title}</h2>
      <div className={variant === "mosaic" ? "grid grid-cols-2 gap-3 md:grid-cols-4 [&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2" : variant === "strip" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
        {r.gallery.map((g) => (
          <figure key={g.url} className={`overflow-hidden bg-card ${variant === "mosaic" ? "rounded-2xl" : variant === "strip" ? "" : "rounded-xl"}`}>
            {media(g, `h-full w-full object-cover ${variant === "mosaic" ? "min-h-40" : "aspect-square"}`)}
            {g.caption && <figcaption className="px-2 py-1 text-xs text-muted">{g.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function hoursFor(hours: OpeningHours[], day: number) {
  const h = hours.filter((x) => x.day_of_week === day);
  return h.length ? h.map((x) => `${x.opens.slice(0, 5)}–${x.closes.slice(0, 5)}`).join(", ") : "Closed";
}

function Hours({ hours }: { hours: OpeningHours[] }) {
  return (
    <ul className="space-y-1">
      {DAYS.map((d, i) => (
        <li key={d} className="flex justify-between gap-4"><span>{d}</span><span className="text-muted">{hoursFor(hours, i)}</span></li>
      ))}
    </ul>
  );
}

function Address({ r }: { r: Restaurant }) {
  return (
    <div className="space-y-1 text-muted">
      {r.address_line1 && <div>{[r.address_line1, r.address_line2, r.city, r.postcode].filter(Boolean).join(", ")}</div>}
      {r.phone && <div><a href={`tel:${r.phone}`}>{r.phone}</a></div>}
      {r.email && <div><a href={`mailto:${r.email}`}>{r.email}</a></div>}
    </div>
  );
}

// ---------- Classic ----------

function Classic({ restaurant: r, menus, hours }: HomeData) {
  return (
    <div>
      <section className="relative -mx-4 mb-8 overflow-hidden bg-stone-900 text-white">
        <HeroMedia r={r} className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <h1 className="text-4xl font-black sm:text-6xl">{r.name}</h1>
          {r.tagline && <p className="mt-2 text-lg opacity-90">{r.tagline}</p>}
          <div className="mt-6"><Ctas r={r} light /></div>
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
                  <h3 className="mb-2 border-b-2 border-accent pb-1 text-lg font-semibold uppercase tracking-wide text-primary">{c.name}</h3>
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
          <Gallery r={r} title="Gallery" variant="grid" />
        </div>
        <aside className="card h-fit p-5 text-sm lg:row-span-2">
          <h3 className="mb-3 font-bold">Opening hours</h3>
          <Hours hours={hours} />
          <div className="mt-4"><Address r={r} /></div>
        </aside>
      </div>
    </div>
  );
}

// ---------- Modern ----------

function Modern({ restaurant: r, menus, hours }: HomeData) {
  return (
    <div>
      <section className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
        <div>
          <div className="mb-4 h-2 w-20 rounded-full bg-accent" />
          <h1 className="text-6xl uppercase leading-[0.9] sm:text-8xl">{r.name}</h1>
          {r.tagline && <p className="mt-4 text-xl text-muted">{r.tagline}</p>}
          <div className="mt-8"><Ctas r={r} /></div>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-card">
          {r.hero_url || r.hero_video_url ? <HeroMedia r={r} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-primary to-accent" />}
        </div>
      </section>

      {r.description && <p className="mb-12 max-w-3xl text-2xl leading-snug">{r.description}</p>}

      {menus.map((m) => (
        <section key={m.id} className="mb-14">
          <div className="mb-6 flex items-end justify-between border-b-4 border-foreground pb-2">
            <h2 className="text-5xl uppercase">{m.name}</h2>
            {m.available_from && <span className="text-sm text-muted">{m.available_from.slice(0, 5)} – {m.available_until?.slice(0, 5)}</span>}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {m.categories.map((c) => (
              <div key={c.id} className="card p-6">
                <h3 className="mb-4 text-3xl uppercase text-accent">{c.name}</h3>
                <ul className="space-y-4">
                  {c.items.map((i) => (
                    <li key={i.id} className="flex gap-4">
                      {i.image_url && <img src={i.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3 font-semibold"><span>{i.name}</span><span>{formatMoney(i.price_pence, r.currency)}</span></div>
                        {i.description && <div className="text-sm text-muted">{i.description}</div>}
                        <Badges item={i} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Gallery r={r} title="Gallery" variant="mosaic" />

      <section className="grid gap-5 rounded-3xl bg-primary p-8 text-[var(--on-primary)] md:grid-cols-2">
        <div><h2 className="mb-3 text-4xl uppercase">Opening hours</h2><div className="text-sm [&_.text-muted]:opacity-80 [&_.text-muted]:text-inherit"><Hours hours={hours} /></div></div>
        <div><h2 className="mb-3 text-4xl uppercase">Find us</h2><div className="text-sm [&_.text-muted]:text-inherit [&_.text-muted]:opacity-80"><Address r={r} /></div></div>
      </section>
    </div>
  );
}

// ---------- Bistro ----------

function Bistro({ restaurant: r, menus, hours }: HomeData) {
  return (
    <div>
      <section className="relative -mx-4 mb-12 overflow-hidden text-center text-white">
        {r.hero_url || r.hero_video_url ? <HeroMedia r={r} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-primary" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative px-4 py-20 sm:py-28">
          <div className="mx-auto mb-4 h-px w-16 bg-accent" />
          <h1 className="text-5xl italic sm:text-6xl">{r.name}</h1>
          {r.description && <p className="mx-auto mt-4 max-w-xl opacity-90">{r.description}</p>}
          <div className="mt-8 flex justify-center"><Ctas r={r} light /></div>
        </div>
      </section>

      {menus.map((m) => (
        <section key={m.id} className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-4xl italic">{m.name}</h2>
          {m.available_from && <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted">{m.available_from.slice(0, 5)} – {m.available_until?.slice(0, 5)}</p>}
          {m.categories.map((c) => (
            <div key={c.id} className="mt-10">
              <h3 className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-accent">— {c.name} —</h3>
              <ul className="space-y-5 text-left">
                {c.items.map((i) => (
                  <li key={i.id}>
                    <div className="flex items-baseline gap-2">
                      <span className="heading text-lg">{i.name}</span>
                      <span className="flex-1 border-b border-dotted border-muted/60" />
                      <span className="text-primary">{formatMoney(i.price_pence, r.currency)}</span>
                    </div>
                    {i.description && <div className="text-sm italic text-muted">{i.description}</div>}
                    <Badges item={i} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <Gallery r={r} title="Gallery" variant="strip" />

      <section className="mx-auto max-w-md border-y border-border py-8 text-center text-sm">
        <h2 className="mb-4 text-2xl italic">Hours &amp; location</h2>
        <Hours hours={hours} />
        <div className="mt-4"><Address r={r} /></div>
      </section>
    </div>
  );
}
