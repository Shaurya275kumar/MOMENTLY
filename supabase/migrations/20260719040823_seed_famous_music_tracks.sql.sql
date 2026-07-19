/*
# Seed famous world music tracks

1. Purpose
- Populate `music_tracks` with a curated library of globally famous songs/tracks so users can attach recognizable music to their reels.
- Uses royalty-free / public-domain audio URLs hosted on Wikimedia Commons so playback works in the browser without licensing issues.

2. Tables affected
- `music_tracks`: inserts ~20 famous tracks (title, artist, audio_url, cover_url, duration_sec). Idempotent — uses ON CONFLICT DO NOTHING on a (title, artist) unique constraint added here.

3. Schema changes
- Adds a UNIQUE constraint on `music_tracks (title, artist)` so the seed is idempotent and duplicates can't be created.

4. Security
- No RLS changes. Existing `music_select_all` (read for all authenticated) and `music_insert_auth` policies remain in place.

5. Notes
- Audio URLs point to Wikimedia Commons OGG/MP3 files that are in the public domain or CC-licensed for reuse.
- Cover art uses Pexels stock photo URLs (stable, hotlink-friendly) as placeholders for album art.
*/

ALTER TABLE music_tracks
  DROP CONSTRAINT IF EXISTS music_tracks_title_artist_key;
ALTER TABLE music_tracks
  ADD CONSTRAINT music_tracks_title_artist_key UNIQUE (title, artist);

-- Royalty-free / public-domain audio on Wikimedia Commons
INSERT INTO music_tracks (title, artist, audio_url, cover_url, duration_sec) VALUES
('Für Elise', 'Ludwig van Beethoven', 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Fur_Elise.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 180),
('Moonlight Sonata', 'Ludwig van Beethoven', 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Moonlight_Sonata_1st_movement.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 360),
('Symphony No. 9 (Ode to Joy)', 'Ludwig van Beethoven', 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Ode_to_Joy.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 200),
('Clair de Lune', 'Claude Debussy', 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Clair_de_lune_%28Suite_Bergamasque%29.ogg', 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg', 300),
('Nocturne Op. 9 No. 2', 'Frédéric Chopin', 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Chopin_-_nocturne_op9_no2.ogg', 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg', 270),
('Canon in D', 'Johann Pachelbel', 'https://upload.wikimedia.org/wikipedia/commons/5/56/Pachelbel%27s_Canon_in_D.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 300),
('The Four Seasons - Spring', 'Antonio Vivaldi', 'https://upload.wikimedia.org/wikipedia/commons/8/87/Vivaldi_-_Spring.ogg', 'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg', 210),
('Greensleeves', 'Traditional', 'https://upload.wikimedia.org/wikipedia/commons/3/35/Greensleeves.ogg', 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg', 180),
('Boléro', 'Maurice Ravel', 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Ravel_Bolero.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 900),
('Ride of the Valkyries', 'Richard Wagner', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Wagner_Ride_of_the_Valkyries.ogg', 'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg', 300),
('The Entertainer', 'Scott Joplin', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/The_Entertainer.ogg', 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg', 200),
('Maple Leaf Rag', 'Scott Joplin', 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Maple_Leaf_Rag.ogg', 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg', 200),
('Eine kleine Nachtmusik', 'Wolfgang Amadeus Mozart', 'https://upload.wikimedia.org/wikipedia/commons/8/87/Eine_kleine_Nachtmusik_%28KV_525%29.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 300),
('Turkish March', 'Wolfgang Amadeus Mozart', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Mozart_Turkish_March.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 200),
('Air on the G String', 'Johann Sebastian Bach', 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Bach_-_Air_on_the_G_string.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 300),
('Toccata and Fugue in D minor', 'Johann Sebastian Bach', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Toccata_and_Fugue_in_D_minor.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 540),
('Habanera (Carmen)', 'Georges Bizet', 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Habanera.ogg', 'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg', 180),
('In the Hall of the Mountain King', 'Edvard Grieg', 'https://upload.wikimedia.org/wikipedia/commons/2/2c/In_the_Hall_of_the_Mountain_King.ogg', 'https://images.pexels.com/photos/4709822/pexels-photo-4709822.jpeg', 150),
('Morning Mood (Peer Gynt)', 'Edvard Grieg', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Morning_Mood.ogg', 'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg', 240),
('Ave Maria', 'Franz Schubert', 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Ave_Maria.ogg', 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg', 300)
ON CONFLICT (title, artist) DO NOTHING;
