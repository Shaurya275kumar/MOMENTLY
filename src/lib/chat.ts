import { supabase } from './supabase';
import type { Profile } from './supabase';

export type ConversationRow = {
  id: string;
  other: Profile;
  last_message: string | null;
  last_at: string | null;
  unread: number;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
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

export async function fetchConversations(meId: string): Promise<ConversationRow[]> {
  const { data: memberships } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', meId);
  if (!memberships || memberships.length === 0) return [];

  const convIds = memberships.map((m) => m.conversation_id);
  const readMap = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

  const [{ data: allMembers }, { data: lastMsgs }] = await Promise.all([
    supabase.from('conversation_members').select('conversation_id, user_id, profiles!conversation_members_user_id_fkey(*)').in('conversation_id', convIds),
    supabase.from('messages').select('conversation_id, body, created_at').in('conversation_id', convIds).order('created_at', { ascending: false }),
  ]);

  const lastByConv = new Map<string, { body: string; created_at: string }>();
  (lastMsgs || []).forEach((m: any) => {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at });
  });

  const byConv = new Map<string, any[]>();
  (allMembers || []).forEach((m: any) => {
    if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
    byConv.get(m.conversation_id)!.push(m);
  });

  const rows: ConversationRow[] = [];
  convIds.forEach((cid) => {
    const members = byConv.get(cid) || [];
    const other = members.find((m) => m.user_id !== meId);
    if (!other) return;
    const last = lastByConv.get(cid);
    const readAt = readMap.get(cid);
    const unread = (lastMsgs || []).filter((m: any) => m.conversation_id === cid && new Date(m.created_at) > new Date(readAt || 0) && (last as any)?.created_at === m.created_at ? true : false).length;
    rows.push({
      id: cid,
      other: other.profiles as Profile,
      last_message: last?.body ?? null,
      last_at: last?.created_at ?? null,
      unread,
    });
  });

  rows.sort((a, b) => (b.last_at || '').localeCompare(a.last_at || ''));
  return rows;
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at, read_at')
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

/** Track the current user as online in a conversation presence channel. */
export function trackPresence(conversationId: string, userId: string) {
  const channel = supabase.channel(`presence:${conversationId}`, {
    config: { presence: { key: userId } },
  });
  channel
    .on('presence', { event: 'sync' }, () => {})
    .on('presence', { event: 'join' }, () => {})
    .on('presence', { event: 'leave' }, () => {})
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, onlineAt: new Date().toISOString() } satisfies PresenceState);
      }
    });
  return channel;
}

export function getOnlineUserIds(channel: ReturnType<typeof trackPresence>): Set<string> {
  const state = channel.presenceState<{ userId: string; onlineAt: string }>();
  const ids = new Set<string>();
  Object.values(state).forEach((presences) => {
    presences.forEach((p) => ids.add(p.userId));
  });
  return ids;
}

export function onPresenceChange(channel: ReturnType<typeof trackPresence>, cb: (onlineIds: Set<string>) => void) {
  const handler = () => cb(getOnlineUserIds(channel));
  channel.on('presence', { event: 'sync' }, handler);
  return () => {};
}

/* ------------------------------------------------------------------ */
/* Typing indicators — broadcast                                       */
/* ------------------------------------------------------------------ */

export function sendTyping(channel: ReturnType<typeof trackPresence>, userId: string) {
  channel.send({ type: 'broadcast', event: 'typing', payload: { userId } });
}

export function sendStopTyping(channel: ReturnType<typeof trackPresence>, userId: string) {
  channel.send({ type: 'broadcast', event: 'stop_typing', payload: { userId } });
}

export function onTyping(
  channel: ReturnType<typeof trackPresence>,
  otherId: string,
  onTypingCb: () => void,
  onStopCb: () => void,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  channel.on('broadcast', { event: 'typing' }, (msg) => {
    if (msg.payload?.userId === otherId) {
      onTypingCb();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onStopCb();
        timer = null;
      }, 3500);
    }
  });
  channel.on('broadcast', { event: 'stop_typing' }, (msg) => {
    if (msg.payload?.userId === otherId) {
      if (timer) clearTimeout(timer);
      onStopCb();
      timer = null;
    }
  });
}
