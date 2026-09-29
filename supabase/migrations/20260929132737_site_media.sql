-- Website media: logo / header banner / header video uploads + gallery.
alter table public.restaurants
  add column if not exists hero_video_url text,
  add column if not exists gallery jsonb not null default '[]';

-- Public bucket for website media. Uploads go through signed upload URLs
-- created server-side after an admin check, so no insert policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media', 'site-media', true, 104857600,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
