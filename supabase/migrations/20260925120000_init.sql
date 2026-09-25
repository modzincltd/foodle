-- Foodle: multi-tenant restaurant platform
-- Every tenant-owned row carries restaurant_id; RLS keys off it.

create extension if not exists "pgcrypto" with schema extensions;

-- ---------- enums ----------
create type order_type as enum ('dine_in', 'collection', 'delivery');
create type order_status as enum ('draft', 'placed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled');
create type payment_status as enum ('unpaid', 'paid', 'refunded');
create type kitchen_status as enum ('pending', 'preparing', 'ready', 'served');
create type booking_status as enum ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
create type staff_role as enum ('owner', 'manager', 'staff', 'kitchen');
create type hours_kind as enum ('service', 'collection', 'booking');
create type print_status as enum ('queued', 'printing', 'done', 'failed');

-- ---------- tenants ----------
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  tagline text,
  description text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country text not null default 'GB',
  currency text not null default 'GBP',
  timezone text not null default 'Europe/London',
  logo_url text,
  hero_url text,
  theme jsonb not null default '{"primary":"#c2410c","accent":"#fbbf24"}',
  settings jsonb not null default '{
    "collection_enabled": true,
    "delivery_enabled": false,
    "booking_enabled": true,
    "collection_lead_minutes": 20,
    "collection_slot_minutes": 15,
    "booking_slot_minutes": 30,
    "booking_default_duration_minutes": 90,
    "booking_max_party": 12,
    "auto_accept_online_orders": false,
    "vat_rate": 20
  }',
  order_counter integer not null default 0,
  created_at timestamptz not null default now()
);

-- admin users (Supabase auth) -> restaurants
create table restaurant_users (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role staff_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

-- till / kitchen staff with PIN login (not auth.users)
create table staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  pin_hash text not null,
  role staff_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on staff (restaurant_id);

create table opening_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  kind hours_kind not null default 'service',
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  opens time not null,
  closes time not null,
  unique (restaurant_id, kind, day_of_week, opens)
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort integer not null default 0
);

create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  name text not null,
  seats smallint not null default 2,
  bookable boolean not null default true,
  active boolean not null default true,
  tablet_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  sort integer not null default 0
);
create index on tables (restaurant_id);

-- ---------- menu ----------
create table menus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  available_from time,
  available_until time,
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  channels text[] not null default '{dine_in,collection,delivery,website}',
  sort integer not null default 0
);
create index on menus (restaurant_id);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_id uuid not null references menus(id) on delete cascade,
  name text not null,
  description text,
  sort integer not null default 0
);
create index on menu_categories (menu_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price_pence integer not null check (price_pence >= 0),
  image_url text,
  available boolean not null default true,
  sold_out boolean not null default false,
  allergens text[] not null default '{}',
  dietary text[] not null default '{}',   -- v, vg, gf, etc
  spice smallint not null default 0,
  kitchen_station text,                   -- e.g. grill, fryer, bar, cold
  sort integer not null default 0
);
create index on menu_items (category_id);
create index on menu_items (restaurant_id);

create table modifier_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  min_select smallint not null default 0,
  max_select smallint not null default 1,
  sort integer not null default 0
);

create table modifier_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references modifier_groups(id) on delete cascade,
  name text not null,
  price_pence integer not null default 0,
  available boolean not null default true,
  sort integer not null default 0
);
create index on modifier_options (group_id);

create table item_modifier_groups (
  item_id uuid not null references menu_items(id) on delete cascade,
  group_id uuid not null references modifier_groups(id) on delete cascade,
  sort integer not null default 0,
  primary key (item_id, group_id)
);

-- ---------- orders ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  number integer not null,
  type order_type not null,
  status order_status not null default 'draft',
  source text not null default 'pos', -- pos | web | tablet
  table_id uuid references tables(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  covers smallint,
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  subtotal_pence integer not null default 0,
  discount_pence integer not null default 0,
  service_pence integer not null default 0,
  total_pence integer not null default 0,
  payment_status payment_status not null default 'unpaid',
  payment_method text,          -- cash | card_terminal | online
  requested_at timestamptz,     -- collection time
  placed_at timestamptz,
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, number)
);
create index on orders (restaurant_id, status);
create index on orders (restaurant_id, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name text not null,
  unit_price_pence integer not null,
  qty smallint not null default 1 check (qty > 0),
  modifiers jsonb not null default '[]', -- [{group, name, price_pence}]
  line_total_pence integer not null,
  notes text,
  kitchen_station text,
  kitchen_status kitchen_status not null default 'pending',
  course smallint not null default 1,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on order_items (order_id);

-- per-restaurant order numbers
create or replace function assign_order_number() returns trigger language plpgsql as $$
begin
  if new.number is null then
    update restaurants set order_counter = order_counter + 1
      where id = new.restaurant_id returning order_counter into new.number;
  end if;
  return new;
end $$;
alter table orders alter column number drop not null;
create trigger orders_number before insert on orders for each row execute function assign_order_number();

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger orders_touch before update on orders for each row execute function touch_updated_at();

-- recompute totals from items
create or replace function recalc_order_totals(p_order_id uuid) returns void language plpgsql as $$
declare v_sub integer;
begin
  select coalesce(sum(line_total_pence),0) into v_sub from order_items where order_id = p_order_id;
  update orders set subtotal_pence = v_sub,
    total_pence = greatest(0, v_sub - discount_pence + service_pence)
    where id = p_order_id;
end $$;

create or replace function order_items_recalc() returns trigger language plpgsql as $$
begin
  perform recalc_order_totals(coalesce(new.order_id, old.order_id));
  return null;
end $$;
create trigger order_items_recalc after insert or update or delete on order_items
  for each row execute function order_items_recalc();

-- ---------- bookings ----------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid references tables(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  party_size smallint not null check (party_size > 0),
  starts_at timestamptz not null,
  duration_minutes smallint not null default 90,
  status booking_status not null default 'pending',
  source text not null default 'web',
  notes text,
  created_at timestamptz not null default now()
);
create index on bookings (restaurant_id, starts_at);

-- ---------- printing ----------
create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  printer text not null default 'kitchen',  -- kitchen | bar | receipt
  kind text not null default 'ticket',
  payload jsonb not null,
  status print_status not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  printed_at timestamptz
);
create index on print_jobs (restaurant_id, status);

