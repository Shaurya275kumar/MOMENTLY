import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { X, Loader2 } from 'lucide-react';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string; avatar_url: string | null } | null;
};

export default function CommentsDrawer({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('comments')
        .select('id, body, created_at, user_id, profiles!comments_user_id_fkey(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      setComments((data as unknown as CommentRow[]) || []);
      setLoading(false);
    })();
  }, [postId]);

  const submit = async () => {
    if (!user || !body.trim() || busy) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, body: body.trim() })
      .select('id, body, created_at, user_id')
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setComments((prev) => [
        ...prev,
        { ...data, profiles: { username: profile?.username || 'you', avatar_url: profile?.avatar_url || null } },
      ]);
      setBody('');
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const { error } = await supabase.from('comments').delete().eq('id', id).eq('user_id', user.id);
    if (error) setComments(prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center px-5 py-3 border-b border-[#dbdbdb] relative">
          <h3 className="font-semibold text-sm text-[#262626]">Comments</h3>
          <button onClick={onClose} className="absolute right-4 text-[#8e8e8e] hover:text-[#262626]"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && <p className="text-sm ig-gray text-center py-8">Loading…</p>}
          {!loading && comments.length === 0 && <p className="text-sm ig-gray text-center py-8">No comments yet. Start the conversation.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <img src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.profiles?.username || 'u')}&background=random`} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
              <div className="flex-1">
                <p className="text-sm text-[#262626]"><span className="font-semibold mr-1.5">{c.profiles?.username}</span>{c.body}</p>
                <p className="text-[10px] ig-gray mt-0.5 uppercase tracking-wide">{timeAgo(c.created_at)}</p>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 transition text-[#8e8e8e] hover:text-[#ed4956]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-[#ed4956] px-4 pt-2">{error}</p>}
        <div className="px-4 py-3 border-t border-[#dbdbdb] flex gap-2 items-center">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Add a comment…"
            className="flex-1 text-sm py-2 focus:outline-none placeholder-[#8e8e8e]"
          />
          <button onClick={submit} disabled={!body.trim() || busy} className="text-sm font-semibold text-[#0095f6] disabled:opacity-40 flex items-center gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </button>
        </div>
      </div>
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
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
