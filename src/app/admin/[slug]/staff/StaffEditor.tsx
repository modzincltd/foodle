"use client";
import { useState, useTransition } from "react";
import type { Staff } from "@/lib/types";
import { upsertStaff } from "../actions";
import { Modal, Field, Check, Select } from "../ui";

export function StaffEditor({ slug, staff }: { slug: string; staff: Staff[] }) {
  const [editing, setEditing] = useState<{ member?: Staff } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff & PINs</h1>
        <button className="btn-primary" onClick={() => { setError(null); setEditing({}); }}>+ Staff member</button>
      </div>
      <p className="text-sm text-muted">Staff sign in to the till and kitchen screen with a PIN. Managers can apply discounts.</p>
      <ul className="card divide-y divide-border">
        {staff.map((s) => (
          <li key={s.id} className={`flex items-center justify-between px-5 py-3 ${!s.active ? "opacity-50" : ""}`}>
            <span><b>{s.name}</b> <span className="chip ml-2 bg-stone-100 capitalize">{s.role}</span></span>
            <button className="text-sm text-muted hover:text-foreground" onClick={() => { setError(null); setEditing({ member: s }); }}>edit</button>
          </li>
        ))}
      </ul>

      {editing && (
        <Modal title={editing.member ? `Edit ${editing.member.name}` : "New staff member"} onClose={() => setEditing(null)}>
          <form action={(fd) => start(async () => { const r = await upsertStaff(slug, fd); if (r?.error) setError(r.error); else setEditing(null); })} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.member?.id} />
            <Field label="Name" name="name" defaultValue={editing.member?.name} required />
            <Select label="Role" name="role" defaultValue={editing.member?.role ?? "staff"}>
              <option value="staff">Staff</option><option value="kitchen">Kitchen</option><option value="manager">Manager</option><option value="owner">Owner</option>
            </Select>
            <Field label={editing.member ? "New PIN (leave blank to keep)" : "PIN (4–6 digits)"} name="pin" inputMode="numeric" pattern="\d{4,6}" placeholder="••••" />
            <Check name="active" label="Active" defaultChecked={editing.member?.active ?? true} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end"><button className="btn-primary" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
