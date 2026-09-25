import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StaffRole } from "@/lib/types";

export interface StaffSession {
  staff_id: string;
  restaurant_id: string;
  slug: string;
  name: string;
  role: StaffRole;
  exp: number;
}

const COOKIE = "foodle_staff";
const TTL_SECONDS = 60 * 60 * 14; // one shift

function secret() {
  const s = process.env.STAFF_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("STAFF_SESSION_SECRET must be set (16+ chars)");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(s: StaffSession) {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): StaffSession | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as StaffSession;
    if (s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const c = await cookies();
  return decodeSession(c.get(COOKIE)?.value);
}

/** Throws unless a staff member for this slug is signed in. */
export async function requireStaff(slug: string, roles?: StaffRole[]): Promise<StaffSession> {
  const s = await getStaffSession();
  if (!s || s.slug !== slug) throw new Error("STAFF_UNAUTHENTICATED");
  if (roles && !roles.includes(s.role)) throw new Error("STAFF_FORBIDDEN");
  return s;
}

/** Verify a PIN against the restaurant's staff table (bcrypt via pgcrypto). */
export async function loginWithPin(slug: string, pin: string): Promise<StaffSession | null> {
  const db = supabaseAdmin();
  const { data: r } = await db.from("restaurants").select("id").eq("slug", slug).single();
  if (!r) return null;
  // crypt(pin, pin_hash) = pin_hash  -> compare in SQL so hashes never leave the DB
  const { data, error } = await db.rpc("staff_check_pin", { p_restaurant_id: r.id, p_pin: pin });
  if (error || !data || data.length === 0) return null;
  const row = data[0] as { id: string; name: string; role: StaffRole };
  const session: StaffSession = {
    staff_id: row.id,
    restaurant_id: r.id,
    slug,
    name: row.name,
    role: row.role,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const c = await cookies();
  c.set(COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return session;
}

export async function logoutStaff() {
  const c = await cookies();
  c.delete(COOKIE);
}
