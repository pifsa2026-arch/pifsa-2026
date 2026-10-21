-- Public image storage for event flyers and form banners.
-- Images used to be saved inside the events table, so every page visit downloaded
-- every flyer again. Now only a link is saved and the image is cached by browsers.
-- Run after roles_exams_chat.sql (it uses is_admin()).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site images public read" on storage.objects;
create policy "site images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-images');

drop policy if exists "admins upload site images" on storage.objects;
create policy "admins upload site images" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images' and is_admin());

drop policy if exists "admins update site images" on storage.objects;
create policy "admins update site images" on storage.objects
  for update to authenticated using (bucket_id = 'site-images' and is_admin());

drop policy if exists "admins delete site images" on storage.objects;
create policy "admins delete site images" on storage.objects
  for delete to authenticated using (bucket_id = 'site-images' and is_admin());
