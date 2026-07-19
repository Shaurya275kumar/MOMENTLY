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
};

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
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  return (data as MessageRow[]) || [];
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, body });
  if (error) throw error;
}

export async function markRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
  if (error) throw error;
}

export function subscribeMessages(conversationId: string, cb: () => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, cb)
    .subscribe();
}
