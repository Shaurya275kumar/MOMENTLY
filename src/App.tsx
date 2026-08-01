import { useEffect, useState } from 'react';
import { useAuth } from './lib/auth';
import { supabase, type Post, type Profile } from './lib/supabase';
import { getProfile } from './lib/profile';
import { fetchUserPosts } from './lib/posts';
import { fetchUserStoryGroups, type StoryGroup } from './lib/stories';
import AuthScreen from './components/AuthScreen';
import FeedScreen from './components/FeedScreen';
import ReelsScreen from './components/ReelsScreen';
import CreateScreen from './components/CreateScreen';
import ChatScreen from './components/ChatScreen';
import ProfileScreen from './components/ProfileScreen';
import ExploreScreen from './components/ExploreScreen';
import ActivityScreen from './components/ActivityScreen';
import StoryViewer from './components/StoryViewer';
import { DevGramWordmark } from './components/Logo';
import { Loader2, Home, Clapperboard, PlusSquare, MessageCircle, User, LogOut, ArrowLeft, MessageSquare, Compass, Bell } from 'lucide-react';

type Tab = 'home' | 'reels' | 'create' | 'chat' | 'profile' | 'explore' | 'activity';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0095f6]" /></div>;
  if (!user) return <AuthScreen />;

  const openProfile = (id: string) => {
    setProfileId(id);
    setTab('profile');
  };

  const openChatWith = (id: string) => {
    setChatWith(id);
    setTab('chat');
  };

  const isOwnProfile = profileId === null || profileId === user.id;

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <header className="border-b border-[#dbdbdb] sticky top-0 bg-white z-20">
        <div className="max-w-[935px] mx-auto px-4 h-14 flex items-center justify-between">
          <DevGramWordmark />
          <nav className="flex items-center gap-5">
            <NavBtn icon={Home} active={tab === 'home'} onClick={() => { setTab('home'); setProfileId(null); }} />
            <NavBtn icon={Compass} active={tab === 'explore'} onClick={() => { setTab('explore'); setProfileId(null); }} />
            <NavBtn icon={Bell} active={tab === 'activity'} onClick={() => { setTab('activity'); setProfileId(null); }} />
            <NavBtn icon={Clapperboard} active={tab === 'reels'} onClick={() => { setTab('reels'); setProfileId(null); }} />
            <NavBtn icon={PlusSquare} active={tab === 'create'} onClick={() => setTab('create')} />
            <NavBtn icon={MessageCircle} active={tab === 'chat'} onClick={() => { setTab('chat'); setChatWith(null); }} />
            <button
              onClick={() => { setProfileId(null); setTab('profile'); }}
              className={`p-1 rounded transition ${tab === 'profile' && isOwnProfile ? 'text-[#262626]' : 'text-[#8e8e8e] hover:text-[#262626]'}`}
              aria-label="Profile"
            >
              <User className="w-6 h-6" />
            </button>
            <button onClick={signOut} className="text-[#8e8e8e] hover:text-[#262626] p-1" aria-label="Sign out">
              <LogOut className="w-6 h-6" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className={tab === 'reels' ? '' : 'max-w-[935px] mx-auto'}>
        {tab === 'home' && <FeedScreen onOpenProfile={openProfile} />}
        {tab === 'explore' && <ExploreScreen onOpenProfile={openProfile} />}
        {tab === 'activity' && <ActivityScreen onOpenProfile={openProfile} />}
        {tab === 'reels' && <ReelsScreen onOpenProfile={openProfile} />}
        {tab === 'create' && <CreateScreen onDone={() => setTab('home')} />}
        {tab === 'chat' && <ChatScreen initialUserId={chatWith} onOpenProfile={openProfile} />}
        {tab === 'profile' && (
          isOwnProfile ? (
            <ProfileScreen onBack={() => { setProfileId(null); setTab('home'); }} />
          ) : (
            <OtherProfile profileId={profileId!} onBack={() => { setProfileId(null); setTab('home'); }} onMessage={() => openChatWith(profileId!)} />
          )
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-[#dbdbdb] flex items-center justify-around z-30">
        <NavBtn icon={Home} active={tab === 'home'} onClick={() => { setTab('home'); setProfileId(null); }} />
        <NavBtn icon={Compass} active={tab === 'explore'} onClick={() => { setTab('explore'); setProfileId(null); }} />
        <NavBtn icon={Bell} active={tab === 'activity'} onClick={() => { setTab('activity'); setProfileId(null); }} />
        <NavBtn icon={Clapperboard} active={tab === 'reels'} onClick={() => { setTab('reels'); setProfileId(null); }} />
        <NavBtn icon={PlusSquare} active={tab === 'create'} onClick={() => setTab('create')} />
        <NavBtn icon={MessageCircle} active={tab === 'chat'} onClick={() => { setTab('chat'); setChatWith(null); }} />
        <button
          onClick={() => { setProfileId(null); setTab('profile'); }}
          className={`p-1 rounded transition ${tab === 'profile' && isOwnProfile ? 'text-[#262626]' : 'text-[#8e8e8e]'}`}
          aria-label="Profile"
        >
          <User className="w-6 h-6" />
        </button>
      </nav>

      {tab !== 'reels' && <div className="h-14 md:hidden" />}
    </div>
  );
}

function NavBtn({ icon: Icon, active, onClick }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`p-1 rounded transition ${active ? 'text-[#262626]' : 'text-[#8e8e8e] hover:text-[#262626]'}`}>
      <Icon className="w-6 h-6" />
    </button>
  );
}

