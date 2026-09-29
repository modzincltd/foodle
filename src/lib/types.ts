import type { ThemeJson } from "@/lib/site/theme";
export type OrderType = "dine_in" | "collection" | "delivery";
export type OrderStatus = "draft" | "placed" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type KitchenStatus = "pending" | "preparing" | "ready" | "served";
export type BookingStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
export type StaffRole = "owner" | "manager" | "staff" | "kitchen";

export interface RestaurantSettings {
  collection_enabled: boolean;
  delivery_enabled: boolean;
  booking_enabled: boolean;
  collection_lead_minutes: number;
  collection_slot_minutes: number;
  booking_slot_minutes: number;
  booking_default_duration_minutes: number;
  booking_max_party: number;
  auto_accept_online_orders: boolean;
  vat_rate: number;
}

export interface GalleryItem {
  url: string;
  type: "image" | "video";
  caption?: string;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  currency: string;
  timezone: string;
  logo_url: string | null;
  hero_url: string | null;
  hero_video_url: string | null;
  gallery: GalleryItem[];
  theme: ThemeJson;
  settings: RestaurantSettings;
}

export interface OpeningHours {
  id: string;
  kind: "service" | "collection" | "booking";
  day_of_week: number;
  opens: string; // "12:00:00"
  closes: string;
}

export interface Table {
  id: string;
  area_id: string | null;
  name: string;
  seats: number;
  bookable: boolean;
  active: boolean;
  tablet_token: string;
  sort: number;
}

export interface Area {
  id: string;
  name: string;
  sort: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  price_pence: number;
  available: boolean;
  sort: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_pence: number;
  image_url: string | null;
  available: boolean;
  sold_out: boolean;
  allergens: string[];
  dietary: string[];
  spice: number;
  kitchen_station: string | null;
  sort: number;
  modifier_groups: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sort: number;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  available_from: string | null;
  available_until: string | null;
  days: number[];
  channels: string[];
  sort: number;
  categories: MenuCategory[];
}

export interface ChosenModifier {
  group: string;
  name: string;
  price_pence: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  unit_price_pence: number;
  qty: number;
  modifiers: ChosenModifier[];
  line_total_pence: number;
  notes: string | null;
  kitchen_station: string | null;
  kitchen_status: KitchenStatus;
  course: number;
  sent_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  source: string;
  table_id: string | null;
  staff_id: string | null;
  covers: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  subtotal_pence: number;
  discount_pence: number;
  service_pence: number;
  total_pence: number;
  payment_status: PaymentStatus;
  payment_method: string | null;
  requested_at: string | null;
  placed_at: string | null;
  accepted_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  table?: { name: string } | null;
}

export interface Booking {
  id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  party_size: number;
  starts_at: string;
  duration_minutes: number;
  status: BookingStatus;
  source: string;
  notes: string | null;
  created_at: string;
  table?: { name: string } | null;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
}

/** Basket line used by POS, tablet and website before an order exists. */
export interface BasketLine {
  key: string; // item id + modifier signature
  menu_item_id: string;
  name: string;
  unit_price_pence: number;
  qty: number;
  modifiers: ChosenModifier[];
  notes?: string;
  kitchen_station: string | null;
}
