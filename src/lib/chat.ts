import { supabase } from './supabase';
import type { Profile } from './supabase';

export type ConversationRow = {
  id: string;
  other: Profile;
  last_message: string | null;
  last_at: string | null;
  unread: number;
};

export type MediaType = 'image' | 'video' | 'file' | 'audio';

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  media_url: string | null;
  media_type: MediaType | null;
  media_name: string | null;
};

export async function fetchDmPartner(conversationId: string): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('get_dm_partner', { p_conversation: conversationId });
  if (error) return null;
  const row = (data as any[])?.[0];
  if (!row) return null;
  return { id: row.id, username: row.username, full_name: row.full_name, avatar_url: row.avatar_url, bio: row.bio } as Profile;
}

export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { p_other_user: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function fetchConversations(_meId: string): Promise<ConversationRow[]> {
  const { data, error } = await supabase.rpc('get_my_conversations');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    other: {
      id: r.partner_id,
      username: r.partner_username,
      full_name: r.partner_full_name,
      avatar_url: r.partner_avatar_url,
      bio: '',
    } as Profile,
    last_message: r.last_message ?? (r.last_at ? 'Media' : null),
    last_at: r.last_at,
    unread: Number(r.unread) || 0,
  }));
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at, read_at, media_url, media_type, media_name')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  return (data as MessageRow[]) || [];
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, body });
  if (error) throw error;
}

/** Mark the conversation as read (updates conversation_members.last_read_at) */
export async function markRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
  if (error) throw error;
}

/** Mark all incoming messages in a conversation as read (sets messages.read_at) */
export async function markMessagesRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_messages_read', { p_conversation: conversationId });
  if (error) throw error;
}

/** Realtime subscription for new/updated messages in a conversation */
export function subscribeMessages(conversationId: string, cb: () => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, cb)
    .subscribe();
}

/** Realtime subscription for new messages across all of the user's conversations (for inbox updates) */
export function subscribeInbox(meId: string, cb: () => void) {
  return supabase
    .channel(`inbox:${meId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, cb)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, cb)
    .subscribe();
}

/* ------------------------------------------------------------------ */
/* Presence — who is online                                            */
/* ------------------------------------------------------------------ */

export type PresenceState = {
  userId: string;
  onlineAt: string;
};

/**
 * Create + subscribe a presence/typing channel for a conversation.
 * All callbacks MUST be registered before .subscribe(), so this is done
 * in one function rather than separate calls (adding callbacks after
 * subscribe() throws in the Supabase realtime client).
 */
export function setupPresenceChannel(
  conversationId: string,
  userId: string,
  otherId: string,
  onSync: (onlineIds: Set<string>) => void,
  onTypingCb: () => void,
  onStopTypingCb: () => void,
) {
  const channel = supabase.channel(`presence:${conversationId}`, {
    config: { presence: { key: userId } },
  });

  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  channel
    .on('presence', { event: 'sync' }, () => onSync(getOnlineUserIds(channel)))
    .on('broadcast', { event: 'typing' }, (msg) => {
      if (msg.payload?.userId === otherId) {
        onTypingCb();
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => { onStopTypingCb(); typingTimer = null; }, 3500);
      }
    })
    .on('broadcast', { event: 'stop_typing' }, (msg) => {
      if (msg.payload?.userId === otherId) {
        if (typingTimer) clearTimeout(typingTimer);
        onStopTypingCb();
        typingTimer = null;
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, onlineAt: new Date().toISOString() } satisfies PresenceState);
      }
    });

  return channel;
}

export function getOnlineUserIds(channel: ReturnType<typeof setupPresenceChannel>): Set<string> {
  const state = channel.presenceState<{ userId: string; onlineAt: string }>();
  const ids = new Set<string>();
  Object.values(state).forEach((presences) => {
    presences.forEach((p) => ids.add(p.userId));
  });
  return ids;
}

export function sendTyping(channel: ReturnType<typeof setupPresenceChannel>, userId: string) {
  channel.send({ type: 'broadcast', event: 'typing', payload: { userId } });
}

export function sendStopTyping(channel: ReturnType<typeof setupPresenceChannel>, userId: string) {
  channel.send({ type: 'broadcast', event: 'stop_typing', payload: { userId } });
}
