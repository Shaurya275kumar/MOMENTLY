/*
# Seed songs table from existing music_tracks data

1. Purpose
- Populates the new songs table with data from the existing music_tracks table.
- Maps each track to the new songs schema with genre, source, and licensing info.
- Since music_tracks has royalty-free SoundHelix audio, all songs get source='Royalty-free (SoundHelix)'.

2. Tables affected
- songs: INSERT rows derived from music_tracks.
*/

INSERT INTO songs (title, artist, album, genre, artwork_url, preview_url, duration_sec, source, licensing_info, is_enabled)
SELECT
  mt.title,
  mt.artist,
  NULL,
  CASE
    WHEN mt.artist IN ('Tame Impala') THEN 'Psychedelic'
    WHEN mt.artist IN ('Taylor Swift', 'Harry Styles', 'Miley Cyrus', 'Sabrina Carpenter', 'Olivia Rodrigo') THEN 'Pop'
    WHEN mt.artist IN ('The Weeknd', 'SZA', 'Sam Smith & Kim Petras', 'Rema & Selena Gomez') THEN 'R&B'
    WHEN mt.artist IN ('Drake & 21 Savage', 'Metro Boomin', 'Drake & J. Cole', 'Kendrick Lamar') THEN 'Hip-Hop'
    WHEN mt.artist IN ('Avicii', 'Dua Lipa', 'David Guetta ft. Sia', 'The Chainsmokers') THEN 'Electronic'
    WHEN mt.artist IN ('Queen', 'Eagles', 'Nirvana', 'Oasis', 'The Killers') THEN 'Rock'
    WHEN mt.artist IN ('Luis Fonsi ft. Daddy Yankee', 'ROSALÍA & Rauw Alejandro', 'Bad Bunny') THEN 'Latin'
    WHEN mt.artist IN ('BTS', 'NewJeans', 'JISOO') THEN 'K-Pop'
    WHEN mt.artist IN ('Dave Brubeck', 'Chillhop Music', 'Beats to Relax/Study') THEN 'Jazz'
    WHEN mt.artist IN ('Davido ft. Musa Keys', 'Tyla') THEN 'Afrobeats'
    WHEN mt.artist IN ('Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johann Sebastian Bach', 'Claude Debussy', 'Frédéric Chopin', 'Johann Pachelbel', 'Antonio Vivaldi', 'Traditional', 'Maurice Ravel', 'Richard Wagner', 'Scott Joplin', 'Georges Bizet', 'Edvard Grieg', 'Franz Schubert') THEN 'Classical'
    ELSE 'Other'
  END,
  mt.cover_url,
  mt.audio_url,
  mt.duration_sec,
  'Royalty-free (SoundHelix)',
  'Royalty-free instrumental audio from SoundHelix.com. Song titles and artist names are used for labeling purposes only.',
  true
FROM music_tracks mt
WHERE NOT EXISTS (SELECT 1 FROM songs s WHERE s.title = mt.title AND s.artist = mt.artist);
