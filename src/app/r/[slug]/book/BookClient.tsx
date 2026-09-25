"use client";
import { useEffect, useState, useTransition } from "react";
import { getBookingSlots, placeBooking } from "../actions";

export function BookClient({ slug, days, maxParty, phone }: { slug: string; days: string[]; maxParty: number; phone: string | null }) {
  const [party, setParty] = useState(2);
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState<{ at: string; label: string }[] | null>(null);
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    setSlots(null);
    getBookingSlots(slug, date, party).then((s) => { setSlots(s); setSlot(""); });
  }, [slug, date, party]);

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await placeBooking(slug, { ...form, partySize: party, startsAt: slot });
      if ("error" in res) return setError(res.error ?? "Something went wrong");
      setDone(true);
    });

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl">🎉</div>
        <h2 className="mt-2 text-xl font-bold">You&apos;re booked in</h2>
        <p className="mt-1 text-muted">
          Table for {party} on {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {slots?.find((s) => s.at === slot)?.label}.
        </p>
        <p className="mt-3 text-sm text-muted">Need to change it? Call us{phone ? ` on ${phone}` : ""}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block font-semibold">Party size</label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setParty(n)} className={`h-11 w-11 rounded-xl border font-semibold ${party === n ? "border-primary bg-primary text-white" : "border-border bg-card"}`}>{n}</button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">Larger groups? Call us{phone ? ` on ${phone}` : ""}.</p>
      </div>

      <div>
        <label className="mb-2 block font-semibold">Date</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button key={d} onClick={() => setDate(d)} className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${date === d ? "border-primary bg-primary/10 font-semibold" : "border-border bg-card"}`}>
              {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-semibold">Time</label>
        {slots === null ? (
          <p className="text-sm text-muted">Checking availability…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">Nothing available for {party} on this day. Try another date.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button key={s.at} onClick={() => setSlot(s.at)} className={`rounded-xl border py-2 text-sm font-semibold ${slot === s.at ? "border-primary bg-primary text-white" : "border-border bg-card"}`}>{s.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Mobile number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input" placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <textarea className="input" placeholder="Special requests, occasion, allergies (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full py-4" disabled={pending || !slot || !form.name || !form.phone} onClick={submit}>
        {pending ? "Booking…" : "Confirm booking"}
      </button>
    </div>
  );
}
