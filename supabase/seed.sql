-- Pilot restaurant seed. Replace names/prices with the real ones in /admin.
-- Staff PINs are bcrypt-hashed via pgcrypto: 1234 (manager), 5678 (kitchen).

insert into restaurants (id, slug, name, tagline, description, phone, email, address_line1, city, postcode)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo',
  'The Demo Kitchen',
  'Wood-fired pizza & small plates',
  'Family-run neighbourhood restaurant. Eat in, collect, or book a table.',
  '0161 000 0000',
  'hello@demo.example',
  '1 High Street', 'Manchester', 'M1 1AA'
);

insert into opening_hours (restaurant_id, kind, day_of_week, opens, closes)
select '00000000-0000-0000-0000-000000000001', k, d, '12:00', '22:00'
from unnest(array['service','collection','booking']::hours_kind[]) k, generate_series(0,6) d;

insert into staff (restaurant_id, name, pin_hash, role) values
  ('00000000-0000-0000-0000-000000000001', 'Manager', extensions.crypt('1234', extensions.gen_salt('bf')), 'manager'),
  ('00000000-0000-0000-0000-000000000001', 'Kitchen', extensions.crypt('5678', extensions.gen_salt('bf')), 'kitchen'),
  ('00000000-0000-0000-0000-000000000001', 'Sam',     extensions.crypt('1111', extensions.gen_salt('bf')), 'staff');

insert into areas (id, restaurant_id, name, sort) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'Main', 0),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'Terrace', 1);

insert into tables (restaurant_id, area_id, name, seats, sort)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'T' || n, case when n % 3 = 0 then 4 else 2 end, n
from generate_series(1, 8) n;
insert into tables (restaurant_id, area_id, name, seats, sort)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'P' || n, 4, 10 + n
from generate_series(1, 4) n;

insert into menus (id, restaurant_id, name, sort) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Main Menu', 0);

insert into menu_categories (id, restaurant_id, menu_id, name, sort) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Starters', 0),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Pizza', 1),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Desserts', 2),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Drinks', 3);

insert into menu_items (restaurant_id, category_id, name, description, price_pence, allergens, dietary, kitchen_station, sort) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','Garlic Bread','Wood-fired with rosemary',550,'{gluten}','{v}','pizza',0),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','Burrata','Heritage tomatoes, basil oil',895,'{milk}','{v,gf}','cold',1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','Arancini','Truffle & pecorino, 3 pieces',750,'{gluten,milk,egg}','{v}','fryer',2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c2','Margherita','San Marzano, fior di latte, basil',1150,'{gluten,milk}','{v}','pizza',0),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c2','Diavola','Spicy nduja, salami, chilli honey',1450,'{gluten,milk}','{}','pizza',1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c2','Funghi','Wild mushroom, taleggio, thyme',1395,'{gluten,milk}','{v}','pizza',2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c3','Tiramisu','House-made',695,'{gluten,milk,egg}','{v}','cold',0),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c3','Affogato','Vanilla gelato, espresso',595,'{milk}','{v,gf}','bar',1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c4','Coke 330ml',null,320,'{}','{vg,gf}','bar',0),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c4','House Red 175ml',null,650,'{sulphites}','{vg}','bar',1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c4','Peroni 330ml',null,495,'{gluten}','{vg}','bar',2);

insert into modifier_groups (id, restaurant_id, name, min_select, max_select) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000001','Size',1,1),
  ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000001','Extra toppings',0,5);

insert into modifier_options (group_id, name, price_pence, sort) values
  ('00000000-0000-0000-0000-0000000000d1','12"',0,0),
  ('00000000-0000-0000-0000-0000000000d1','16"',400,1),
  ('00000000-0000-0000-0000-0000000000d2','Extra cheese',150,0),
  ('00000000-0000-0000-0000-0000000000d2','Olives',100,1),
  ('00000000-0000-0000-0000-0000000000d2','Pepperoni',200,2),
  ('00000000-0000-0000-0000-0000000000d2','Chilli',50,3);

insert into item_modifier_groups (item_id, group_id, sort)
select i.id, g.id, g.sort from menu_items i, modifier_groups g
where i.category_id = '00000000-0000-0000-0000-0000000000c2';
