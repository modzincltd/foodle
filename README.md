# Foodle

All-in-one restaurant platform: public website, online collection ordering, table bookings,
touchscreen POS, table tablet menus, kitchen display, thermal printing and PDF menus.
Multi-tenant from day one — one deployment serves many restaurants.

**Stack:** Next.js 16 (App Router, PWA) · Supabase (Postgres, Auth, Realtime) · Tailwind v4 · Vercel.

## Apps in one codebase

| URL | Who | What |
|---|---|---|
| `/r/{slug}` | Customers | Website: menu, opening hours, order for collection, book a table |
| `/r/{slug}/order/{id}` | Customers | Live order status page |
| `/t/{token}` | Guests at a table | Tablet / QR menu — orders go straight to the kitchen, see your bill |
| `/app/{slug}` | Staff | PIN login → Till (POS), Kitchen (KDS), Orders & Bookings |
| `/admin` | Owners/managers | Menus, modifiers, tables & QR codes, staff PINs, bookings, orders, settings, hours |
| `/api/r/{slug}/menu.pdf` | Anyone | Print-ready A4 menu generated from live data |

Kitchen tickets and receipts are queued in `print_jobs`; `tools/print-bridge` runs on a
machine in the restaurant and pushes ESC/POS bytes to network thermal printers.

## Setup

1. **Supabase** — create a project, then run `supabase/migrations/*.sql` followed by
   `supabase/seed.sql` (demo restaurant, slug `demo`, PINs `1234` manager / `5678` kitchen / `1111` staff).
   Or `supabase link && supabase db push && supabase db seed`.
2. **Env** — copy `.env.example` → `.env.local`, fill in the Supabase URL, anon key, service role key
   and a random `STAFF_SESSION_SECRET`.
3. **Admin user** — create a user in Supabase Auth (email + password), then:
   ```sql
   insert into restaurant_users (restaurant_id, user_id, role)
   values ('00000000-0000-0000-0000-000000000001', '<auth user id>', 'owner');
   ```
4. `pnpm install && pnpm dev` → http://localhost:3000

### Print bridge
```bash
cd tools/print-bridge && npm i
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… RESTAURANT_ID=… \
PRINTER_kitchen=192.168.1.50 PRINTER_bar=192.168.1.51 PRINTER_receipt=192.168.1.52 npm start
```
Set `PRINTER_kitchen=console` to test without a printer.

### Tablets
Open `/app/{slug}` (till / kitchen) or the table's `/t/{token}` link in Safari/Chrome and
**Add to Home Screen** — it runs full-screen as an installed PWA.

## Security model
- Public menu/site data is readable via RLS with the anon key.
- Orders, bookings, print jobs and PINs are only touched server-side (service role) after
  validating a signed staff cookie (`STAFF_SESSION_SECRET`) or a public request.
- Admin uses Supabase Auth; `restaurant_users` maps users → restaurants; RLS enforces it.
- Prices are always re-read from the DB when an order is created; the client never sets prices.
- Realtime uses public broadcast channels carrying only "something changed" pings.

## Roadmap
See [`docs/FEATURES.md`](docs/FEATURES.md).
