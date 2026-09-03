import { useEffect, useRef, useState } from 'react';
import { supabase, type Post, type Profile } from '../lib/supabase';
import { fetchFeedPosts, toggleLikeDb, toggleSaveDb } from '../lib/posts';
import { useAuth } from '../lib/auth';
import CommentsDrawer from './CommentsDrawer';
import ShareModal from './ShareModal';
import StoriesBar from './StoriesBar';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Pause, Disc3 } from 'lucide-react';

export default function FeedScreen({ onOpenProfile, onOpenSong }: { onOpenProfile: (id: string) => void; onOpenSong?: (songId: string) => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      setPosts(await fetchFeedPosts(user.id));
      setLoading(false);
    })();
  }, [user]);

  const toggleLike = async (post: Post) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, like_count: (p.like_count || 0) + (p.liked_by_me ? -1 : 1) } : p));
    await toggleLikeDb(post, user.id);
  };

  const toggleSave = async (post: Post) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, saved_by_me: !p.saved_by_me } : p));
    await toggleSaveDb(post.id, user.id, post.saved_by_me);
  };

  if (loading) return <div className="text-center ig-gray text-sm py-20">Loading feed…</div>;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[470px] md:mr-8 px-0 md:px-4 py-4">
        <StoriesBar onOpenProfile={onOpenProfile} />
        {posts.length === 0 && <p className="text-center ig-gray mt-20">No posts yet. Create one with the + button!</p>}
        <div className="space-y-6">
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} onLike={toggleLike} onSave={toggleSave} onComments={setCommentsFor} onShare={setSharePost} onOpenProfile={onOpenProfile} onOpenSong={onOpenSong} />
          ))}
        </div>
      </div>

      <div className="hidden lg:block w-[320px] flex-shrink-0 py-8 pr-8">
        <SuggestionsRail onOpenProfile={onOpenProfile} />
      </div>
      {commentsFor && <CommentsDrawer postId={commentsFor} onClose={() => setCommentsFor(null)} />}
      {sharePost && <ShareModal url={sharePost.media_url} onClose={() => setSharePost(null)} />}
    </div>
  );
}

function FeedPost({ post, onLike, onSave, onComments, onShare, onOpenProfile, onOpenSong }: { post: Post; onLike: (p: Post) => void; onSave: (p: Post) => void; onComments: (id: string) => void; onShare: (p: Post) => void; onOpenProfile: (id: string) => void; onOpenSong?: (songId: string) => void }) {
  const [burst, setBurst] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = () => {
    if (!post.liked_by_me) onLike(post);
    setBurst(true);
    setTimeout(() => setBurst(false), 800);
  };

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <article className="bg-white dark:bg-[#121212] md:border md:border-[#dbdbdb] dark:border-[#262626] rounded-none md:rounded-md overflow-hidden animate-fade-in">
      <header className="flex items-center gap-3 px-4 py-3">
        <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.username || 'user')}&background=random`} className="w-8 h-8 rounded-full object-cover" alt="" />
        <button onClick={() => onOpenProfile(post.user_id)} className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] hover:underline">{post.profiles?.username}</button>
        <span className="text-xs ig-gray">· {timeAgo(post.created_at)}</span>
        <button className="ml-auto"><MoreHorizontal className="w-5 h-5 text-[#262626] dark:text-[#f5f5f5]" /></button>
      </header>
      <div className="relative" onClick={handleImageTap}>
        {post.media_type === 'reel' ? (
          <video src={post.media_url} poster={post.thumbnail_url || undefined} controls loop playsInline className="w-full max-h-[750px] object-cover bg-black" />
        ) : (
          <img src={post.media_url} className="w-full max-h-[750px] object-cover cursor-pointer" alt={post.caption || ''} />
        )}
        {burst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-20 h-20 text-white fill-white drop-shadow-lg animate-heart-burst" />
          </div>
        )}
      </div>
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center gap-4 py-2">
          <button onClick={() => onLike(post)} className="active:scale-90 transition"><Heart className={`w-6 h-6 ${post.liked_by_me ? 'fill-[#ed4956] text-[#ed4956]' : 'text-[#262626] dark:text-[#f5f5f5]'}`} /></button>
          <button onClick={() => onComments(post.id)} className="active:scale-90 transition"><MessageCircle className="w-6 h-6 text-[#262626] dark:text-[#f5f5f5]" /></button>
          <button onClick={() => onShare(post)} className="active:scale-90 transition"><Send className="w-6 h-6 text-[#262626] dark:text-[#f5f5f5]" /></button>
          <button onClick={() => onSave(post)} className="ml-auto active:scale-90 transition"><Bookmark className={`w-6 h-6 ${post.saved_by_me ? 'fill-[#262626] text-[#262626] dark:text-[#f5f5f5]' : 'text-[#262626] dark:text-[#f5f5f5]'}`} /></button>
        </div>
        <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5]">{post.like_count || 0} likes</p>
        {post.comment_count ? (
          <button onClick={() => onComments(post.id)} className="text-sm ig-gray mt-0.5">View all {post.comment_count} comments</button>
        ) : null}
        {post.caption && (
          <p className="text-sm text-[#262626] dark:text-[#f5f5f5] mt-1"><span className="font-semibold mr-1.5">{post.profiles?.username}</span>{post.caption}</p>
        )}
        {post.post_music?.songs && (
          <PostMusicBar song={post.post_music.songs} startTime={post.post_music.start_time} clipDuration={post.post_music.duration} onOpenSong={onOpenSong} />
        )}
        {post.music_tracks && !post.post_music?.songs && (
          <MusicBar post={post} />
        )}
        <p className="text-[10px] ig-gray uppercase mt-2 tracking-wide">{new Date(post.created_at).toLocaleDateString()}</p>
      </div>
    </article>
  );
}

function SuggestionsRail({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').neq('id', profile?.id || '').limit(5);
      setSuggestions((data as Profile[]) || []);
    })();
  }, [profile?.id]);
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'me')}&background=random`} className="w-11 h-11 rounded-full object-cover" alt="" />
        <div>
          <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5]">{profile?.username}</p>
          <p className="text-xs ig-gray">{profile?.full_name || ''}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold ig-gray">Suggested for you</p>
        <button className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5]">See All</button>
      </div>
      <div className="space-y-3">
        {suggestions.map((s) => <SuggestionRow key={s.id} profile={s} onOpen={() => onOpenProfile(s.id)} />)}
      </div>
      <p className="text-xs ig-gray mt-8 leading-relaxed">© 2026 Momently · Capture every moment</p>
    </div>
  );
}

