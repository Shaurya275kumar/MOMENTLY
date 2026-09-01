import { useEffect, useRef, useState } from 'react';
import type { Post } from '../lib/supabase';
import { fetchReelPosts, toggleLikeDb } from '../lib/posts';
import { useAuth } from '../lib/auth';
import CommentsDrawer from './CommentsDrawer';
import ShareModal from './ShareModal';
import { Heart, MessageCircle, Send, MoreHorizontal, Play, Volume2, VolumeX, ChevronUp, Disc3 } from 'lucide-react';

export default function ReelsScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      setPosts(await fetchReelPosts(user.id));
      setLoading(false);
    })();
  }, [user]);

  const toggleLike = async (post: Post) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, like_count: (p.like_count || 0) + (p.liked_by_me ? -1 : 1) } : p));
    await toggleLikeDb(post, user.id);
  };

  // Track which reel is in view via IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || posts.length === 0) return;
    const els = Array.from(containerRef.current.querySelectorAll('[data-reel]')) as HTMLElement[];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          const i = Number((e.target as HTMLElement).dataset.idx);
          setActiveIdx(i);
        }
      });
    }, { root: containerRef.current, threshold: [0.6] });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [posts]);

  if (loading) return <div className="text-center ig-gray text-sm py-20">Loading reels…</div>;
  if (posts.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] ig-gray gap-3">
      <Play className="w-12 h-12" />
      <p className="text-sm">No reels yet. Record one with the + button!</p>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="h-[calc(100vh-3.5rem)] md:h-screen overflow-y-scroll snap-y snap-mandatory bg-black scroll-smooth">
        {posts.map((post, i) => (
          <div key={post.id} data-reel data-idx={i} className="h-full w-full snap-start snap-always relative flex items-center justify-center">
            <ReelPlayer post={post} active={i === activeIdx} onLike={() => toggleLike(post)} onComments={() => setCommentsOpen(post.id)} onShare={() => setSharePost(post)} onOpenProfile={onOpenProfile} />
            {i < posts.length - 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/70 animate-bounce">
                <ChevronUp className="w-6 h-6" />
              </div>
            )}
          </div>
        ))}
      </div>
      {commentsOpen && <CommentsDrawer postId={commentsOpen} onClose={() => setCommentsOpen(null)} />}
      {sharePost && <ShareModal url={sharePost.media_url} onClose={() => setSharePost(null)} />}
    </>
  );
}

function ReelPlayer({ post, active, onLike, onComments, onShare, onOpenProfile }: { post: Post; active: boolean; onLike: () => void; onComments: () => void; onShare: () => void; onOpenProfile: (id: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [likeBurst, setLikeBurst] = useState(false);
  const hasMusic = !!(post.music_tracks?.audio_url || post.post_music?.songs?.preview_url);
  const musicSong = post.post_music?.songs;

  // Play/pause based on visibility
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().then(() => setPlaying(true)).catch(() => {});
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      v.pause();
      if (audioRef.current) audioRef.current.pause();
    }
  }, [active]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      if (audioRef.current) audioRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      if (audioRef.current) audioRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const newMuted = !v.muted;
    v.muted = newMuted;
    if (audioRef.current) audioRef.current.muted = newMuted;
    setMuted(newMuted);
  };

  const handleLike = () => {
    if (!post.liked_by_me) {
      setLikeBurst(true);
      setTimeout(() => setLikeBurst(false), 800);
    }
    onLike();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative bg-black h-full" style={{ aspectRatio: '9/16', maxHeight: '100%' }}>
        <video ref={videoRef} src={post.media_url} poster={post.thumbnail_url || undefined} className="w-full h-full object-cover" loop autoPlay muted playsInline onClick={togglePlay} />
        {hasMusic && <audio ref={audioRef} src={musicSong?.preview_url || post.music_tracks!.audio_url} loop preload="auto" muted />}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {likeBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart className="w-20 h-20 text-white fill-[#ed4956] animate-heart-burst" />
          </div>
        )}

        <button onClick={toggleMute} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center z-10 transition active:scale-90">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        {!playing && active && <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center z-10"><Play className="w-12 h-12 text-white/80" /></button>}

        <div className="absolute left-4 right-16 bottom-4 text-white z-10">
          <div className="flex items-center gap-2.5 mb-3">
            <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.username || 'user')}&background=random`} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/80" alt="" />
            <button onClick={() => onOpenProfile(post.user_id)} className="font-semibold text-sm hover:underline">{post.profiles?.username}</button>
          </div>
          {post.caption && <p className="text-sm leading-snug mb-2 line-clamp-3">{post.caption}</p>}
          {(musicSong || post.music_tracks) && (
            <div className="flex items-center gap-2 text-xs overflow-hidden">
              <Disc3 className="w-3.5 h-3.5 shrink-0 animate-[spin_3s_linear_infinite]" />
              <span className="truncate animate-[marquee_8s_linear_infinite] inline-block whitespace-nowrap">{musicSong ? `${musicSong.title} · ${musicSong.artist}` : `${post.music_tracks!.title} · ${post.music_tracks!.artist}`}</span>
            </div>
          )}
        </div>

        {/* Action rail */}
        <div className="absolute right-3 bottom-4 flex flex-col items-center gap-5 text-white z-10">
          <ReelActions post={post} onLike={handleLike} onComments={onComments} onShare={onShare} />
        </div>
      </div>
    </div>
  );
}

function ReelActions({ post, onLike, onComments, onShare }: { post: Post; onLike: () => void; onComments: () => void; onShare: () => void }) {
  return (
    <>
      <button onClick={onLike} className="flex flex-col items-center gap-1 active:scale-90 transition">
        <Heart className={`w-7 h-7 transition-transform ${post.liked_by_me ? 'fill-[#ed4956] text-[#ed4956] scale-110' : 'text-white'}`} />
        <span className="text-xs font-medium text-white">{post.like_count || 0}</span>
      </button>
      <button onClick={onComments} className="flex flex-col items-center gap-1 active:scale-90 transition">
        <MessageCircle className="w-7 h-7 text-white" />
        <span className="text-xs font-medium text-white">{post.comment_count || 0}</span>
      </button>
      <button onClick={onShare} className="flex flex-col items-center gap-1 active:scale-90 transition">
        <Send className="w-7 h-7 text-white" />
      </button>
      <button className="active:scale-90 transition"><MoreHorizontal className="w-7 h-7 text-white" /></button>
    </>
  );
}
