"use client";
import { useState, useTransition } from "react";
import type { Menu, MenuCategory, MenuItem, ModifierGroup } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { deleteCategory, deleteItem, deleteMenu, deleteModifierGroup, toggleSoldOut, upsertCategory, upsertItem, upsertMenu, upsertModifierGroup } from "../actions";
import { Modal, Field, Check } from "../ui";

type Editing =
  | { kind: "menu"; menu?: Menu }
  | { kind: "category"; menuId: string; category?: MenuCategory }
  | { kind: "item"; categoryId: string; item?: MenuItem }
  | { kind: "group"; group?: ModifierGroup }
  | null;

export function MenuEditor({ slug, currency, menus, groups }: { slug: string; currency: string; menus: Menu[]; groups: ModifierGroup[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); setEditing(null); });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setEditing({ kind: "group" })}>+ Modifier group</button>
          <button className="btn-primary" onClick={() => setEditing({ kind: "menu" })}>+ Menu</button>
        </div>
      </div>

      {menus.map((m) => (
        <section key={m.id} className="card p-5">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-bold">{m.name}</h2>
            {!m.active && <span className="chip bg-stone-200">hidden</span>}
            {m.available_from && <span className="text-xs text-muted">{m.available_from.slice(0, 5)}–{m.available_until?.slice(0, 5)}</span>}
            <span className="text-xs text-muted">{m.channels.join(", ")}</span>
            <div className="ml-auto flex gap-2 text-sm">
              <button className="btn-ghost py-1" onClick={() => setEditing({ kind: "category", menuId: m.id })}>+ Category</button>
              <button className="btn-ghost py-1" onClick={() => setEditing({ kind: "menu", menu: m })}>Edit</button>
            </div>
          </div>
          {m.categories.map((c) => (
            <div key={c.id} className="mt-4">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <h3 className="font-semibold uppercase tracking-wide text-primary">{c.name}</h3>
                <button className="text-xs text-muted hover:text-foreground" onClick={() => setEditing({ kind: "category", menuId: m.id, category: c })}>edit</button>
                <button className="ml-auto text-xs font-semibold text-primary" onClick={() => setEditing({ kind: "item", categoryId: c.id })}>+ Item</button>
              </div>
              <ul className="divide-y divide-border">
                {c.items.map((i) => (
                  <li key={i.id} className={`flex items-center gap-3 py-2 text-sm ${!i.available ? "opacity-50" : ""}`}>
                    <button className="flex-1 text-left" onClick={() => setEditing({ kind: "item", categoryId: c.id, item: i })}>
                      <span className="font-medium">{i.name}</span>
                      {i.description && <span className="ml-2 text-muted">{i.description}</span>}
                      {i.modifier_groups.length > 0 && <span className="ml-2 text-xs text-muted">({i.modifier_groups.map((g) => g.name).join(", ")})</span>}
                    </button>
                    <span className="tabular-nums">{formatMoney(i.price_pence, currency)}</span>
                    <button
                      disabled={busy}
                      onClick={() => start(() => toggleSoldOut(slug, i.id, !i.sold_out))}
                      className={`chip ${i.sold_out ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                    >
                      {i.sold_out ? "Sold out" : "In stock"}
                    </button>
                  </li>
                ))}
                {c.items.length === 0 && <li className="py-2 text-sm text-muted">No items yet.</li>}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Modifier groups</h2>
        <p className="mb-3 text-sm text-muted">Sizes, extras, cooking preferences. Attach them to items when editing an item.</p>
        <ul className="divide-y divide-border text-sm">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2">
              <button className="text-left" onClick={() => setEditing({ kind: "group", group: g })}>
                <b>{g.name}</b> <span className="text-muted">· {g.min_select}–{g.max_select} · {g.options.map((o) => o.name).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ----- dialogs ----- */}
      {editing?.kind === "menu" && (
        <Modal title={editing.menu ? "Edit menu" : "New menu"} onClose={() => setEditing(null)}>
          <form action={(fd) => run(() => upsertMenu(slug, fd))} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.menu?.id} />
            <Field label="Name" name="name" defaultValue={editing.menu?.name} required />
            <Field label="Description" name="description" defaultValue={editing.menu?.description ?? ""} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="From (optional)" name="available_from" type="time" defaultValue={editing.menu?.available_from?.slice(0, 5) ?? ""} />
              <Field label="Until" name="available_until" type="time" defaultValue={editing.menu?.available_until?.slice(0, 5) ?? ""} />
              <Field label="Sort" name="sort" type="number" defaultValue={String(editing.menu?.sort ?? 0)} />
            </div>
            <div className="flex flex-wrap gap-4">
              <Check name="active" label="Active" defaultChecked={editing.menu?.active ?? true} />
              {["dine_in", "collection", "delivery", "website"].map((c) => (
                <Check key={c} name={`ch_${c}`} label={c.replace("_", "-")} defaultChecked={editing.menu ? editing.menu.channels.includes(c) : true} />
              ))}
            </div>
            <Actions busy={busy} onDelete={editing.menu ? () => confirm("Delete menu and everything in it?") && run(() => deleteMenu(slug, editing.menu!.id)) : undefined} />
          </form>
        </Modal>
      )}

      {editing?.kind === "category" && (
        <Modal title={editing.category ? "Edit category" : "New category"} onClose={() => setEditing(null)}>
          <form action={(fd) => run(() => upsertCategory(slug, fd))} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.category?.id} />
            <input type="hidden" name="menu_id" defaultValue={editing.menuId} />
            <Field label="Name" name="name" defaultValue={editing.category?.name} required />
            <Field label="Description" name="description" defaultValue={editing.category?.description ?? ""} />
            <Field label="Sort" name="sort" type="number" defaultValue={String(editing.category?.sort ?? 0)} />
            <Actions busy={busy} onDelete={editing.category ? () => confirm("Delete category and its items?") && run(() => deleteCategory(slug, editing.category!.id)) : undefined} />
          </form>
        </Modal>
      )}

      {editing?.kind === "item" && (
        <Modal title={editing.item ? "Edit item" : "New item"} onClose={() => setEditing(null)}>
          <form action={(fd) => run(() => upsertItem(slug, fd))} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.item?.id} />
            <input type="hidden" name="category_id" defaultValue={editing.categoryId} />
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="Name" name="name" defaultValue={editing.item?.name} required />
              <Field label="Price (£)" name="price" type="number" step="0.01" defaultValue={editing.item ? (editing.item.price_pence / 100).toFixed(2) : ""} required />
            </div>
            <Field label="Description" name="description" defaultValue={editing.item?.description ?? ""} />
            <Field label="Image URL" name="image_url" defaultValue={editing.item?.image_url ?? ""} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Allergens (comma-separated)" name="allergens" defaultValue={editing.item?.allergens.join(", ")} placeholder="gluten, milk, nuts" />
              <Field label="Dietary" name="dietary" defaultValue={editing.item?.dietary.join(", ")} placeholder="v, vg, gf" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Kitchen station" name="kitchen_station" defaultValue={editing.item?.kitchen_station ?? ""} placeholder="grill / bar / cold" />
              <Field label="Spice (0–3)" name="spice" type="number" defaultValue={String(editing.item?.spice ?? 0)} />
              <Field label="Sort" name="sort" type="number" defaultValue={String(editing.item?.sort ?? 0)} />
            </div>
            <div className="flex gap-4">
              <Check name="available" label="Visible" defaultChecked={editing.item?.available ?? true} />
              <Check name="sold_out" label="Sold out" defaultChecked={editing.item?.sold_out ?? false} />
            </div>
            {groups.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-medium">Modifier groups</div>
                <div className="flex flex-wrap gap-3">
                  {groups.map((g) => (
                    <Check key={g.id} name="modifier_group" value={g.id} label={g.name} defaultChecked={editing.item?.modifier_groups.some((x) => x.id === g.id) ?? false} />
                  ))}
                </div>
              </div>
            )}
            <Actions busy={busy} onDelete={editing.item ? () => confirm("Delete item?") && run(() => deleteItem(slug, editing.item!.id)) : undefined} />
          </form>
        </Modal>
      )}

      {editing?.kind === "group" && (
        <Modal title={editing.group ? "Edit modifier group" : "New modifier group"} onClose={() => setEditing(null)}>
          <form action={(fd) => run(() => upsertModifierGroup(slug, fd))} className="space-y-3">
            <input type="hidden" name="id" defaultValue={editing.group?.id} />
            <Field label="Name" name="name" defaultValue={editing.group?.name} required placeholder="Size / Extras / Cooked" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Min choices" name="min_select" type="number" defaultValue={String(editing.group?.min_select ?? 0)} />
              <Field label="Max choices" name="max_select" type="number" defaultValue={String(editing.group?.max_select ?? 1)} />
              <Field label="Sort" name="sort" type="number" defaultValue={String(editing.group?.sort ?? 0)} />
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Options — one per line: <code>Name, extra price</code></span>
              <textarea name="options" rows={6} className="input font-mono text-sm" defaultValue={editing.group?.options.map((o) => `${o.name}, ${(o.price_pence / 100).toFixed(2)}`).join("\n")} placeholder={"Small, 0\nLarge, 2.50"} />
            </label>
            <Actions busy={busy} onDelete={editing.group ? () => confirm("Delete group? Items lose these options.") && run(() => deleteModifierGroup(slug, editing.group!.id)) : undefined} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Actions({ busy, onDelete }: { busy: boolean; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onDelete ? <button type="button" className="text-sm text-red-600" onClick={onDelete}>Delete</button> : <span />}
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </div>
  );
}
