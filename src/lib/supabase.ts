import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  duration_sec: number | null;
};

export type Post = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string;
  media_type: 'reel' | 'image';
  thumbnail_url: string | null;
  music_id: string | null;
  created_at: string;
  profiles: Profile | null;
  music_tracks: { title: string; artist: string; audio_url: string } | null;
  post_music: {
    id: string;
    start_time: number;
    duration: number | null;
    songs: {
      id: string;
      title: string;
      artist: string;
      artwork_url: string | null;
      preview_url: string;
      duration_sec: number | null;
      source: string | null;
      genre: string | null;
    } | null;
  } | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
};
