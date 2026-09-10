do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tiktok_videos'
  ) then
    execute 'drop policy if exists "Public can read tiktok videos" on public.tiktok_videos';
    execute 'drop policy if exists "Authenticated users can insert tiktok videos" on public.tiktok_videos';
    execute 'drop policy if exists "Authenticated users can update tiktok videos" on public.tiktok_videos';
    execute 'drop policy if exists "Authenticated users can delete tiktok videos" on public.tiktok_videos';
  end if;
end $$;

drop table if exists public.tiktok_videos;

-- Note: Direct deletion from storage tables is not allowed in newer Supabase versions.
-- The bucket tiktok-thumbnails can be deleted via the Supabase Dashboard or Storage API.

