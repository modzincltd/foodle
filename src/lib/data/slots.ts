import type { OpeningHours, RestaurantSettings } from "@/lib/types";

/** Local date/time helpers that respect the restaurant's timezone. */
export function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour === "24" ? 0 : p.hour) * 60 + Number(p.minute),
    dow,
  };
}

/** Convert a local "YYYY-MM-DD" + minutes-since-midnight in tz to a UTC Date. */
export function fromLocal(date: string, minutes: number, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const hh = Math.floor(minutes / 60), mm = minutes % 60;
  // First guess: treat as UTC, then correct by the tz offset at that instant.
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMinutes(guess, tz);
  return new Date(guess.getTime() - offset * 60_000);
}

function tzOffsetMinutes(d: Date, tz: string) {
  const p = localParts(d, tz);
  const [y, m, day] = p.date.split("-").map(Number);
  const asUtc = Date.UTC(y, m - 1, day, Math.floor(p.minutes / 60), p.minutes % 60);
  return Math.round((asUtc - d.getTime()) / 60_000);
}

export function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function dowOf(date: string, tz: string) {
  return localParts(fromLocal(date, 12 * 60, tz), tz).dow;
}

export interface Slot { minutes: number; label: string; at: string }

/**
 * Generate bookable/collectable slots for a given local date.
 */
export function slotsForDate(
  date: string,
  hours: OpeningHours[],
  kind: OpeningHours["kind"],
  settings: RestaurantSettings,
  tz: string,
  now = new Date(),
): Slot[] {
  const dow = dowOf(date, tz);
  const step = kind === "booking" ? settings.booking_slot_minutes : settings.collection_slot_minutes;
  const lead = kind === "collection" ? settings.collection_lead_minutes : 0;
  const lastOffset = kind === "booking" ? settings.booking_default_duration_minutes : 0;
  const nowLocal = localParts(now, tz);
  const out: Slot[] = [];
  for (const h of hours.filter((x) => x.kind === kind && x.day_of_week === dow)) {
    const open = toMinutes(h.opens), close = toMinutes(h.closes);
    for (let m = Math.ceil(open / step) * step; m + lastOffset <= close; m += step) {
      if (date === nowLocal.date && m < nowLocal.minutes + lead) continue;
      if (date < nowLocal.date) continue;
      const at = fromLocal(date, m, tz).toISOString();
      out.push({ minutes: m, at, label: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` });
    }
  }
  return out;
}

export function nextDays(n: number, tz: string, from = new Date()) {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    days.push(localParts(new Date(from.getTime() + i * 86_400_000), tz).date);
  }
  return days;
}
