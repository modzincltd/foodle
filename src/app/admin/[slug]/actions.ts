"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyRestaurant } from "@/lib/data/realtime";
import { createBooking, setBookingStatus } from "@/lib/data/bookings";
import { setOrderStatus } from "@/lib/data/orders";
import type { BookingStatus, OrderStatus } from "@/lib/types";
import { FONTS, TEMPLATES } from "@/lib/site/theme";

const num = (v: FormDataEntryValue | null, d = 0) => (v === null || v === "" ? d : Number(v));
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const list = (v: FormDataEntryValue | null) => str(v).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const pence = (v: FormDataEntryValue | null) => Math.round(parseFloat(str(v) || "0") * 100);

function done(slug: string, section: string) {
  revalidatePath(`/admin/${slug}/${section}`);
  revalidatePath(`/r/${slug}`, "layout");
}

// ---------- menu ----------

export async function upsertMenu(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const row = {
    restaurant_id: r.id, name: str(fd.get("name")), description: str(fd.get("description")) || null,
    active: fd.get("active") === "on",
    available_from: str(fd.get("available_from")) || null, available_until: str(fd.get("available_until")) || null,
    channels: ["dine_in", "collection", "delivery", "website"].filter((c) => fd.get(`ch_${c}`) === "on"),
    sort: num(fd.get("sort")),
  };
  const db = supabaseAdmin();
  if (id) await db.from("menus").update(row).eq("id", id).eq("restaurant_id", r.id);
  else await db.from("menus").insert(row);
  await notifyRestaurant(r.id, "menu");
  done(slug, "menu");
}

export async function deleteMenu(slug: string, id: string) {
  const r = await requireAdmin(slug);
  await supabaseAdmin().from("menus").delete().eq("id", id).eq("restaurant_id", r.id);
  done(slug, "menu");
}

export async function upsertCategory(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const row = { restaurant_id: r.id, menu_id: str(fd.get("menu_id")), name: str(fd.get("name")), description: str(fd.get("description")) || null, sort: num(fd.get("sort")) };
  const db = supabaseAdmin();
  if (id) await db.from("menu_categories").update(row).eq("id", id).eq("restaurant_id", r.id);
  else await db.from("menu_categories").insert(row);
  done(slug, "menu");
}

export async function deleteCategory(slug: string, id: string) {
  const r = await requireAdmin(slug);
  await supabaseAdmin().from("menu_categories").delete().eq("id", id).eq("restaurant_id", r.id);
  done(slug, "menu");
}

export async function upsertItem(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const row = {
    restaurant_id: r.id, category_id: str(fd.get("category_id")), name: str(fd.get("name")),
    description: str(fd.get("description")) || null, price_pence: pence(fd.get("price")),
    image_url: str(fd.get("image_url")) || null, available: fd.get("available") === "on", sold_out: fd.get("sold_out") === "on",
    allergens: list(fd.get("allergens")), dietary: list(fd.get("dietary")), spice: num(fd.get("spice")),
    kitchen_station: str(fd.get("kitchen_station")) || null, sort: num(fd.get("sort")),
  };
  const db = supabaseAdmin();
  let itemId = id;
  if (id) await db.from("menu_items").update(row).eq("id", id).eq("restaurant_id", r.id);
  else { const { data } = await db.from("menu_items").insert(row).select("id").single(); itemId = data?.id; }
  if (itemId) {
    const groups = fd.getAll("modifier_group").map(String);
    await db.from("item_modifier_groups").delete().eq("item_id", itemId);
    if (groups.length) await db.from("item_modifier_groups").insert(groups.map((g, i) => ({ item_id: itemId!, group_id: g, sort: i })));
  }
  await notifyRestaurant(r.id, "menu");
  done(slug, "menu");
}

export async function deleteItem(slug: string, id: string) {
  const r = await requireAdmin(slug);
  await supabaseAdmin().from("menu_items").delete().eq("id", id).eq("restaurant_id", r.id);
  done(slug, "menu");
}

/** Quick 86 toggle used from the menu list. */
export async function toggleSoldOut(slug: string, id: string, soldOut: boolean) {
  const r = await requireAdmin(slug);
  await supabaseAdmin().from("menu_items").update({ sold_out: soldOut }).eq("id", id).eq("restaurant_id", r.id);
  await notifyRestaurant(r.id, "menu");
  done(slug, "menu");
}

