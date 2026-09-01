import { supabase } from './supabase';

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  artwork_url: string | null;
  preview_url: string;
  duration_sec: number | null;
  source: string | null;
  licensing_info: string | null;
  is_enabled: boolean;
  play_count: number;
  created_at: string;
};

export type PostMusic = {
  id: string;
  post_id: string;
  song_id: string;
  start_time: number;
  duration: number | null;
  created_at: string;
  songs: Song;
};

export type SongWithPostCount = Song & {
  post_count: number;
};

export type BrowseCategory = 'popular' | 'trending' | 'recent' | 'recommended';

export type SongFilters = {
  query?: string;
  genre?: string;
  category?: BrowseCategory;
  enabledOnly?: boolean;
  limit?: number;
  offset?: number;
};

export type AdminSongInput = {
  title: string;
  artist: string;
  album?: string | null;
  genre?: string | null;
  artwork_url?: string | null;
  preview_url: string;
  duration_sec?: number | null;
  source?: string | null;
  licensing_info?: string | null;
  is_enabled?: boolean;
};

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Latin', 'K-Pop', 'Classical', 'Jazz', 'Afrobeats', 'Psychedelic', 'Other'] as const;

export function getGenres(): readonly string[] {
  return GENRES;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function fetchSongs(filters: SongFilters = {}): Promise<Song[]> {
  const { query, genre, category, enabledOnly = true, limit = 50, offset = 0 } = filters;
  let q = supabase.from('songs').select('*');

  if (enabledOnly) q = q.eq('is_enabled', true);
  if (genre && genre !== 'All') q = q.ilike('genre', genre);

  if (query) {
    q = q.or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`);
  }

  switch (category) {
    case 'popular':
      q = q.order('play_count', { ascending: false });
      break;
    case 'trending':
      q = q.order('play_count', { ascending: false }).limit(limit);
      break;
    case 'recent':
      q = q.order('created_at', { ascending: false });
      break;
    case 'recommended':
      q = q.order('play_count', { ascending: false }).limit(limit);
      break;
    default:
      q = q.order('title', { ascending: true });
  }

  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Song[]) || [];
}

export async function fetchSongById(id: string): Promise<Song | null> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Song | null;
}

export async function fetchSongsByGenre(): Promise<Record<string, Song[]>> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('is_enabled', true)
    .order('play_count', { ascending: false });
  if (error) throw error;
  const byGenre: Record<string, Song[]> = {};
  for (const song of (data as Song[]) || []) {
    const g = song.genre || 'Other';
    if (!byGenre[g]) byGenre[g] = [];
    if (byGenre[g].length < 6) byGenre[g].push(song);
  }
  return byGenre;
}

export async function incrementPlayCount(songId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_song_play_count', { song_id: songId });
  if (error) {
    // Fallback: direct update
    await supabase
      .from('songs')
      .update({ play_count: (await supabase.from('songs').select('play_count').eq('id', songId).maybeSingle()).data?.play_count + 1 })
      .eq('id', songId);
  }
}

export async function fetchPostsUsingSong(songId: string): Promise<PostMusic[]> {
  const { data, error } = await supabase
    .from('post_music')
    .select('*, songs(*)')
    .eq('song_id', songId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PostMusic[]) || [];
}

export async function fetchPostMusicForPosts(postIds: string[]): Promise<Map<string, PostMusic>> {
  if (postIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('post_music')
    .select('*, songs(*)')
    .in('post_id', postIds);
  if (error) throw error;
  const map = new Map<string, PostMusic>();
  for (const pm of (data as PostMusic[]) || []) {
    map.set(pm.post_id, pm);
  }
  return map;
}

export async function attachMusicToPost(postId: string, songId: string, startTime: number, duration: number | null): Promise<void> {
  const { error } = await supabase
    .from('post_music')
    .upsert({ post_id: postId, song_id: songId, start_time: startTime, duration }, { onConflict: 'post_id' });
  if (error) throw error;
}

export async function removeMusicFromPost(postId: string): Promise<void> {
  const { error } = await supabase.from('post_music').delete().eq('post_id', postId);
  if (error) throw error;
}

export async function createSong(input: AdminSongInput): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .insert({
      title: input.title,
      artist: input.artist,
      album: input.album || null,
      genre: input.genre || null,
      artwork_url: input.artwork_url || null,
      preview_url: input.preview_url,
      duration_sec: input.duration_sec || null,
      source: input.source || 'Royalty-free',
      licensing_info: input.licensing_info || null,
      is_enabled: input.is_enabled ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Song;
}

export async function updateSong(id: string, input: Partial<AdminSongInput>): Promise<void> {
  const { error } = await supabase.from('songs').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleSongEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('songs').update({ is_enabled: enabled }).eq('id', id);
  if (error) throw error;
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) return false;
  return (data as any)?.is_admin === true;
}
