/*
# Replace music catalog with user-imported music

1. Changes
- DELETE all existing rows from `songs` (and cascading `post_music` rows) to clear the seeded catalog.
- ADD `user_id uuid` column to `songs` so each track is owned by the user who imported it.
- ADD `source` default changed to 'Imported'.

2. Security
- Drop existing admin-only INSERT/UPDATE/DELETE policies on `songs`.
- Create new policies:
  - SELECT: all authenticated users can see all songs (shared library).
  - INSERT: any authenticated user can insert a song, but `user_id` must equal `auth.uid()`.
  - UPDATE: owner can update their own songs.
  - DELETE: owner can delete their own songs.
- `post_music` policies remain unchanged (post-owner based).

3. Notes
- `post_music` rows reference `songs` via FK with ON DELETE CASCADE, so deleting songs cleans up post associations.
*/

-- Clear the seeded catalog
DELETE FROM post_music;
DELETE FROM songs;

-- Add user_id column for ownership tracking
ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update default source
ALTER TABLE songs ALTER COLUMN source SET DEFAULT 'Imported';

-- Drop old admin-only policies
DROP POLICY IF EXISTS "songs_insert_admin" ON songs;
DROP POLICY IF EXISTS "songs_update_admin" ON songs;
DROP POLICY IF EXISTS "songs_delete_admin" ON songs;

-- New policies: any authenticated user can import/manage their own songs
DROP POLICY IF EXISTS "songs_insert_own" ON songs;
CREATE POLICY "songs_insert_own" ON songs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "songs_update_own" ON songs;
CREATE POLICY "songs_update_own" ON songs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "songs_delete_own" ON songs;
CREATE POLICY "songs_delete_own" ON songs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SELECT remains open to all authenticated (unchanged, but re-create to be safe)
DROP POLICY IF EXISTS "songs_select_all" ON songs;
CREATE POLICY "songs_select_all" ON songs FOR SELECT
  TO authenticated USING (true);

-- Index for user's songs
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
