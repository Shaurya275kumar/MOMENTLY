import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getProfile, updateProfile, uploadAvatar } from '../lib/profile';
import { fetchUserPosts, fetchSavedPosts, deletePost } from '../lib/posts';
import type { Profile, Post } from '../lib/supabase';
import { Camera, Check, Loader2, Trash2, Grid3x3, Bookmark, LogOut, UserX } from 'lucide-react';

export default function ProfileScreen({ onBack }: { onBack: () => void; onSignOut?: () => void }) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'posts' | 'saved'>('posts');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      setProfile(await getProfile(user.id));
      setPosts(await fetchUserPosts(user.id, user.id));
      setSavedPosts(await fetchSavedPosts(user.id));
      setLoading(false);
    })();
  }, [user]);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: url });
      setProfile((p) => p ? { ...p, avatar_url: url } : p);
    } catch (err) {
      alert('Upload failed: ' + (err as Error).message);
    }
  };

  const onRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    try {
      await updateProfile(user.id, { avatar_url: null });
      setProfile((p) => p ? { ...p, avatar_url: null } : p);
    } catch (err) {
      alert('Could not remove photo: ' + (err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePost(deleteTarget.id);
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert('Delete failed: ' + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-center py-20 ig-gray text-sm">Loading…</div>;
  if (!profile) return <div className="text-center py-20 ig-gray text-sm">Profile not found</div>;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-8">
      <button onClick={onBack} className="text-sm ig-gray mb-4 hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]">← Back</button>
      <div className="flex items-start gap-8 mb-8">
        <div className="relative shrink-0">
          <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`} className="w-24 h-24 rounded-full object-cover" alt="" />
          {editing && (
            <>
              <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0095f6] text-white flex items-center justify-center ring-2 ring-white" aria-label="Change photo">
                <Camera className="w-4 h-4" />
              </button>
              {profile.avatar_url && (
                <button onClick={onRemoveAvatar} className="absolute top-0 right-0 w-8 h-8 rounded-full bg-[#ed4956] text-white flex items-center justify-center ring-2 ring-white" aria-label="Remove photo">
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-xl font-light text-[#262626] dark:text-[#f5f5f5]">{profile.username}</h1>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-4 py-1.5 text-sm font-semibold bg-[#efefef] dark:bg-[#262626] hover:bg-[#e0e0e0] dark:hover:bg-[#333333] dark:bg-[#333333] rounded-lg">Edit profile</button>
            ) : (
              <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-sm font-semibold bg-[#0095f6] text-white rounded-lg">Done</button>
            )}
            <button
              onClick={() => signOut()}
              className="px-4 py-1.5 text-sm font-semibold text-[#ed4956] hover:bg-[#efefef] dark:hover:bg-[#262626] dark:bg-[#262626] rounded-lg flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
          <div className="flex gap-6 mb-3 text-sm">
            <span><b className="text-[#262626] dark:text-[#f5f5f5]">{posts.length}</b> <span className="ig-gray">posts</span></span>
          </div>
          <p className="text-sm text-[#262626] dark:text-[#f5f5f5] font-semibold">{profile.full_name || ''}</p>
          <p className="text-sm ig-gray">{profile.bio || 'No bio yet'}</p>
        </div>
      </div>
      {editing && <EditForm profile={profile} onSaved={setProfile} />}

      <div className="border-t border-[#dbdbdb] dark:border-[#262626]">
        <div className="flex justify-center gap-12 mb-2">
          <button
            onClick={() => setTab('posts')}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide py-3 ${tab === 'posts' ? 'text-[#262626] dark:text-[#f5f5f5] border-t border-[#262626] -mt-px' : 'ig-gray'}`}
          >
            <Grid3x3 className="w-4 h-4" /> Posts
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide py-3 ${tab === 'saved' ? 'text-[#262626] dark:text-[#f5f5f5] border-t border-[#262626] -mt-px' : 'ig-gray'}`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        </div>

        {tab === 'posts' && (
          posts.length === 0 ? (
            <p className="text-center ig-gray py-16 text-sm">No posts yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <div key={post.id} className="relative aspect-square bg-[#fafafa] dark:bg-[#0a0a0a] overflow-hidden group">
                  {post.media_type === 'reel' ? (
                    <video src={post.media_url} poster={post.thumbnail_url || undefined} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.media_url} className="w-full h-full object-cover" alt={post.caption || ''} />
                  )}
                  <button
                    onClick={() => setDeleteTarget(post)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    aria-label="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'saved' && (
          savedPosts.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="w-12 h-12 mx-auto mb-3 text-[#dbdbdb]" strokeWidth={1} />
              <p className="text-sm ig-gray">No saved posts yet. Tap the bookmark icon on any post to save it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {savedPosts.map((post) => (
                <div key={post.id} className="relative aspect-square bg-[#fafafa] dark:bg-[#0a0a0a] overflow-hidden">
                  {post.media_type === 'reel' ? (
                    <video src={post.media_url} poster={post.thumbnail_url || undefined} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.media_url} className="w-full h-full object-cover" alt={post.caption || ''} />
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative bg-white dark:bg-[#121212] rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 text-center">
              <h3 className="text-lg font-semibold text-[#262626] dark:text-[#f5f5f5] mb-1">Delete post?</h3>
              <p className="text-sm ig-gray">This post will be permanently removed. This can't be undone.</p>
            </div>
            <div className="border-t border-[#dbdbdb] dark:border-[#262626]">
              <button onClick={confirmDelete} disabled={deleting} className="w-full py-3 text-sm font-semibold text-[#ed4956] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] dark:bg-[#0a0a0a] disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
            <div className="border-t border-[#dbdbdb] dark:border-[#262626]">
              <button onClick={() => setDeleteTarget(null)} className="w-full py-3 text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] dark:bg-[#0a0a0a]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const { user } = useAuth();
  const [username, setUsername] = useState(profile.username);
  const [full_name, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, { username, full_name, bio });
      onSaved(updated);
    } catch (err) {
      alert('Save failed: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-[#dbdbdb] dark:border-[#262626] pt-6 space-y-4 max-w-md">
      <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} className="ig-input py-2" /></Field>
      <Field label="Name"><input value={full_name} onChange={(e) => setFullName(e.target.value)} className="ig-input py-2" /></Field>
      <Field label="Bio"><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="ig-input py-2 resize-none" /></Field>
      <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-[#0095f6] text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold ig-gray mb-1">{label}</span>
      {children}
    </label>
  );
}
