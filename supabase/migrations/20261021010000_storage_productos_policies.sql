-- El bucket Productos no tenía políticas en storage.objects: subir imágenes desde el admin fallaba
-- con "new row violates row-level security policy". La lectura no necesita política porque el
-- bucket es público (las imágenes se sirven por URL pública).
create policy "Authenticated users can upload product images"
  on storage.objects
  for insert
  with check (bucket_id = 'Productos' and auth.role() = 'authenticated');

create policy "Authenticated users can update product images"
  on storage.objects
  for update
  using (bucket_id = 'Productos' and auth.role() = 'authenticated')
  with check (bucket_id = 'Productos' and auth.role() = 'authenticated');

create policy "Authenticated users can delete product images"
  on storage.objects
  for delete
  using (bucket_id = 'Productos' and auth.role() = 'authenticated');

-- Políticas viejas del bucket tiktok-thumbnails (dado de baja). Daban a anon permiso para subir y
-- borrar archivos si el bucket volviera a existir.
drop policy if exists "tiktok delete anon" on storage.objects;
drop policy if exists "tiktok delete authenticated" on storage.objects;
drop policy if exists "tiktok insert anon" on storage.objects;
drop policy if exists "tiktok insert authenticated" on storage.objects;
drop policy if exists "tiktok select anon" on storage.objects;
drop policy if exists "tiktok select authenticated" on storage.objects;
