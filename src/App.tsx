import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import AuthScreen from './components/AuthScreen';
import FeedScreen from './components/FeedScreen';
import ReelsScreen from './components/ReelsScreen';
import CreateScreen from './components/CreateScreen';
import ProfileScreen from './components/ProfileScreen';
import ChatScreen from './components/ChatScreen';
import { Home, Search, Compass, Film, PlusSquare, User, Menu, Loader2, MessageCircle } from 'lucide-react';
import { supabase, type Post, type Profile as ProfileType } from './lib/supabase';
import { fetchExplorePosts } from './lib/posts';
import { DevGramMark } from './components/Logo';

type Tab = 'feed' | 'reels' | 'create' | 'profile' | 'explore' | 'search' | 'chat';

function Shell() {
  const { session, profile, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<string | null>(null);

  const openChat = (id: string | null) => { setChatWith(id); setTab('chat'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-7 h-7 animate-spin text-[#0095f6]" />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const openProfile = (id: string) => { setViewingProfile(id); setTab('profile'); };

  const navItems = [
    { id: 'feed' as Tab, label: 'Home', icon: Home },
    { id: 'search' as Tab, label: 'Search', icon: Search },
    { id: 'explore' as Tab, label: 'Explore', icon: Compass },
    { id: 'reels' as Tab, label: 'Reels', icon: Film },
    { id: 'create' as Tab, label: 'Create', icon: PlusSquare },
    { id: 'chat' as Tab, label: 'Messages', icon: MessageCircle },
    { id: 'profile' as Tab, label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-[#fafafa]">
      {/* Left sidebar - Instagram web style */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[244px] fixed inset-y-0 left-0 border-r border-[#dbdbdb] bg-white px-3 py-5 z-30">
        <div className="px-2 mb-8 mt-2">
          <span className="font-logo text-3xl hidden xl:block text-[#262626]">DevGram</span>
          <div className="xl:hidden"><DevGramMark className="w-7 h-7" /></div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setViewingProfile(null); setTab(item.id); }}
                className={`flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-[#f2f2f2] transition group ${active ? 'font-bold' : 'font-normal'}`}
              >
                <Icon className={`w-6 h-6 ${active ? 'text-[#262626]' : 'text-[#262626]'} group-hover:scale-105 transition`} strokeWidth={active ? 2.4 : 1.8} />
                <span className="hidden xl:block text-base text-[#262626]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-[#f2f2f2] transition w-full">
            <Menu className="w-6 h-6 text-[#262626]" strokeWidth={1.8} />
            <span className="hidden xl:block text-base text-[#262626]">More</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-[#dbdbdb] flex items-center justify-between px-4 z-30">
        <span className="font-logo text-2xl text-[#262626]">DevGram</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setTab('create')}><PlusSquare className="w-6 h-6 text-[#262626]" strokeWidth={1.8} /></button>
          {profile && (
            <button onClick={() => { setViewingProfile(null); setTab('profile'); }} className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-[#dbdbdb]">
              <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`} className="w-full h-full object-cover" alt="me" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-[#dbdbdb] flex items-center justify-around px-2 z-30">
        <MobileNav active={tab === 'feed'} onClick={() => setTab('feed')} icon={<Home className="w-6 h-6" />} />
        <MobileNav active={tab === 'explore'} onClick={() => setTab('explore')} icon={<Compass className="w-6 h-6" />} />
        <MobileNav active={tab === 'reels'} onClick={() => setTab('reels')} icon={<Film className="w-6 h-6" />} />
        <MobileNav active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageCircle className="w-6 h-6" />} />
        <MobileNav active={tab === 'create'} onClick={() => setTab('create')} icon={<PlusSquare className="w-6 h-6" />} />
        <MobileNav active={tab === 'profile'} onClick={() => { setViewingProfile(null); setTab('profile'); }} icon={profile ? <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`} className={`w-7 h-7 rounded-full object-cover ${tab === 'profile' ? 'ring-2 ring-[#262626]' : ''}`} /> : <User className="w-6 h-6" />} />
      </nav>

      {/* Main content */}
      <div className="flex-1 md:ml-[72px] xl:ml-[244px] pt-14 md:pt-0 pb-14 md:pb-0 min-h-screen">
        {tab === 'feed' && <FeedScreen onOpenProfile={openProfile} />}
        {tab === 'reels' && <ReelsScreen onOpenProfile={openProfile} />}
        {tab === 'create' && <CreateScreen onDone={() => setTab('feed')} />}
        {tab === 'profile' && <ProfileScreen profileId={viewingProfile} onBack={() => setTab('feed')} onMessage={openChat} />}
        {tab === 'explore' && <ExploreScreen onOpenProfile={openProfile} />}
        {tab === 'search' && <SearchScreen onOpenProfile={openProfile} onMessage={openChat} />}
        {tab === 'chat' && <ChatScreen initialUserId={chatWith} onOpenProfile={openProfile} />}
      </div>
    </div>
  );
}

function MobileNav({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return <button onClick={onClick} className={`p-1.5 ${active ? 'text-[#262626]' : 'text-[#262626]'}`}>{icon}</button>;
}

function ExploreScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  return <div className="max-w-[935px] mx-auto px-1 md:px-4 py-4"><ExploreGrid onOpenProfile={onOpenProfile} /></div>;
}

function SearchScreen({ onOpenProfile, onMessage }: { onOpenProfile: (id: string) => void; onMessage: (id: string) => void }) {
  return <div className="max-w-[935px] mx-auto px-4 py-8"><SearchPanel onOpenProfile={onOpenProfile} onMessage={onMessage} /></div>;
}

function ExploreGrid({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      setPosts(await fetchExplorePosts(user.id));
      setLoading(false);
    })();
  }, [user]);
  if (loading) return <div className="text-center py-20 ig-gray text-sm">Loading…</div>;
  if (posts.length === 0) return <div className="text-center py-20 ig-gray text-sm">No posts to explore yet.</div>;
  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((p) => (
        <button key={p.id} onClick={() => onOpenProfile(p.user_id)} className="aspect-square relative bg-gray-100 overflow-hidden group">
          {p.media_type === 'reel' ? (
            <video src={p.media_url} poster={p.thumbnail_url || undefined} className="w-full h-full object-cover" muted />
          ) : (
            <img src={p.media_url} className="w-full h-full object-cover" alt="" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 font-semibold text-sm">{p.profiles?.username}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function SearchPanel({ onOpenProfile, onMessage }: { onOpenProfile: (id: string) => void; onMessage: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ProfileType[]>([]);
  useEffect(() => {
    (async () => {
      if (!q.trim()) { setResults([]); return; }
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${q.trim()}%`).limit(20);
      setResults((data as ProfileType[]) || []);
    })();
  }, [q]);
  return (
    <div className="max-w-md mx-auto">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="ig-input pl-9 py-2.5" />
      </div>
      {q.trim() && results.length === 0 && <p className="text-center ig-gray text-sm py-10">No users found.</p>}
      <div className="space-y-1">
        {results.map((p) => (
          <div key={p.id} onClick={() => onOpenProfile(p.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#f2f2f2] text-left cursor-pointer">
            <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=random`} className="w-11 h-11 rounded-full object-cover" alt="" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#262626]">{p.username}</p>
              <p className="text-xs ig-gray">{p.full_name || ''}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onMessage(p.id); }} className="text-xs font-semibold text-[#0095f6] px-3 py-1.5 rounded-lg hover:bg-[#0095f6]/10">Message</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