function SuggestionRow({ profile, onOpen }: { profile: Profile; onOpen: () => void }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('followee_id', profile.id).maybeSingle();
      setFollowing(!!data);
    })();
  }, [user, profile.id]);
  const toggle = async () => {
    if (!user) return;
    if (following) await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', profile.id);
    else await supabase.from('follows').insert({ follower_id: user.id, followee_id: profile.id });
    setFollowing(!following);
  };
  return (
    <div className="flex items-center gap-3">
      <button onClick={onOpen}><img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`} className="w-9 h-9 rounded-full object-cover" alt="" /></button>
      <div className="flex-1 min-w-0">
        <button onClick={onOpen} className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] hover:underline block truncate">{profile.username}</button>
        <p className="text-xs ig-gray truncate">Suggested for you</p>
      </div>
      <button onClick={toggle} className={`text-xs font-semibold ${following ? 'text-[#8e8e8e] dark:text-[#a8a8a8]' : 'text-[#0095f6]'}`}>{following ? 'Following' : 'Follow'}</button>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function MusicBar({ post }: { post: Post }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  if (!post.music_tracks?.audio_url) return null;

  return (
    <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg bg-[#f5f5f5] max-w-fit">
      <button onClick={toggle} className="w-6 h-6 rounded-full bg-[#262626] text-white flex items-center justify-center flex-shrink-0 active:scale-90 transition">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <Disc3 className={`w-4 h-4 text-[#8e8e8e] dark:text-[#a8a8a8] flex-shrink-0 ${playing ? 'animate-[spin_2s_linear_infinite]' : ''}`} />
      <span className="text-xs ig-gray truncate">{post.music_tracks.title} · {post.music_tracks.artist}</span>
      <audio ref={audioRef} src={post.music_tracks.audio_url} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    </div>
  );
}

type PostMusicSong = {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  preview_url: string;
  duration_sec: number | null;
  source: string | null;
  genre: string | null;
};

function PostMusicBar({ song, startTime, clipDuration, onOpenSong }: { song: PostMusicSong; startTime: number; clipDuration: number | null; onOpenSong?: (songId: string) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      if (Math.abs(a.currentTime - startTime) > 1) a.currentTime = startTime;
      a.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const effectiveDuration = clipDuration && clipDuration > 0 ? clipDuration : (song.duration_sec || 0);
  const progressPercent = effectiveDuration > 0 ? Math.max(0, Math.min(100, ((currentTime - startTime) / effectiveDuration) * 100)) : 0;

  return (
    <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg bg-[#f5f5f5] max-w-fit animate-slide-up">
      <button onClick={toggle} className="w-6 h-6 rounded-full bg-[#262626] text-white flex items-center justify-center flex-shrink-0 active:scale-90 transition">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <Disc3 className={`w-4 h-4 text-[#8e8e8e] dark:text-[#a8a8a8] flex-shrink-0 ${playing ? 'animate-[spin_2s_linear_infinite]' : ''}`} />
      <button
        onClick={() => onOpenSong?.(song.id)}
        className="text-xs ig-gray truncate hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] hover:underline transition"
      >
        {song.title} · {song.artist}
      </button>
      {effectiveDuration > 0 && (
        <div className="hidden sm:block w-16 h-1 bg-[#dbdbdb] rounded-full flex-shrink-0">
          <div className="h-full bg-[#0095f6] rounded-full transition-[width]" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
      <audio
        ref={audioRef}
        src={song.preview_url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          if (clipDuration && clipDuration > 0 && t >= startTime + clipDuration) {
            e.currentTarget.pause();
            e.currentTarget.currentTime = startTime;
            setPlaying(false);
          }
        }}
      />
    </div>
  );
}
