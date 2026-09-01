/*
# Add storage buckets for music artwork and audio previews

1. Purpose
- Creates 'music-artwork' and 'music-previews' storage buckets for admin uploads.
- Adds policies allowing authenticated users to read, and admin users to write.

2. Storage buckets
- music-artwork: public bucket for album artwork images
- music-previews: public bucket for audio preview files
*/

INSERT INTO storage.buckets (id, name, public) VALUES
  ('music-artwork', 'music-artwork', true),
  ('music-previews', 'music-previews', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for music-artwork bucket
DROP POLICY IF EXISTS "music_artwork_read_all" ON storage.objects;
CREATE POLICY "music_artwork_read_all" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'music-artwork');

DROP POLICY IF EXISTS "music_artwork_write_admin" ON storage.objects;
CREATE POLICY "music_artwork_write_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'music-artwork' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "music_artwork_update_admin" ON storage.objects;
CREATE POLICY "music_artwork_update_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'music-artwork' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "music_artwork_delete_admin" ON storage.objects;
CREATE POLICY "music_artwork_delete_admin" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'music-artwork' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Policies for music-previews bucket
DROP POLICY IF EXISTS "music_previews_read_all" ON storage.objects;
CREATE POLICY "music_previews_read_all" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'music-previews');

DROP POLICY IF EXISTS "music_previews_write_admin" ON storage.objects;
CREATE POLICY "music_previews_write_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'music-previews' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "music_previews_update_admin" ON storage.objects;
CREATE POLICY "music_previews_update_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'music-previews' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "music_previews_delete_admin" ON storage.objects;
CREATE POLICY "music_previews_delete_admin" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'music-previews' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
