import { requireAdmin } from "@/lib/auth/admin";
import { getOpeningHours } from "@/lib/data/restaurant";
import { saveSettings } from "../actions";
import { SubmitButton } from "./SubmitButton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KINDS = [["service", "Open (eat in)"], ["collection", "Collection orders"], ["booking", "Bookings"]] as const;

export default async function SettingsAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  const hours = await getOpeningHours(r.id);
  const s = r.settings;
  const h = (kind: string, d: number) => hours.find((x) => x.kind === kind && x.day_of_week === d);
  const action = saveSettings.bind(null, slug);

  return (
    <form action={action} className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <SubmitButton />
      </div>

      <Section title="Restaurant">
        <div className="grid gap-3 sm:grid-cols-2">
          <L label="Name"><input className="input" name="name" defaultValue={r.name} required /></L>
          <L label="Tagline"><input className="input" name="tagline" defaultValue={r.tagline ?? ""} /></L>
          <L label="Phone"><input className="input" name="phone" defaultValue={r.phone ?? ""} /></L>
          <L label="Email"><input className="input" name="email" defaultValue={r.email ?? ""} /></L>
          <L label="Address line 1"><input className="input" name="address_line1" defaultValue={r.address_line1 ?? ""} /></L>
          <L label="Address line 2"><input className="input" name="address_line2" defaultValue={r.address_line2 ?? ""} /></L>
          <L label="City"><input className="input" name="city" defaultValue={r.city ?? ""} /></L>
          <L label="Postcode"><input className="input" name="postcode" defaultValue={r.postcode ?? ""} /></L>
        </div>
        <p className="text-sm text-muted">Logo, header banner, video, gallery, colours, fonts and template are on the <a className="font-medium text-primary underline" href={`/admin/${slug}/website`}>Website</a> page.</p>
        <L label="Description"><textarea className="input" name="description" rows={3} defaultValue={r.description ?? ""} /></L>
      </Section>

      <Section title="Ordering & bookings">
        <div className="flex flex-wrap gap-5 text-sm">
          <C name="collection_enabled" label="Collection orders" on={s.collection_enabled} />
          <C name="delivery_enabled" label="Delivery (coming soon)" on={s.delivery_enabled} />
          <C name="booking_enabled" label="Online bookings" on={s.booking_enabled} />
          <C name="auto_accept_online_orders" label="Auto-accept online orders (send straight to kitchen)" on={s.auto_accept_online_orders} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <L label="Collection lead time (min)"><input className="input" type="number" name="collection_lead_minutes" defaultValue={s.collection_lead_minutes} /></L>
          <L label="Collection slot size (min)"><input className="input" type="number" name="collection_slot_minutes" defaultValue={s.collection_slot_minutes} /></L>
          <L label="VAT rate %"><input className="input" type="number" name="vat_rate" defaultValue={s.vat_rate} /></L>
          <L label="Booking slot size (min)"><input className="input" type="number" name="booking_slot_minutes" defaultValue={s.booking_slot_minutes} /></L>
          <L label="Table turn time (min)"><input className="input" type="number" name="booking_default_duration_minutes" defaultValue={s.booking_default_duration_minutes} /></L>
          <L label="Max party size online"><input className="input" type="number" name="booking_max_party" defaultValue={s.booking_max_party} /></L>
        </div>
      </Section>

      <Section title="Opening hours">
        <p className="text-sm text-muted">Leave both blank for closed.</p>
        {KINDS.map(([kind, label]) => (
          <div key={kind}>
            <h3 className="mb-2 mt-4 font-semibold">{label}</h3>
            <div className="grid grid-cols-7 gap-2 text-xs">
              {DAYS.map((d, i) => (
                <div key={d}>
                  <div className="mb-1 font-semibold text-muted">{d}</div>
                  <input className="input mb-1 px-1 py-1 text-xs" type="time" name={`hours_${kind}_${i}_open`} defaultValue={h(kind, i)?.opens.slice(0, 5) ?? ""} />
                  <input className="input px-1 py-1 text-xs" type="time" name={`hours_${kind}_${i}_close`} defaultValue={h(kind, i)?.closes.slice(0, 5) ?? ""} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-4 p-5"><h2 className="text-lg font-bold">{title}</h2>{children}</section>;
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
function C({ name, label, on }: { name: string; label: string; on: boolean }) {
  return <label className="inline-flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={on} className="h-4 w-4" />{label}</label>;
}