function OtherProfile({ profileId, onBack, onMessage }: { profileId: string; onBack: () => void; onMessage: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await getProfile(profileId);
      setProfile(p);
      if (user) {
        setPosts(await fetchUserPosts(profileId, user.id));
        setStoryGroups(await fetchUserStoryGroups(user.id, profileId));
        const { data: f } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followee_id', profileId)
          .maybeSingle();
        setFollowing(!!f);
      }
      setLoading(false);
    })();
  }, [profileId, user]);

  const toggleFollow = async () => {
    if (!user) return;
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', profileId);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: profileId });
    }
    setFollowing(!following);
  };

  if (loading) return <div className="text-center py-20 text-sm text-[#8e8e8e]">Loading…</div>;
  if (!profile) return <div className="text-center py-20 text-sm text-[#8e8e8e]">Profile not found</div>;

  const hasStories = storyGroups.length > 0 && storyGroups[0].stories.length > 0;
  const storyGroup = hasStories ? storyGroups[0] : null;
  const storiesSeen = storyGroup?.viewed ?? true;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-8">
      <button onClick={onBack} className="text-sm text-[#8e8e8e] mb-4 hover:text-[#262626] flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-start gap-8 mb-8">
        <button
          onClick={() => hasStories && setViewerIndex(0)}
          className={`shrink-0 ${hasStories ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!hasStories}
        >
          <div className={`w-24 h-24 rounded-full p-[3px] ${hasStories && !storiesSeen ? 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]' : hasStories ? 'ring-1 ring-[#dbdbdb]' : ''}`}>
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`}
              className="w-full h-full rounded-full object-cover border-2 border-white"
              alt=""
            />
          </div>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h1 className="text-xl font-light text-[#262626]">{profile.username}</h1>
            <button
              onClick={toggleFollow}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${following ? 'bg-[#efefef] text-[#262626] hover:bg-[#e0e0e0]' : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'}`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={onMessage}
              className="px-4 py-1.5 text-sm font-semibold bg-[#efefef] hover:bg-[#e0e0e0] rounded-lg flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> Message
            </button>
          </div>
          <div className="flex gap-6 mb-3 text-sm">
            <span><b className="text-[#262626]">{posts.length}</b> <span className="text-[#8e8e8e]">posts</span></span>
            {hasStories && (
              <button onClick={() => setViewerIndex(0)} className="hover:underline">
                <b className="text-[#262626]">{storyGroup!.stories.length}</b> <span className="text-[#8e8e8e]">{storiesSeen ? 'stories' : 'new stories'}</span>
              </button>
            )}
          </div>
          <p className="text-sm text-[#262626] font-semibold">{profile.full_name || ''}</p>
          <p className="text-sm text-[#8e8e8e]">{profile.bio || 'No bio yet'}</p>
        </div>
      </div>

      {hasStories && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wide mb-2">Recent stories</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {storyGroup!.stories.map((s) => (
              <button
                key={s.id}
                onClick={() => setViewerIndex(0)}
                className="relative w-20 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-black/5"
              >
                {s.media_type === 'video' ? (
                  <video src={s.media_url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={s.media_url} className="w-full h-full object-cover" alt="" />
                )}
                <span className="absolute bottom-1 left-1 text-[10px] text-white font-medium drop-shadow">{timeAgoShort(s.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[#dbdbdb] pt-4">
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <div key={post.id} className="aspect-square bg-[#fafafa] overflow-hidden">
              {post.media_type === 'reel' ? (
                <video src={post.media_url} poster={post.thumbnail_url || undefined} className="w-full h-full object-cover" muted />
              ) : (
                <img src={post.media_url} className="w-full h-full object-cover" alt={post.caption || ''} />
              )}
            </div>
          ))}
        </div>
        {posts.length === 0 && <p className="text-center text-sm text-[#8e8e8e] py-16">No posts yet.</p>}
      </div>

      {viewerIndex !== null && storyGroups[viewerIndex] && (
        <StoryViewer
          groups={storyGroups}
          startIndex={viewerIndex}
          currentUserId={user!.id}
          onClose={() => setViewerIndex(null)}
          onOpenProfile={() => {}}
        />
      )}
    </div>
  );
}

function timeAgoShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m`;
  return `${h}h`;
}