-- ---------- RLS ----------
alter table restaurants enable row level security;
alter table restaurant_users enable row level security;
alter table staff enable row level security;
alter table opening_hours enable row level security;
alter table areas enable row level security;
alter table tables enable row level security;
alter table menus enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table modifier_groups enable row level security;
alter table modifier_options enable row level security;
alter table item_modifier_groups enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table bookings enable row level security;
alter table print_jobs enable row level security;

-- helper: is the current auth user an admin of this restaurant?
create or replace function is_restaurant_admin(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from restaurant_users where restaurant_id = rid and user_id = auth.uid());
$$;

-- Public (anon) can read the menu/site data.
create policy "public read restaurants" on restaurants for select using (true);
create policy "public read hours" on opening_hours for select using (true);
create policy "public read areas" on areas for select using (true);
create policy "public read tables" on tables for select using (active);
create policy "public read menus" on menus for select using (active);
create policy "public read categories" on menu_categories for select using (true);
create policy "public read items" on menu_items for select using (available);
create policy "public read mod groups" on modifier_groups for select using (true);
create policy "public read mod options" on modifier_options for select using (available);
create policy "public read item mods" on item_modifier_groups for select using (true);

-- Admins (Supabase auth) get full control of their restaurant's rows.
create policy "admin all restaurants" on restaurants for all using (is_restaurant_admin(id));
create policy "admin read membership" on restaurant_users for select using (user_id = auth.uid());
create policy "admin all staff" on staff for all using (is_restaurant_admin(restaurant_id));
create policy "admin all hours" on opening_hours for all using (is_restaurant_admin(restaurant_id));
create policy "admin all areas" on areas for all using (is_restaurant_admin(restaurant_id));
create policy "admin all tables" on tables for all using (is_restaurant_admin(restaurant_id));
create policy "admin all menus" on menus for all using (is_restaurant_admin(restaurant_id));
create policy "admin all categories" on menu_categories for all using (is_restaurant_admin(restaurant_id));
create policy "admin all items" on menu_items for all using (is_restaurant_admin(restaurant_id));
create policy "admin all mod groups" on modifier_groups for all using (is_restaurant_admin(restaurant_id));
create policy "admin all mod options" on modifier_options for all
  using (exists (select 1 from modifier_groups g where g.id = group_id and is_restaurant_admin(g.restaurant_id)));
create policy "admin all item mods" on item_modifier_groups for all
  using (exists (select 1 from menu_items i where i.id = item_id and is_restaurant_admin(i.restaurant_id)));
create policy "admin all orders" on orders for all using (is_restaurant_admin(restaurant_id));
create policy "admin all order items" on order_items for all using (is_restaurant_admin(restaurant_id));
create policy "admin all bookings" on bookings for all using (is_restaurant_admin(restaurant_id));
create policy "admin all print jobs" on print_jobs for all using (is_restaurant_admin(restaurant_id));

-- Orders, bookings, staff PIN checks and print jobs from the POS/KDS/website
-- are written server-side with the service role (bypasses RLS) after the
-- app has validated the staff session cookie or the public request.

-- ---------- RPCs ----------
-- PIN check happens in SQL so hashes never leave the database.
create or replace function staff_check_pin(p_restaurant_id uuid, p_pin text)
returns table (id uuid, name text, role staff_role)
language sql stable security definer set search_path = public, extensions as $$
  select s.id, s.name, s.role from staff s
  where s.restaurant_id = p_restaurant_id and s.active
    and s.pin_hash = crypt(p_pin, s.pin_hash)
  limit 1;
$$;
revoke all on function staff_check_pin(uuid, text) from public, anon, authenticated;

-- Hash a PIN when admins create/update staff.
create or replace function staff_hash_pin(p_pin text) returns text
language sql volatile set search_path = public, extensions as $$ select crypt(p_pin, gen_salt('bf')); $$;
