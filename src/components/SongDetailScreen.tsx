import { useEffect, useState } from 'react';
import { ArrowLeft, Music as MusicIcon, Users, ImageIcon } from 'lucide-react';
import { fetchSongById, fetchPostsUsingSong, formatDuration, type Song, type PostMusic } from '../lib/music';
import { supabase, type Post, type Profile } from '../lib/supabase';
import AudioPlayer from './AudioPlayer';

type Props = {
  songId: string;
  onBack: () => void;
  onOpenProfile: (id: string) => void;
};

export default function SongDetailScreen({ songId, onBack, onOpenProfile }: Props) {
  const [song, setSong] = useState<Song | null>(null);
  const [posts, setPosts] = useState<(PostMusic & { post: Post & { profiles: Profile } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await fetchSongById(songId);
        if (!s) {
          setError('Song not found');
          setLoading(false);
          return;
        }
        setSong(s);

        const postMusicList = await fetchPostsUsingSong(songId);
        if (postMusicList.length > 0) {
          const postIds = postMusicList.map((pm) => pm.post_id);
          const { data: postData } = await supabase
            .from('posts')
            .select('*, profiles!posts_user_id_fkey(*)')
            .in('id', postIds);
          const postMap = new Map<string, Post & { profiles: Profile }>();
          for (const p of (postData as (Post & { profiles: Profile })[]) || []) {
            postMap.set(p.id, p);
          }
          setPosts(postMusicList.map((pm) => ({ ...pm, post: postMap.get(pm.post_id)! })).filter((pm) => pm.post));
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load song');
      } finally {
        setLoading(false);
      }
    })();
  }, [songId]);

  if (loading) return <div className="text-center py-20 text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">Loading song…</div>;
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-sm text-[#ed4956] mb-3">{error}</p>
      <button onClick={onBack} className="text-sm text-[#0095f6] font-semibold hover:underline">Go back</button>
    </div>
  );
  if (!song) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={onBack} className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8] mb-4 hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-5 mb-6">
        <img
          src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=400`}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover shadow-lg flex-shrink-0 mx-auto sm:mx-0"
          alt={song.title}
        />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs text-[#0095f6] font-semibold uppercase tracking-wide mb-1">Song</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#262626] dark:text-[#f5f5f5] mb-1">{song.title}</h1>
          <p className="text-lg text-[#8e8e8e] dark:text-[#a8a8a8] mb-3">{song.artist}</p>
          {song.album && <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8] mb-1">Album: {song.album}</p>}
          <div className="flex items-center gap-3 justify-center sm:justify-start text-xs text-[#8e8e8e] dark:text-[#a8a8a8]">
            <span className="flex items-center gap-1"><MusicIcon className="w-3.5 h-3.5" /> {formatDuration(song.duration_sec)}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {song.play_count} plays</span>
            {song.genre && <span className="bg-[#f2f2f2] dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">{song.genre}</span>}
          </div>
        </div>
      </div>

      {/* Player */}
      <AudioPlayer song={song} className="mb-6" />

      {/* Licensing info */}
      {song.licensing_info && (
        <div className="bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-[#8e8e8e] dark:text-[#a8a8a8] uppercase tracking-wide mb-1">Licensing & Attribution</p>
          <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] leading-relaxed">{song.licensing_info}</p>
          {song.source && <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] mt-1">Source: {song.source}</p>}
        </div>
      )}

      {/* Posts using this song */}
      <div>
        <h2 className="text-sm font-bold text-[#262626] dark:text-[#f5f5f5] uppercase tracking-wide mb-3">
          Posts using this song ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 text-[#dbdbdb]" />
            <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">No posts use this song yet. Be the first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((pm) => (
              <button
                key={pm.id}
                onClick={() => onOpenProfile(pm.post.user_id)}
                className="group relative aspect-square rounded-lg overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]"
              >
                {pm.post.media_type === 'reel' ? (
                  <video src={pm.post.media_url} poster={pm.post.thumbnail_url || undefined} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={pm.post.media_url} className="w-full h-full object-cover transition group-hover:scale-105" alt="" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white font-semibold truncate">@{pm.post.profiles?.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
