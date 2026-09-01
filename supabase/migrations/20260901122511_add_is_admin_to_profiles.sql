/*
# Add is_admin column to profiles

1. Purpose
- Adds an is_admin boolean column to profiles so the music admin dashboard can check admin status.
- Sets the first registered user as admin.

2. Tables affected
- profiles: ADD COLUMN is_admin boolean NOT NULL DEFAULT false

3. Security
- No RLS changes. The column is readable by all authenticated users (needed for admin checks in song policies).
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);
