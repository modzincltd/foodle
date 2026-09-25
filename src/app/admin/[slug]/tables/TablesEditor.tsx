"use client";
import { useState, useTransition } from "react";
import type { Area, Table } from "@/lib/types";
import { deleteTable, upsertArea, upsertTable } from "../actions";
import { Modal, Field, Check, Select } from "../ui";

type Editing = { kind: "area"; area?: Area } | { kind: "table"; table?: Table } | null;

export function TablesEditor({ slug, tables, areas, baseUrl }: { slug: string; tables: Table[]; areas: Area[]; baseUrl: string }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); setEditing(null); });
  const groups = [...areas.map((a) => ({ area: a, tables: tables.filter((t) => t.area_id === a.id) })), { area: null, tables: tables.filter((t) => !t.area_id) }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tables & areas</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setEditing({ kind: "area" })}>+ Area</button>
          <button className="btn-primary" onClick={() => setEditing({ kind: "table" })}>+ Table</button>
        </div>
      </div>
      <p className="text-sm text-muted">Each table has a private link for a table tablet or a QR code. Print the QR and stick it on the table; guests order straight to the kitchen.</p>

      {groups.filter((g) => g.area || g.tables.length).map((g) => (
        <section key={g.area?.id ?? "none"} className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-bold">{g.area?.name ?? "No area"}</h2>
            {g.area && <button className="text-xs text-muted" onClick={() => setEditing({ kind: "area", area: g.area! })}>edit</button>}
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-1">Table</th><th>Seats</th><th>Bookable</th><th>Tablet / QR link</th><th /></tr></thead>
            <tbody className="divide-y divide-border">
              {g.tables.map((t) => {
                const url = `${baseUrl}/t/${t.tablet_token}`;
                return (
                  <tr key={t.id}>
                    <td className="py-2 font-semibold">{t.name}</td>
                    <td>{t.seats}</td>
                    <td>{t.bookable ? "Yes" : "No"}</td>
                    <td className="space-x-2">
                      <code className="rounded bg-stone-100 px-1 text-xs">{url}</code>
                      <a className="text-xs text-primary" target="_blank" href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}`}>QR</a>
                    </td>
                    <td className="text-right"><button className="text-xs text-muted hover:text-foreground" onClick={() => setEditing({ kind: "table", table: t })}>edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {editing?.kind === "area" && (
        <Modal title={editing.area ? "Edit area" : "New area"} onClose={() => setEditing(null)}>
          <form action={(fd) => run(() => upsertArea(slug, fd))} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.area?.id} />
            <Field label="Name" name="name" defaultValue={editing.area?.name} required placeholder="Main / Terrace / Bar" />
            <Field label="Sort" name="sort" type="number" defaultValue={String(editing.area?.sort ?? 0)} />
            <div className="flex justify-end"><button className="btn-primary" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
      {editing?.kind === "table" && (
        <Modal title={editing.table ? `Edit ${editing.table.name}` : "New table"} onClose={() => setEditing(null)}>
          <form action={(fd) => run(() => upsertTable(slug, fd))} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.table?.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" name="name" defaultValue={editing.table?.name} required placeholder="T1" />
              <Field label="Seats" name="seats" type="number" defaultValue={String(editing.table?.seats ?? 2)} />
            </div>
            <Select label="Area" name="area_id" defaultValue={editing.table?.area_id ?? ""}>
              <option value="">No area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Field label="Sort" name="sort" type="number" defaultValue={String(editing.table?.sort ?? 0)} />
            <div className="flex gap-4">
              <Check name="bookable" label="Bookable online" defaultChecked={editing.table?.bookable ?? true} />
              <Check name="active" label="Active" defaultChecked={editing.table?.active ?? true} />
            </div>
            <div className="flex items-center justify-between pt-2">
              {editing.table ? <button type="button" className="text-sm text-red-600" onClick={() => confirm("Remove table?") && run(() => deleteTable(slug, editing.table!.id))}>Remove</button> : <span />}
              <button className="btn-primary" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
