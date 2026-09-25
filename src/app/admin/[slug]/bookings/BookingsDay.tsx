"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Booking, BookingStatus, Table } from "@/lib/types";
import { adminCreateBooking, adminSetBooking } from "../actions";
import { Modal, Field, Select } from "../ui";

const STATUSES: BookingStatus[] = ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"];

export function BookingsDay({ slug, day, tz, bookings, tables }: { slug: string; day: string; tz: string; bookings: Booking[]; tables: Table[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const shift = (n: number) => { const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + n); router.push(`?date=${d.toISOString().slice(0, 10)}`); };
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const covers = bookings.filter((b) => !["cancelled", "no_show"].includes(b.status)).reduce((s, b) => s + b.party_size, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <div className="flex items-center gap-1">
          <button className="btn-ghost py-1" onClick={() => shift(-1)}>‹</button>
          <input type="date" className="input w-auto py-1" value={day} onChange={(e) => router.push(`?date=${e.target.value}`)} />
          <button className="btn-ghost py-1" onClick={() => shift(1)}>›</button>
        </div>
        <span className="text-sm text-muted">{bookings.length} bookings · {covers} covers</span>
        <button className="btn-primary ml-auto" onClick={() => { setError(null); setAdding(true); }}>+ Add booking</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-muted"><tr><th className="px-4 py-2">Time</th><th>Guest</th><th>Party</th><th>Table</th><th>Notes</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {bookings.map((b) => (
              <tr key={b.id} className={["cancelled", "no_show"].includes(b.status) ? "opacity-50" : ""}>
                <td className="px-4 py-2 font-semibold tabular-nums">{time(b.starts_at)}</td>
                <td><div className="font-medium">{b.customer_name}</div><div className="text-xs text-muted">{b.customer_phone} {b.customer_email}</div></td>
                <td>{b.party_size}</td>
                <td>{b.table?.name ?? "–"}</td>
                <td className="max-w-xs truncate text-muted">{b.notes}</td>
                <td className="pr-4">
                  <select className="input w-auto py-1 text-xs capitalize" value={b.status} disabled={busy} onChange={(e) => start(() => adminSetBooking(slug, b.id, e.target.value as BookingStatus))}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">No bookings on this day.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add booking" onClose={() => setAdding(false)}>
          <form action={(fd) => start(async () => { const r = await adminCreateBooking(slug, fd); if (r?.error) setError(r.error); else setAdding(false); })} className="space-y-3">
            <Field label="Guest name" name="name" required />
            <Field label="Phone" name="phone" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Party size" name="party_size" type="number" defaultValue="2" min={1} />
              <Field label="Date & time" name="starts_at" type="datetime-local" defaultValue={`${day}T19:00`} required />
            </div>
            <Select label="Table (auto if blank)" name="table_id" defaultValue="">
              <option value="">Auto-assign</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.seats})</option>)}
            </Select>
            <Field label="Notes" name="notes" placeholder="Birthday, highchair, allergies…" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end"><button className="btn-primary" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
