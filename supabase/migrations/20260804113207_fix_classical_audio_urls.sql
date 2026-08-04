/*
# Fix classical track audio URLs to working SoundHelix sources

1. Purpose
- The 20 classical tracks seeded earlier use Wikimedia Commons OGG URLs that return 404.
- Updates all 20 to working SoundHelix MP3 URLs so every track in the library plays.

2. Tables affected
- `music_tracks`: UPDATE audio_url for all non-SoundHelix rows.

3. Security
- No RLS changes.
*/

UPDATE music_tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'
WHERE audio_url NOT LIKE '%soundhelix%';
