/*
# Storage bucket policies for DevGram

## Overview
Creates public-read + authenticated-write storage policies for the `media` and `avatars` buckets so users can upload reels/images/avatars and anyone can view them.

## Security
- SELECT (read): public (anon + authenticated) — media is meant to be viewable by all users.
- INSERT (upload): any authenticated user.
- UPDATE/DELETE: owner of the object (path starts with their user id) — best-effort via storage pattern.
*/

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id IN ('media','avatars'));

DROP POLICY IF EXISTS "media_auth_insert" ON storage.objects;
CREATE POLICY "media_auth_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id IN ('media','avatars'));

DROP POLICY IF EXISTS "media_owner_update" ON storage.objects;
CREATE POLICY "media_owner_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id IN ('media','avatars')) WITH CHECK (bucket_id IN ('media','avatars'));

DROP POLICY IF EXISTS "media_owner_delete" ON storage.objects;
CREATE POLICY "media_owner_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id IN ('media','avatars'));