export async function upsertModifierGroup(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const row = { restaurant_id: r.id, name: str(fd.get("name")), min_select: num(fd.get("min_select")), max_select: num(fd.get("max_select"), 1), sort: num(fd.get("sort")) };
  const db = supabaseAdmin();
  let gid = id;
  if (id) await db.from("modifier_groups").update(row).eq("id", id).eq("restaurant_id", r.id);
  else { const { data } = await db.from("modifier_groups").insert(row).select("id").single(); gid = data?.id; }
  // options: textarea, one per line "Name, 1.50"
  if (gid) {
    const lines = str(fd.get("options")).split("\n").map((l) => l.trim()).filter(Boolean);
    await db.from("modifier_options").delete().eq("group_id", gid);
    if (lines.length) {
      await db.from("modifier_options").insert(lines.map((l, i) => {
        const [name, price] = l.split(",").map((s) => s.trim());
        return { group_id: gid!, name, price_pence: Math.round(parseFloat(price || "0") * 100) || 0, sort: i };
      }));
    }
  }
  done(slug, "menu");
}

export async function deleteModifierGroup(slug: string, id: string) {
  const r = await requireAdmin(slug);
  await supabaseAdmin().from("modifier_groups").delete().eq("id", id).eq("restaurant_id", r.id);
  done(slug, "menu");
}

// ---------- tables ----------

export async function upsertArea(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const row = { restaurant_id: r.id, name: str(fd.get("name")), sort: num(fd.get("sort")) };
  const db = supabaseAdmin();
  if (id) await db.from("areas").update(row).eq("id", id).eq("restaurant_id", r.id);
  else await db.from("areas").insert(row);
  done(slug, "tables");
}

export async function upsertTable(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const row = { restaurant_id: r.id, area_id: str(fd.get("area_id")) || null, name: str(fd.get("name")), seats: num(fd.get("seats"), 2), bookable: fd.get("bookable") === "on", active: fd.get("active") === "on", sort: num(fd.get("sort")) };
  const db = supabaseAdmin();
  if (id) await db.from("tables").update(row).eq("id", id).eq("restaurant_id", r.id);
  else await db.from("tables").insert(row);
  done(slug, "tables");
}

export async function deleteTable(slug: string, id: string) {
  const r = await requireAdmin(slug);
  await supabaseAdmin().from("tables").update({ active: false }).eq("id", id).eq("restaurant_id", r.id);
  done(slug, "tables");
}

// ---------- staff ----------

export async function upsertStaff(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const id = str(fd.get("id")) || undefined;
  const pin = str(fd.get("pin"));
  if (pin && !/^\d{4,6}$/.test(pin)) return { error: "PIN must be 4–6 digits" };
  const db = supabaseAdmin();
  const base = { restaurant_id: r.id, name: str(fd.get("name")), role: str(fd.get("role")) || "staff", active: fd.get("active") === "on" };
  let pin_hash: string | undefined;
  if (pin) { const { data } = await db.rpc("staff_hash_pin", { p_pin: pin }); pin_hash = data as string; }
  if (id) await db.from("staff").update({ ...base, ...(pin_hash ? { pin_hash } : {}) }).eq("id", id).eq("restaurant_id", r.id);
  else { if (!pin_hash) return { error: "PIN required for new staff" }; await db.from("staff").insert({ ...base, pin_hash }); }
  done(slug, "staff");
  return {};
}

// ---------- settings ----------

const settingsSchema = z.object({
  collection_enabled: z.boolean(), delivery_enabled: z.boolean(), booking_enabled: z.boolean(),
  collection_lead_minutes: z.number().int().min(0), collection_slot_minutes: z.number().int().min(5),
  booking_slot_minutes: z.number().int().min(5), booking_default_duration_minutes: z.number().int().min(15),
  booking_max_party: z.number().int().min(1), auto_accept_online_orders: z.boolean(), vat_rate: z.number().min(0).max(100),
});

export async function saveSettings(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const settings = settingsSchema.parse({
    collection_enabled: fd.get("collection_enabled") === "on", delivery_enabled: fd.get("delivery_enabled") === "on", booking_enabled: fd.get("booking_enabled") === "on",
    collection_lead_minutes: num(fd.get("collection_lead_minutes"), 20), collection_slot_minutes: num(fd.get("collection_slot_minutes"), 15),
    booking_slot_minutes: num(fd.get("booking_slot_minutes"), 30), booking_default_duration_minutes: num(fd.get("booking_default_duration_minutes"), 90),
    booking_max_party: num(fd.get("booking_max_party"), 12), auto_accept_online_orders: fd.get("auto_accept_online_orders") === "on", vat_rate: num(fd.get("vat_rate"), 20),
  });
  const row = {
    name: str(fd.get("name")), tagline: str(fd.get("tagline")) || null, description: str(fd.get("description")) || null,
    phone: str(fd.get("phone")) || null, email: str(fd.get("email")) || null,
    address_line1: str(fd.get("address_line1")) || null, address_line2: str(fd.get("address_line2")) || null, city: str(fd.get("city")) || null, postcode: str(fd.get("postcode")) || null,
    settings,
  };
  await supabaseAdmin().from("restaurants").update(row).eq("id", r.id);
  // opening hours: rows hours_<kind>_<dow>_open / _close (blank = closed)
  const db = supabaseAdmin();
  await db.from("opening_hours").delete().eq("restaurant_id", r.id);
  const rows: { restaurant_id: string; kind: string; day_of_week: number; opens: string; closes: string }[] = [];
  for (const kind of ["service", "collection", "booking"]) for (let d = 0; d < 7; d++) {
    const o = str(fd.get(`hours_${kind}_${d}_open`)), c = str(fd.get(`hours_${kind}_${d}_close`));
    if (o && c) rows.push({ restaurant_id: r.id, kind, day_of_week: d, opens: o, closes: c });
  }
  if (rows.length) await db.from("opening_hours").insert(rows);
  done(slug, "settings");
}

