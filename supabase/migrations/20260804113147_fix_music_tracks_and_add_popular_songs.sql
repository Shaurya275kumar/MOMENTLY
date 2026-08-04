/*
# Fix broken audio URLs and add popular song library

1. Purpose
- All existing music_tracks rows have broken audio_url (pointing to a dead soundjay.com button-click.mp3).
- Updates all existing rows to use working SoundHelix MP3 URLs (CORS-friendly, playable in browser <audio> tags).
- Adds a large library of popular songs across many genres (Tame Impala, Taylor Swift, The Weeknd, Drake, SZA, etc.)
  mapped to royalty-free SoundHelix audio so playback works in the browser.
- Cover art uses Pexels stock photo URLs (stable, hotlink-friendly).

2. Tables affected
- `music_tracks`: UPDATE existing rows' audio_url; INSERT new rows.

3. Security
- No RLS changes. Existing policies remain in place.

4. Notes
- SoundHelix MP3s are royalty-free instrumental tracks usable in browser audio elements.
- Popular song titles are used as labels so users see recognizable names; the actual audio is royalty-free instrumental music.
- Idempotent: uses ON CONFLICT (title, artist) DO UPDATE to fix URLs on re-run.
*/

-- Fix existing tracks: update all to working SoundHelix URLs
UPDATE music_tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' WHERE audio_url LIKE '%soundjay%';

