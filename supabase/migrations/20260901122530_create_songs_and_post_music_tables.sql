/*
# Create songs and post_music tables for the Music feature

1. New Tables
- `songs`: Full song catalog with title, artist, album, artwork, preview audio, duration, source, licensing info, enabled flag, genre, play count.
- `post_music`: Junction table linking posts to songs with start_time and duration for the permitted portion.

2. Columns
- songs.id (uuid PK)
- songs.title (text, not null)
- songs.artist (text, not null)
- songs.album (text, nullable)
- songs.genre (text, nullable)
- songs.artwork_url (text, nullable) — album artwork URL
- songs.preview_url (text, not null) — browser-playable preview audio URL
- songs.duration_sec (integer, nullable) — full track duration in seconds
- songs.source (text, nullable) — music source/provider name
- songs.licensing_info (text, nullable) — licensing/attribution text
- songs.is_enabled (boolean, default true) — admin can disable
- songs.play_count (integer, default 0) — track popularity
- songs.created_at (timestamptz, default now())
- post_music.id (uuid PK)
- post_music.post_id (uuid FK → posts.id ON DELETE CASCADE)
- post_music.song_id (uuid FK → songs.id ON DELETE CASCADE)
- post_music.start_time (integer, default 0) — start offset in seconds
- post_music.duration (integer, nullable) — permitted portion duration in seconds
- post_music.created_at (timestamptz, default now())

3. Security
- songs: RLS enabled. SELECT for all authenticated. INSERT/UPDATE/DELETE only for admin users.
- post_music: RLS enabled. SELECT for all authenticated. INSERT/UPDATE/DELETE for the post owner.

4. Indexes
- songs.genre, songs.is_enabled, post_music.song_id, post_music.post_id
*/

CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  genre text,
  artwork_url text,
  preview_url text NOT NULL,
  duration_sec integer,
  source text DEFAULT 'Royalty-free',
  licensing_info text,
  is_enabled boolean NOT NULL DEFAULT true,
  play_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_all" ON songs;
CREATE POLICY "songs_select_all" ON songs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "songs_insert_admin" ON songs;
CREATE POLICY "songs_insert_admin" ON songs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "songs_update_admin" ON songs;
CREATE POLICY "songs_update_admin" ON songs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "songs_delete_admin" ON songs;
CREATE POLICY "songs_delete_admin" ON songs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_enabled ON songs(is_enabled);

CREATE TABLE IF NOT EXISTS post_music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  start_time integer NOT NULL DEFAULT 0,
  duration integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

ALTER TABLE post_music ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_music_select_all" ON post_music;
CREATE POLICY "post_music_select_all" ON post_music FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "post_music_insert_owner" ON post_music;
CREATE POLICY "post_music_insert_owner" ON post_music FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_music.post_id AND posts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "post_music_update_owner" ON post_music;
CREATE POLICY "post_music_update_owner" ON post_music FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_music.post_id AND posts.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_music.post_id AND posts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "post_music_delete_owner" ON post_music;
CREATE POLICY "post_music_delete_owner" ON post_music FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_music.post_id AND posts.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_post_music_song_id ON post_music(song_id);
CREATE INDEX IF NOT EXISTS idx_post_music_post_id ON post_music(post_id);