// ---------- website ----------

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const fontName = z.enum(FONTS.map((f) => f.name) as [string, ...string[]]);
const websiteSchema = z.object({
  template: z.enum(TEMPLATES.map((t) => t.id) as [string, ...string[]]),
  primary: hex, accent: hex, background: hex,
  heading_font: fontName, body_font: fontName,
});

export async function saveWebsite(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  const theme = websiteSchema.parse(Object.fromEntries(["template", "primary", "accent", "background", "heading_font", "body_font"].map((k) => [k, str(fd.get(k))])));
  const { error } = await supabaseAdmin().from("restaurants").update({ theme: { ...r.theme, ...theme } }).eq("id", r.id);
  if (error) throw new Error(error.message);
  done(slug, "website");
}

// ---------- website media ----------

const MEDIA_BUCKET = "site-media";
const MEDIA_TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

/** Signed URL the browser uploads straight to (keeps big videos out of server actions). */
export async function createMediaUpload(slug: string, kind: "logo" | "hero" | "video" | "gallery", contentType: string, size: number) {
  const r = await requireAdmin(slug);
  const ext = MEDIA_TYPES[contentType];
  if (!ext) throw new Error("Unsupported file type");
  const isVideo = contentType.startsWith("video/");
  if (kind === "video" && !isVideo) throw new Error("Header video must be MP4, WebM or MOV");
  if ((kind === "logo" || kind === "hero") && isVideo) throw new Error("Please upload an image");
  if (size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) throw new Error(`File too large (max ${isVideo ? "100" : "10"} MB)`);
  const path = `${r.id}/${kind}/${crypto.randomUUID()}.${ext}`;
  const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Could not start upload");
  return { path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}

const mediaUrl = z.string().url().nullable();
const mediaSchema = z.object({
  logo_url: mediaUrl, hero_url: mediaUrl, hero_video_url: mediaUrl,
  gallery: z.array(z.object({ url: z.string().url(), type: z.enum(["image", "video"]), caption: z.string().max(200).optional() })).max(24),
}).partial();

/** Save media fields; files that are no longer used are removed from storage. */
export async function saveMedia(slug: string, patch: z.infer<typeof mediaSchema>) {
  const r = await requireAdmin(slug);
  const next = mediaSchema.parse(patch);
  const { error } = await supabaseAdmin().from("restaurants").update(next).eq("id", r.id);
  if (error) throw new Error(error.message);

  const used = (x: { logo_url?: string | null; hero_url?: string | null; hero_video_url?: string | null; gallery?: { url: string }[] | null }) =>
    [x.logo_url, x.hero_url, x.hero_video_url, ...(x.gallery ?? []).map((g) => g.url)].filter(Boolean) as string[];
  const nowUsed = new Set(used({ ...r, ...next }));
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const orphans = used(r).filter((u) => !nowUsed.has(u) && u.includes(marker)).map((u) => u.split(marker)[1])
    .filter((p) => p.startsWith(`${r.id}/`));
  if (orphans.length) await supabaseAdmin().storage.from(MEDIA_BUCKET).remove(orphans);
  done(slug, "website");
}

// ---------- bookings / orders ----------

export async function adminCreateBooking(slug: string, fd: FormData) {
  const r = await requireAdmin(slug);
  try {
    await createBooking(r, {
      name: str(fd.get("name")), phone: str(fd.get("phone")) || undefined, partySize: num(fd.get("party_size"), 2),
      startsAt: new Date(str(fd.get("starts_at"))).toISOString(), notes: str(fd.get("notes")) || undefined,
      source: "phone", tableId: str(fd.get("table_id")) || null,
    });
  } catch (e) { return { error: (e as Error).message }; }
  done(slug, "bookings");
  return {};
}

export async function adminSetBooking(slug: string, id: string, status: BookingStatus) {
  await requireAdmin(slug);
  await setBookingStatus(id, status);
  done(slug, "bookings");
}

export async function adminSetOrder(slug: string, id: string, status: OrderStatus) {
  await requireAdmin(slug);
  await setOrderStatus(id, status);
  done(slug, "orders");
}
