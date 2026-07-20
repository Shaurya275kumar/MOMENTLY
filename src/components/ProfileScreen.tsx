import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getProfile, updateProfile, uploadAvatar } from '../lib/profile';
import type { Profile } from '../lib/supabase';
import { Camera, Check, Loader2 } from 'lucide-react';

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      setProfile(await getProfile(user.id));
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

  if (loading) return <div className="text-center py-20 ig-gray text-sm">Loading…</div>;
  if (!profile) return <div className="text-center py-20 ig-gray text-sm">Profile not found</div>;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-8">
      <button onClick={onBack} className="text-sm ig-gray mb-4 hover:text-[#262626]">← Back</button>
      <div className="flex items-start gap-8 mb-8">
        <div className="relative shrink-0">
          <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`} className="w-24 h-24 rounded-full object-cover" alt="" />
          {editing && (
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0095f6] text-white flex items-center justify-center ring-2 ring-white">
              <Camera className="w-4 h-4" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-xl font-light text-[#262626]">{profile.username}</h1>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-4 py-1.5 text-sm font-semibold bg-[#efefef] hover:bg-[#e0e0e0] rounded-lg">Edit profile</button>
            ) : (
              <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-sm font-semibold bg-[#0095f6] text-white rounded-lg">Done</button>
            )}
          </div>
          <p className="text-sm text-[#262626] font-semibold">{profile.full_name || ''}</p>
          <p className="text-sm ig-gray">{profile.bio || 'No bio yet'}</p>
        </div>
      </div>
      {editing && <EditForm profile={profile} onSaved={setProfile} />}
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
    <div className="border-t border-[#dbdbdb] pt-6 space-y-4 max-w-md">
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
