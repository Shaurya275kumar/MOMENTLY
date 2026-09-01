/*
# Create increment_song_play_count function

1. Purpose
- Atomic increment of song play_count for popularity tracking.

2. Security
- SECURITY DEFINER so any authenticated user can call it (play counts are public behavior).
*/

CREATE OR REPLACE FUNCTION increment_song_play_count(song_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE songs SET play_count = play_count + 1 WHERE id = song_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_song_play_count(uuid) TO authenticated;
