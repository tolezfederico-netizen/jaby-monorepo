create table public.media_content (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('tiktok', 'instagram')),
  url text not null,
  "order" integer not null,
  is_active boolean not null default false,
  thumbnail_url text,
  thumbnail_source text not null default 'auto'
    check (thumbnail_source in ('auto', 'manual')),
  created_at timestamptz not null default now()
);

alter table public.media_content enable row level security;

create policy "Public can read media content"
  on public.media_content
  for select
  using (true);

create policy "Authenticated users can insert media content"
  on public.media_content
  for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update media content"
  on public.media_content
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete media content"
  on public.media_content
  for delete
  using (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('media-thumbnails', 'media-thumbnails', true)
on conflict (id) do nothing;

create policy "Public can read media thumbnails"
  on storage.objects
  for select
  using (bucket_id = 'media-thumbnails');

create policy "Authenticated users can upload media thumbnails"
  on storage.objects
  for insert
  with check (
    bucket_id = 'media-thumbnails'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can update media thumbnails"
  on storage.objects
  for update
  using (
    bucket_id = 'media-thumbnails'
    and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'media-thumbnails'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can delete media thumbnails"
  on storage.objects
  for delete
  using (
    bucket_id = 'media-thumbnails'
    and auth.role() = 'authenticated'
  );
