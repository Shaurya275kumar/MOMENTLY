import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, type Profile } from '../lib/supabase';
import { fetchConversations, fetchMessages, sendMessage, markRead, subscribeMessages, getOrCreateDm, type ConversationRow, type MessageRow } from '../lib/chat';
import { ArrowLeft, Send, Search, MessageCircle } from 'lucide-react';

export default function ChatScreen({ initialUserId, onOpenProfile }: { initialUserId?: string | null; onOpenProfile?: (id: string) => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setConversations(await fetchConversations(user.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!initialUserId || !user) return;
    (async () => {
      const cid = await getOrCreateDm(initialUserId);
      setActiveId(cid);
      await load();
    })();
  }, [initialUserId, user]);

  if (loading) return <div className="text-center py-20 ig-gray text-sm">Loading…</div>;

  return (
    <div className="max-w-[935px] mx-auto md:flex md:h-[calc(100vh-0px)] md:py-6 px-0 md:px-4">
      {/* Conversation list */}
      <div className={`md:w-[340px] md:border md:border-[#dbdbdb] md:rounded-xl bg-white ${activeId ? 'hidden md:block' : 'block'}`}>
        <div className="px-4 py-4 border-b border-[#dbdbdb]">
          <h2 className="font-bold text-lg text-[#262626]">{user?.user_metadata?.username || 'Messages'}</h2>
        </div>
        <NewChat onPicked={(id) => setActiveId(id)} onCreated={load} />
        <div className="overflow-y-auto max-h-[60vh] md:max-h-[calc(100vh-220px)]">
          {conversations.length === 0 && <p className="text-sm ig-gray text-center py-10 px-4">No conversations yet. Start one from a profile.</p>}
          {conversations.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f2f2f2] text-left ${activeId === c.id ? 'bg-[#f2f2f2]' : ''}`}>
              <img src={c.other.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.other.username)}&background=random`} className="w-12 h-12 rounded-full object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#262626] truncate">{c.other.username}</p>
                <p className="text-xs ig-gray truncate">{c.last_message || 'No messages yet'}</p>
              </div>
              {c.unread > 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#0095f6]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 md:border md:border-l-0 md:border-[#dbdbdb] md:rounded-r-xl bg-white flex flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
        {activeId ? (
          <Thread key={activeId} conversationId={activeId} onBack={() => setActiveId(null)} onOpenProfile={onOpenProfile} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageCircle className="w-16 h-16 text-[#dbdbdb] mb-4" strokeWidth={1} />
            <p className="text-xl font-light text-[#262626]">Your messages</p>
            <p className="text-sm ig-gray mt-1">Send a message to start a chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewChat({ onPicked, onCreated }: { onPicked: (cid: string) => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!q.trim()) { setResults([]); return; }
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${q.trim()}%`).limit(10);
      setResults(((data as Profile[]) || []).filter((p) => p.id !== user?.id));
    })();
  }, [q, user]);

  const pick = async (uid: string) => {
    const cid = await getOrCreateDm(uid);
    setQ(''); setResults([]); setOpen(false);
    onPicked(cid);
    onCreated();
  };

  return (
    <div className="px-4 py-3 border-b border-[#dbdbdb]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Start a new chat…" className="ig-input pl-9 py-2 text-sm" />
      </div>
      {open && results.length > 0 && (
        <div className="mt-2 border border-[#dbdbdb] rounded-lg overflow-hidden shadow-sm">
          {results.map((p) => (
            <button key={p.id} onClick={() => pick(p.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#f2f2f2] text-left">
              <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=random`} className="w-9 h-9 rounded-full object-cover" alt="" />
              <div>
                <p className="text-sm font-semibold text-[#262626]">{p.username}</p>
                <p className="text-xs ig-gray">{p.full_name || ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Thread({ conversationId, onBack, onOpenProfile }: { conversationId: string; onBack: () => void; onOpenProfile?: (id: string) => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [msgs] = await Promise.all([fetchMessages(conversationId)]);
      setMessages(msgs);
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id, profiles!conversation_members_user_id_fkey(*)')
        .eq('conversation_id', conversationId);
      const o = (members as any[])?.find((m) => m.user_id !== user?.id)?.profiles as Profile | undefined;
      if (o) setOther(o);
      await markRead(conversationId);
    })();
    const sub = subscribeMessages(conversationId, async () => {
      setMessages(await fetchMessages(conversationId));
      await markRead(conversationId);
    });
    return () => { supabase.removeChannel(sub); };
  }, [conversationId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    setBody('');
    try { await sendMessage(conversationId, body.trim()); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#dbdbdb]">
        <button onClick={onBack} className="md:hidden text-[#262626]"><ArrowLeft className="w-5 h-5" /></button>
        <button onClick={() => other && onOpenProfile?.(other.id)} className="flex items-center gap-3 text-left">
          <img src={other?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.username || 'u')}&background=random`} className="w-9 h-9 rounded-full object-cover" alt="" />
          <span className="text-sm font-semibold text-[#262626]">{other?.username || 'Chat'}</span>
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && <p className="text-center text-sm ig-gray py-10">Say hi 👋</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${mine ? 'bg-[#0095f6] text-white rounded-br-sm' : 'bg-[#efefef] text-[#262626] rounded-bl-sm'}`}>{m.body}</div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-[#dbdbdb] flex items-center gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Message…" className="flex-1 ig-input py-2 text-sm" />
        <button onClick={submit} disabled={!body.trim() || busy} className="text-sm font-semibold text-[#0095f6] disabled:opacity-40 flex items-center gap-1">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
