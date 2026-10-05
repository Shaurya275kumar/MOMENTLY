/*
# Make music storage buckets writable by all authenticated users

## Purpose
Previously, only admin users could upload files to the `music-artwork` and
`music-previews` storage buckets. This blocked non-admin users from importing
songs into the shared music library. Since the songs table already allows any
authenticated user to insert songs (and SELECT is open to all authenticated
users), the storage buckets must also allow any authenticated user to upload
audio and artwork files.

## Changes
1. **music-artwork bucket** — INSERT policy changed from admin-only to any
   authenticated user. Files must be stored under a path prefixed with the
   user's own ID (`auth.uid()/...`) so ownership can be enforced for
   UPDATE/DELETE.
2. **music-previews bucket** — same change as artwork.
3. UPDATE and DELETE policies updated so the file owner (path starts with
   `auth.uid()`) OR an admin can modify/delete.
4. SELECT policies remain open to all authenticated users (unchanged).

## Security
- Any authenticated user can upload music files (needed for the shared library).
- Only the uploader (owner) or an admin can update or delete a file.
- All authenticated users can read (play) any music file.
*/

-- music-artwork: INSERT — any authenticated user, path must start with their user ID
DROP POLICY IF EXISTS "music_artwork_write_admin" ON storage.objects;
CREATE POLICY "music_artwork_write_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'music-artwork'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- music-artwork: UPDATE — owner or admin
DROP POLICY IF EXISTS "music_artwork_update_admin" ON storage.objects;
CREATE POLICY "music_artwork_update_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'music-artwork'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
    )
  )
  WITH CHECK (
    bucket_id = 'music-artwork'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
    )
  );

-- music-artwork: DELETE — owner or admin
DROP POLICY IF EXISTS "music_artwork_delete_admin" ON storage.objects;
CREATE POLICY "music_artwork_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'music-artwork'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
    )
  );

-- music-previews: INSERT — any authenticated user, path must start with their user ID
DROP POLICY IF EXISTS "music_previews_write_admin" ON storage.objects;
CREATE POLICY "music_previews_write_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'music-previews'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- music-previews: UPDATE — owner or admin
DROP POLICY IF EXISTS "music_previews_update_admin" ON storage.objects;
CREATE POLICY "music_previews_update_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'music-previews'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
    )
  )
  WITH CHECK (
    bucket_id = 'music-previews'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
    )
  );

-- music-previews: DELETE — owner or admin
DROP POLICY IF EXISTS "music_previews_delete_admin" ON storage.objects;
CREATE POLICY "music_previews_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'music-previews'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
    )
  );
