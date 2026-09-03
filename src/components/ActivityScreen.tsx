import { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';

type NotificationRow = {
  id: string;
  type: 'like' | 'comment' | 'follow';
  actor_id: string;
  post_id: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
  actor: Profile;
};

export default function ActivityScreen({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('notifications')
        .select('id, type, actor_id, post_id, body, created_at, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!data || data.length === 0) { setLoading(false); return; }

      const actorIds = [...new Set(data.map((n: any) => n.actor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', actorIds);
      const profileMap = new Map<string, Profile>(
        ((profiles as Profile[]) || []).map((p) => [p.id, p])
      );

      const enriched: NotificationRow[] = data.map((n: any) => ({
        ...n,
        actor: profileMap.get(n.actor_id) || { id: n.actor_id, username: 'unknown', full_name: null, bio: null, avatar_url: null, created_at: '' },
      }));
      setNotifications(enriched);
      setLoading(false);

      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    })();
  }, [user]);

  if (loading) return <div className="text-center ig-gray text-sm py-20">Loading activity…</div>;

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6">
      <h2 className="text-lg font-semibold text-[#262626] dark:text-[#f5f5f5] mb-4">Activity</h2>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 mx-auto mb-3 text-[#dbdbdb]" strokeWidth={1} />
          <p className="text-sm ig-gray">No activity yet. When people interact with you, it'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition animate-slide-up ${!n.read_at ? 'bg-[#0095f6]/5' : 'hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] dark:bg-[#0a0a0a]'}`}
            >
              <div className="relative shrink-0">
                <img
                  src={n.actor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.actor.username)}&background=random`}
                  className="w-11 h-11 rounded-full object-cover"
                  alt=""
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#ed4956] flex items-center justify-center ring-2 ring-white">
                  {n.type === 'like' && <Heart className="w-3 h-3 text-white fill-white" />}
                  {n.type === 'comment' && <MessageCircle className="w-3 h-3 text-white" />}
                  {n.type === 'follow' && <UserPlus className="w-3 h-3 text-white" />}
                </div>
              </div>

              <button onClick={() => onOpenProfile(n.actor_id)} className="flex-1 text-left min-w-0">
                <p className="text-sm text-[#262626] dark:text-[#f5f5f5]">
                  <span className="font-semibold">{n.actor.username}</span>{' '}
                  {n.type === 'like' && 'liked your post.'}
                  {n.type === 'comment' && `commented: "${n.body || ''}"`}
                  {n.type === 'follow' && 'started following you.'}
                </p>
                <p className="text-xs ig-gray mt-0.5">{timeAgo(n.created_at)}</p>
              </button>

              {n.type === 'follow' && <FollowButton actorId={n.actor_id} />}
              {n.post_id && (
                <img
                  src={`https://ui-avatars.com/api/?name=p&background=random&size=40`}
                  className="w-10 h-10 rounded object-cover hidden sm:block"
                  alt=""
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FollowButton({ actorId }: { actorId: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('followee_id', actorId)
        .maybeSingle();
      setFollowing(!!data);
    })();
  }, [user, actorId]);

  const toggle = async () => {
    if (!user) return;
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', actorId);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: actorId });
    }
    setFollowing(!following);
  };

  return (
    <button
      onClick={toggle}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition ${
        following ? 'bg-[#efefef] dark:bg-[#262626] text-[#262626] dark:text-[#f5f5f5]' : 'bg-[#0095f6] text-white'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
