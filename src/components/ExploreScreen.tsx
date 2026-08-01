import { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Search, X, UserPlus } from 'lucide-react';

export default function ExploreScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [follows, setFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').order('username');
      const all = (data as Profile[]) || [];
      setProfiles(all);
      setFiltered(all);
      setLoading(false);

      if (user) {
        const { data: f } = await supabase.from('follows').select('followee_id').eq('follower_id', user.id);
        setFollows(new Set((f || []).map((r: any) => r.followee_id)));
      }
    })();
  }, [user]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setFiltered(profiles); return; }
    setFiltered(profiles.filter((p) =>
      p.username.toLowerCase().includes(q) ||
      (p.full_name || '').toLowerCase().includes(q)
    ));
  }, [query, profiles]);

  const toggleFollow = async (profileId: string) => {
    if (!user) return;
    const isFollowing = follows.has(profileId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', profileId);
      setFollows((prev) => { const n = new Set(prev); n.delete(profileId); return n; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: profileId });
      setFollows((prev) => new Set(prev).add(profileId));
    }
  };

  if (loading) return <div className="text-center ig-gray text-sm py-20">Loading profiles…</div>;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search profiles by name or username…"
          className="w-full pl-10 pr-10 py-2.5 bg-[#efefef] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0095f6] focus:bg-white transition placeholder-[#8e8e8e] text-[#262626]"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e8e] hover:text-[#262626]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#262626]">Discover people</h2>
        <span className="text-sm ig-gray">{filtered.length} {filtered.length === 1 ? 'profile' : 'profiles'}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-[#dbdbdb]" />
          <p className="text-sm ig-gray">No profiles match "{query}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const isMe = p.id === user?.id;
            const isFollowing = follows.has(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 p-4 border border-[#dbdbdb] rounded-lg hover:bg-[#fafafa] transition">
                <button onClick={() => onOpenProfile(p.id)} className="shrink-0">
                  <img
                    src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=random`}
                    className="w-12 h-12 rounded-full object-cover"
                    alt=""
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onOpenProfile(p.id)} className="text-sm font-semibold text-[#262626] hover:underline block truncate text-left">
                    {p.username}
                  </button>
                  <p className="text-xs ig-gray truncate">{p.full_name || 'No name set'}</p>
                </div>
                {!isMe && (
                  <button
                    onClick={() => toggleFollow(p.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition ${
                      isFollowing
                        ? 'bg-[#efefef] text-[#262626] hover:bg-[#e0e0e0]'
                        : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
