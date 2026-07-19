import { useEffect, useRef, useState } from 'react';
import { supabase, type Profile, type Post } from '../lib/supabase';
import { fetchUserPosts } from '../lib/posts';
import { useAuth } from '../lib/auth';
import { uploadFile } from '../lib/upload';
import { Camera, Grid3x3, Film, Loader2, Check, X, LogOut, Tag, Trash2, MessageCircle } from 'lucide-react';

type Props = { profileId: string | null; onBack: () => void; onMessage?: (id: string) => void };

export default function ProfileScreen({ profileId, onMessage }: Props) {
  const { user, profile: myProfile, signOut, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  const [editing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const targetId = profileId || user?.id;

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
      setProfile(p as Profile | null);
      if (user) setPosts(await fetchUserPosts(targetId, user.id));
      if (user && user.id !== targetId) {
        const { data: f } = await supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('followee_id', targetId).maybeSingle();
        setFollowing(!!f);
      }
      setLoading(false);
    })();
  }, [targetId, user]);

  const toggleFollow = async () => {
    if (!user || !targetId || user.id === targetId) return;
    if (following) await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', targetId);
    else await supabase.from('follows').insert({ follower_id: user.id, followee_id: targetId });
    setFollowing(!following);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin ig-gray" /></div>;
  if (!profile) return <div className="text-center ig-gray py-20">Profile not found.</div>;

  const isMe = user?.id === targetId;
  const reels = posts.filter((p) => p.media_type === 'reel');
  const grid = tab === 'reels' ? reels : posts;

  return (
    <div className="max-w-[935px] mx-auto px-4 pt-4 md:pt-8 pb-10">
      <div className="flex flex-col md:flex-row gap-6 md:gap-20 mb-6 md:mb-8">
        <div className="flex justify-center md:justify-start flex-shrink-0">
          <div className="w-20 h-20 md:w-[150px] md:h-[150px] rounded-full p-[3px] bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]">
            <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`} className="w-full h-full rounded-full object-cover border-2 border-white" alt="" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <h1 className="text-xl font-light text-[#262626]">{profile.username}</h1>
            <div className="flex gap-2">
              {isMe ? (
                <>
                  <button onClick={() => setEditing(true)} className="px-4 py-1.5 text-sm font-semibold bg-[#efefef] hover:bg-[#e0e0e0] rounded-lg transition">Edit profile</button>
                  <button onClick={signOut} className="px-4 py-1.5 text-sm font-semibold bg-[#efefef] hover:bg-[#e0e0e0] rounded-lg transition flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Log out</button>
                </>
              ) : (
                <>
                  <button onClick={toggleFollow} className={`px-5 py-1.5 text-sm font-semibold rounded-lg transition ${following ? 'bg-[#efefef] text-[#262626] hover:bg-[#e0e0e0]' : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'}`}>{following ? 'Following' : 'Follow'}</button>
                  <button onClick={() => onMessage?.(targetId)} className="px-4 py-1.5 text-sm font-semibold bg-[#efefef] hover:bg-[#e0e0e0] rounded-lg transition flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Message</button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-8 mb-4 text-sm">
            <span><b className="text-[#262626]">{posts.length}</b> posts</span>
            <span><b className="text-[#262626]">{reels.length}</b> reels</span>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-[#262626]">{profile.full_name || profile.username}</p>
            <p className="text-[#262626] whitespace-pre-line">{profile.bio || 'No bio yet.'}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#dbdbdb] flex justify-center gap-12 mb-4">
        <TabBtn active={tab === 'grid'} onClick={() => setTab('grid')} icon={Grid3x3} label="POSTS" />
        <TabBtn active={tab === 'reels'} onClick={() => setTab('reels')} icon={Film} label="REELS" />
        <TabBtn active={tab === 'tagged'} onClick={() => setTab('tagged')} icon={Tag} label="TAGGED" />
      </div>

      {tab === 'tagged' ? (
        <div className="flex flex-col items-center justify-center py-16 ig-gray">
          <Tag className="w-12 h-12 mb-3" />
          <p className="text-lg font-light">Posts you're tagged in will appear here.</p>
        </div>
      ) : grid.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 ig-gray">
          <Camera className="w-12 h-12 mb-3" />
          <p className="text-lg font-light">No {tab === 'reels' ? 'Reels' : 'Posts'} Yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {grid.map((p) => (
            <div key={p.id} className="aspect-square relative bg-gray-100 overflow-hidden group">
              {p.media_type === 'reel' ? (
                <>
                  <video src={p.media_url} poster={p.thumbnail_url || undefined} className="w-full h-full object-cover" muted />
                  <div className="absolute top-2 right-2 text-white"><Film className="w-4 h-4 drop-shadow" /></div>
                </>
              ) : (
                <img src={p.media_url} className="w-full h-full object-cover" alt="" />
              )}
              {isMe && (
                <button
                  onClick={() => setDeletingId(p.id)}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 hover:bg-[#ed4956] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                  aria-label="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && myProfile && (
        <EditProfile profile={myProfile} onClose={() => setEditing(false)} onSaved={async () => { await refreshProfile(); setEditing(false); }} />
      )}

      {deletingId && (
        <DeletePost
          postId={deletingId}
          onCancel={() => setDeletingId(null)}
          onDeleted={() => {
            setPosts((prev) => prev.filter((p) => p.id !== deletingId));
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
}

function DeletePost({ postId, onCancel, onDeleted }: { postId: string; onCancel: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    setBusy(false);
    if (error) setError(error.message);
    else onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#ed4956]/10 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-[#ed4956]" />
          </div>
          <h3 className="text-lg font-semibold text-[#262626] mb-1">Delete post?</h3>
          <p className="text-sm ig-gray mb-5">This post will be permanently removed, along with its likes and comments.</p>
          {error && <p className="text-sm text-[#ed4956] bg-[#ed4956]/10 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="flex flex-col divide-y divide-[#dbdbdb] border-t border-[#dbdbdb] -mx-6">
            <button onClick={confirm} disabled={busy} className="w-full py-3 text-sm font-semibold text-[#ed4956] hover:bg-[#fafafa] disabled:opacity-50 transition">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
            </button>
            <button onClick={onCancel} className="w-full py-3 text-sm text-[#262626] hover:bg-[#fafafa] transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 py-4 text-xs font-semibold tracking-wider border-t-2 -mt-px transition ${active ? 'border-[#262626] text-[#262626]' : 'border-transparent ig-gray'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function EditProfile({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickAvatar = async (f: File) => {
    const url = await uploadFile('avatars', f, profile.id);
    setAvatarUrl(url);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('profiles').update({
      username: username.trim(),
      full_name: fullName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl || null,
    }).eq('id', profile.id);
    setBusy(false);
    if (error) setError(error.message);
    else onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#dbdbdb]">
          <h3 className="font-semibold text-sm text-[#262626]">Edit profile</h3>
          <button onClick={onClose} className="ig-gray"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <button onClick={() => fileRef.current?.click()} className="relative">
              <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]">
                <img src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`} className="w-full h-full rounded-full object-cover border-2 border-white" alt="" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#0095f6] text-white flex items-center justify-center shadow"><Camera className="w-3.5 h-3.5" /></div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])} />
            </button>
          </div>
          <label className="block">
            <span className="text-xs font-semibold ig-gray">Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="ig-input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold ig-gray">Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="ig-input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold ig-gray">Bio</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="ig-input mt-1 resize-none" />
          </label>
          {error && <p className="text-sm text-[#ed4956] bg-[#ed4956]/10 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={save} disabled={busy} className="w-full py-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}
