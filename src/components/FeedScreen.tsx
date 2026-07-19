import { useEffect, useState } from 'react';
import { supabase, type Post, type Profile } from '../lib/supabase';
import { fetchFeedPosts, toggleLikeDb } from '../lib/posts';
import { useAuth } from '../lib/auth';
import CommentsDrawer from './CommentsDrawer';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music2 } from 'lucide-react';

export default function FeedScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

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

  if (loading) return <div className="text-center ig-gray text-sm py-20">Loading feed…</div>;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[470px] md:mr-8 px-0 md:px-4 py-4">
        <StoriesRow onOpenProfile={onOpenProfile} />
        {posts.length === 0 && <p className="text-center ig-gray mt-20">No posts yet. Create one with the + button!</p>}
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="bg-white md:border md:border-[#dbdbdb] rounded-none md:rounded-md overflow-hidden">
              <header className="flex items-center gap-3 px-4 py-3">
                <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.username || 'user')}&background=random`} className="w-8 h-8 rounded-full object-cover" alt="" />
                <button onClick={() => onOpenProfile(post.user_id)} className="text-sm font-semibold text-[#262626] hover:underline">{post.profiles?.username}</button>
                <span className="text-xs ig-gray">· {timeAgo(post.created_at)}</span>
                <button className="ml-auto"><MoreHorizontal className="w-5 h-5 text-[#262626]" /></button>
              </header>
              {post.media_type === 'reel' ? (
                <video src={post.media_url} poster={post.thumbnail_url || undefined} controls loop playsInline className="w-full max-h-[750px] object-cover bg-black" />
              ) : (
                <img src={post.media_url} className="w-full max-h-[750px] object-cover" alt={post.caption || ''} />
              )}
              <div className="px-4 pt-2 pb-3">
                <div className="flex items-center gap-4 py-2">
                  <button onClick={() => toggleLike(post)} className="active:scale-90 transition"><Heart className={`w-6 h-6 ${post.liked_by_me ? 'fill-[#ed4956] text-[#ed4956]' : 'text-[#262626]'}`} /></button>
                  <button onClick={() => setCommentsFor(post.id)} className="active:scale-90 transition"><MessageCircle className="w-6 h-6 text-[#262626]" /></button>
                  <Send className="w-6 h-6 text-[#262626]" />
                  <button className="ml-auto"><Bookmark className="w-6 h-6 text-[#262626]" /></button>
                </div>
                <p className="text-sm font-semibold text-[#262626]">{post.like_count || 0} likes</p>
                {post.comment_count ? (
                  <button onClick={() => setCommentsFor(post.id)} className="text-sm ig-gray mt-0.5">View all {post.comment_count} comments</button>
                ) : null}
                {post.caption && (
                  <p className="text-sm text-[#262626] mt-1"><span className="font-semibold mr-1.5">{post.profiles?.username}</span>{post.caption}</p>
                )}
                {post.music_tracks && (
                  <div className="flex items-center gap-1.5 text-xs ig-gray mt-2"><Music2 className="w-3.5 h-3.5" /> {post.music_tracks.title} · {post.music_tracks.artist}</div>
                )}
                <p className="text-[10px] ig-gray uppercase mt-2 tracking-wide">{new Date(post.created_at).toLocaleDateString()}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="hidden lg:block w-[320px] flex-shrink-0 py-8 pr-8">
        <SuggestionsRail onOpenProfile={onOpenProfile} />
      </div>
      {commentsFor && <CommentsDrawer postId={commentsFor} onClose={() => setCommentsFor(null)} />}
    </div>
  );
}

function StoriesRow({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').limit(15);
      setProfiles((data as Profile[]) || []);
    })();
  }, []);
  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide md:border md:border-[#dbdbdb] md:rounded-md bg-white">
      {profiles.map((p) => (
        <button key={p.id} onClick={() => onOpenProfile(p.id)} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]">
            <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=random`} className="w-full h-full rounded-full object-cover border-2 border-white" alt="" />
          </div>
          <span className="text-xs text-[#262626] max-w-[56px] truncate">{p.username}</span>
        </button>
      ))}
    </div>
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
          <p className="text-sm font-semibold text-[#262626]">{profile?.username}</p>
          <p className="text-xs ig-gray">{profile?.full_name || ''}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold ig-gray">Suggested for you</p>
        <button className="text-xs font-semibold text-[#262626]">See All</button>
      </div>
      <div className="space-y-3">
        {suggestions.map((s) => <SuggestionRow key={s.id} profile={s} onOpen={() => onOpenProfile(s.id)} />)}
      </div>
      <p className="text-xs ig-gray mt-8 leading-relaxed">© 2026 DevGram · A demo Instagram-style app</p>
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
        <button onClick={onOpen} className="text-sm font-semibold text-[#262626] hover:underline block truncate">{profile.username}</button>
        <p className="text-xs ig-gray truncate">Suggested for you</p>
      </div>
      <button onClick={toggle} className={`text-xs font-semibold ${following ? 'text-[#8e8e8e]' : 'text-[#0095f6]'}`}>{following ? 'Following' : 'Follow'}</button>
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
