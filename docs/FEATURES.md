# Foodle — Feature Roadmap

Restaurant POS & Management Platform. Pilot: one live restaurant, then scale.
Stack: Next.js (PWA) + Supabase. Kitchen: KDS screen + ESC/POS thermal printer.
Pilot scope: collection only (no delivery), no online payments yet.

Legend: ✅ built in v0.1 · 🔜 next · ⬜ backlog

## Core POS
- ✅ Touchscreen POS/till
- ✅ Fast order entry
- ✅ Dine-in orders
- ✅ Takeaway orders
- ⬜ Delivery orders
- ✅ Bar tabs / open tabs (open table orders)
- ✅ Hold/retrieve orders (draft orders)
- ✅ Edit existing orders
- 🔜 Void items/orders
- ⬜ Refunds
- ✅ Discounts (fixed)
- 🔜 Percentage discounts
- 🔜 Manager-authorised discounts
- ⬜ Complimentary items
- 🔜 Service charges
- ⬜ Tips/gratuities
- ⬜ Split bills — by item, by guest, split payments
- ⬜ Multiple payment methods on one bill
- ✅ Cash payments (recorded)
- ✅ Card payments (recorded, external terminal)
- ⬜ Contactless / Apple Pay / Google Pay (Stripe Terminal)
- ⬜ Gift cards, store credit, custom payment types
- ✅ Receipt printing (print bridge)
- ⬜ Email/SMS receipts
- ⬜ Reprint receipts
- ⬜ Cash drawer management
- ⬜ Cash-up / end-of-day / till reconciliation
- 🔜 Offline mode (PWA shell cached; order queue TBD)
- ✅ Multiple tills (any device with a staff PIN)

## Menu Management
- ✅ Products/menu items, categories, images, descriptions, prices
- ⬜ Subcategories
- ✅ VAT rate (restaurant-level); ⬜ per-item tax rates
- ✅ Variants/sizes (via modifier groups)
- ✅ Modifiers, modifier groups, required/optional, extras/add-ons
- ⬜ Meal deals, combos, set menus
- ✅ Courses (field present); 🔜 fire/hold courses in POS
- ⬜ Happy-hour / scheduled / location-specific pricing
- ⬜ Eat-in vs takeaway pricing
- ✅ Online-only / POS-only products (menu channels)
- ✅ Product availability, mark sold out
- ⬜ Auto sold-out from stock
- ✅ Menu scheduling (time + days per menu)
- ✅ Seasonal menus (activate/deactivate)
- ✅ Allergens, dietary info
- ⬜ Calories/nutrition, ingredients
- ✅ Preparation notes (per line)

## Tables & Front of House
- 🔜 Visual floor plan (drag layout) — v0.1 has grid by area
- ✅ Multiple areas, tables, capacity, status (free/occupied), time seated
- ✅ Server assigned to table (staff on order)
- 🔜 Move / merge / split / transfer table, transfer between servers
- ✅ Guest count/covers
- 🔜 Course management: fire / hold courses
- ⬜ Table notes, VIP/customer notes
- ⬜ Waitlist + estimated wait

## Reservations
- ✅ Online reservations
- ✅ Telephone/walk-in reservations (admin)
- ✅ Reservation calendar (day view)
- ✅ Automatic table allocation; ✅ manual assignment
- ✅ Guest numbers, booking duration, availability rules (hours + slots)
- ⬜ Deposits, cancellation policies
- ✅ No-show tracking (status)
- ⬜ Booking confirmation / reminder emails & SMS
- ⬜ Waiting list
- ⬜ Customer booking history
- ✅ Special requests (notes); ⬜ birthday/occasion field

## Also in scope (from project brief)
- ✅ Public website per restaurant
- ✅ Website builder (admin → Website): 3 templates (Classic, Modern, Bistro), heading/body fonts from a set list, background/brand/accent colours, live desktop/mobile preview
- ⬜ Website builder v2: custom pages, gallery, logo/hero upload, custom domains
- ✅ Collection ordering
- ⬜ Delivery (own drivers + courier adapter)
- ✅ Tablet menu at table (QR / tablet token)
- ✅ PDF menu printer
- ✅ KDS screen