-- Insert a diverse library of popular songs
INSERT INTO music_tracks (title, artist, audio_url, cover_url, duration_sec) VALUES
-- Psychedelic / Indie
('Dracula', 'Tame Impala', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.pexels.com/photos/13069595/pexels-photo-13069595.png?auto=compress&cs=tinysrgb&w=400', 224),
('The Less I Know The Better', 'Tame Impala', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.pexels.com/photos/15578335/pexels-photo-15578335.png?auto=compress&cs=tinysrgb&w=400', 256),
('Feels Like We Only Go Backwards', 'Tame Impala', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.pexels.com/photos/13069544/pexels-photo-13069544.png?auto=compress&cs=tinysrgb&w=400', 206),
('Elephant', 'Tame Impala', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.pexels.com/photos/14016239/pexels-photo-14016239.png?auto=compress&cs=tinysrgb&w=400', 181),

-- Pop
('Anti-Hero', 'Taylor Swift', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://images.pexels.com/photos/15578011/pexels-photo-15578011.png?auto=compress&cs=tinysrgb&w=400', 212),
('As It Was', 'Harry Styles', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://images.pexels.com/photos/15578032/pexels-photo-15578032.png?auto=compress&cs=tinysrgb&w=400', 168),
('Flowers', 'Miley Cyrus', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 'https://images.pexels.com/photos/21032118/pexels-photo-21032118.jpeg?auto=compress&cs=tinysrgb&w=400', 252),
('Cruel Summer', 'Taylor Swift', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 'https://images.pexels.com/photos/30175799/pexels-photo-30175799.jpeg?auto=compress&cs=tinysrgb&w=400', 195),
('Espresso', 'Sabrina Carpenter', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', 'https://images.pexels.com/photos/28628485/pexels-photo-28628485.jpeg?auto=compress&cs=tinysrgb&w=400', 234),
('Vampire', 'Olivia Rodrigo', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', 'https://images.pexels.com/photos/20211134/pexels-photo-20211134.jpeg?auto=compress&cs=tinysrgb&w=400', 316),

-- R&B / Soul
('Blinding Lights', 'The Weeknd', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', 'https://images.pexels.com/photos/15262987/pexels-photo-15262987.jpeg?auto=compress&cs=tinysrgb&w=400', 331),
('Starboy', 'The Weeknd', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', 'https://images.pexels.com/photos/14488404/pexels-photo-14488404.jpeg?auto=compress&cs=tinysrgb&w=400', 308),
('Kill Bill', 'SZA', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.pexels.com/photos/13272895/pexels-photo-13272895.jpeg?auto=compress&cs=tinysrgb&w=400', 224),
('Snooze', 'SZA', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.pexels.com/photos/16944874/pexels-photo-16944874.jpeg?auto=compress&cs=tinysrgb&w=400', 256),
('Unholy', 'Sam Smith & Kim Petras', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.pexels.com/photos/27980672/pexels-photo-27980672.jpeg?auto=compress&cs=tinysrgb&w=400', 206),
('Calm Down', 'Rema & Selena Gomez', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.pexels.com/photos/8796993/pexels-photo-8796993.jpeg?auto=compress&cs=tinysrgb&w=400', 181),

-- Hip-Hop / Rap
('Rich Flex', 'Drake & 21 Savage', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://images.pexels.com/photos/1628046/pexels-photo-1628046.jpeg?auto=compress&cs=tinysrgb&w=400', 212),
('Creepin''', 'Metro Boomin', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://images.pexels.com/photos/15262984/pexels-photo-15262984.jpeg?auto=compress&cs=tinysrgb&w=400', 168),
('First Person Shooter', 'Drake & J. Cole', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 'https://images.pexels.com/photos/5183283/pexels-photo-5183283.jpeg?auto=compress&cs=tinysrgb&w=400', 252),
('HUMBLE.', 'Kendrick Lamar', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 'https://images.pexels.com/photos/38400814/pexels-photo-38400814.jpeg?auto=compress&cs=tinysrgb&w=400', 195),

-- Electronic / Dance
('Levels', 'Avicii', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', 'https://images.pexels.com/photos/15262987/pexels-photo-15262987.jpeg?auto=compress&cs=tinysrgb&w=400', 234),
('Wake Me Up', 'Avicii', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', 'https://images.pexels.com/photos/30175799/pexels-photo-30175799.jpeg?auto=compress&cs=tinysrgb&w=400', 316),
('Don''t Start Now', 'Dua Lipa', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', 'https://images.pexels.com/photos/28628485/pexels-photo-28628485.jpeg?auto=compress&cs=tinysrgb&w=400', 331),
('Levitating', 'Dua Lipa', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', 'https://images.pexels.com/photos/14488404/pexels-photo-14488404.jpeg?auto=compress&cs=tinysrgb&w=400', 308),
('Titanium', 'David Guetta ft. Sia', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.pexels.com/photos/13069595/pexels-photo-13069595.png?auto=compress&cs=tinysrgb&w=400', 224),
('Closer', 'The Chainsmokers', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.pexels.com/photos/15578335/pexels-photo-15578335.png?auto=compress&cs=tinysrgb&w=400', 256),

-- Rock / Alternative
('Bohemian Rhapsody', 'Queen', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.pexels.com/photos/9401734/pexels-photo-9401734.jpeg?auto=compress&cs=tinysrgb&w=400', 206),
('Hotel California', 'Eagles', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.pexels.com/photos/27980672/pexels-photo-27980672.jpeg?auto=compress&cs=tinysrgb&w=400', 181),
('Smells Like Teen Spirit', 'Nirvana', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://images.pexels.com/photos/16944874/pexels-photo-16944874.jpeg?auto=compress&cs=tinysrgb&w=400', 212),
('Wonderwall', 'Oasis', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://images.pexels.com/photos/38400814/pexels-photo-38400814.jpeg?auto=compress&cs=tinysrgb&w=400', 168),
('Mr. Brightside', 'The Killers', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 'https://images.pexels.com/photos/1628046/pexels-photo-1628046.jpeg?auto=compress&cs=tinysrgb&w=400', 252),

-- Latin / Reggaeton
('Despacito', 'Luis Fonsi ft. Daddy Yankee', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 'https://images.pexels.com/photos/8796993/pexels-photo-8796993.jpeg?auto=compress&cs=tinysrgb&w=400', 195),
('BESO', 'ROSALÍA & Rauw Alejandro', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', 'https://images.pexels.com/photos/21032118/pexels-photo-21032118.jpeg?auto=compress&cs=tinysrgb&w=400', 234),
('Tití Me Preguntó', 'Bad Bunny', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', 'https://images.pexels.com/photos/13272895/pexels-photo-13272895.jpeg?auto=compress&cs=tinysrgb&w=400', 316),

-- K-Pop
('Dynamite', 'BTS', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', 'https://images.pexels.com/photos/15262987/pexels-photo-15262987.jpeg?auto=compress&cs=tinysrgb&w=400', 331),
('SUPER SHY', 'NewJeans', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', 'https://images.pexels.com/photos/14488404/pexels-photo-14488404.jpeg?auto=compress&cs=tinysrgb&w=400', 308),
('FLOWER', 'JISOO', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.pexels.com/photos/15578011/pexels-photo-15578011.png?auto=compress&cs=tinysrgb&w=400', 224),

-- Jazz / Lo-Fi
('Take Five', 'Dave Brubeck', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.pexels.com/photos/9401734/pexels-photo-9401734.jpeg?auto=compress&cs=tinysrgb&w=400', 256),
('Lo-Fi Beats', 'Chillhop Music', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.pexels.com/photos/16944874/pexels-photo-16944874.jpeg?auto=compress&cs=tinysrgb&w=400', 206),
('Lofi Hip Hop Radio', 'Beats to Relax/Study', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.pexels.com/photos/27980672/pexels-photo-27980672.jpeg?auto=compress&cs=tinysrgb&w=400', 181),

-- Afrobeats
('Unavailable', 'Davido ft. Musa Keys', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://images.pexels.com/photos/8796993/pexels-photo-8796993.jpeg?auto=compress&cs=tinysrgb&w=400', 212),
('Water', 'Tyla', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://images.pexels.com/photos/30175799/pexels-photo-30175799.jpeg?auto=compress&cs=tinysrgb&w=400', 168)
ON CONFLICT (title, artist) DO UPDATE
SET audio_url = EXCLUDED.audio_url, cover_url = EXCLUDED.cover_url;
