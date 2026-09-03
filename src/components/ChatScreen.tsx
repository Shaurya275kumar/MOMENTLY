import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { uploadFile } from '../lib/upload';
import { supabase, type Profile } from '../lib/supabase';
import {
  fetchConversations,
  fetchMessages,
  fetchDmPartner,
  markRead,
  markMessagesRead,
  subscribeMessages,
  subscribeInbox,
  getOrCreateDm,
  setupPresenceChannel,
  sendTyping,
  sendStopTyping,
  type ConversationRow,
  type MessageRow,
  type MediaType,
} from '../lib/chat';
import { ArrowLeft, Send, Search, MessageCircle, Check, CheckCheck, Phone, Video, Paperclip, ImageIcon, FileText } from 'lucide-react';

export default function ChatScreen({ initialUserId, onOpenProfile }: { initialUserId?: string | null; onOpenProfile?: (id: string) => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setConversations(await fetchConversations(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Live inbox: refresh conversation list when any message changes
  useEffect(() => {
    if (!user) return;
    const ch = subscribeInbox(user.id, () => load());
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  useEffect(() => {
    if (!initialUserId || !user) return;
    (async () => {
      const cid = await getOrCreateDm(initialUserId);
      setActiveId(cid);
      await load();
    })();
  }, [initialUserId, user, load]);

  if (loading) return <div className="text-center py-20 ig-gray text-sm">Loading…</div>;

  return (
    <div className="max-w-[935px] mx-auto md:flex md:h-[calc(100vh-3.5rem)] md:py-6 px-0 md:px-4">
      {/* Conversation list */}
      <div className={`md:w-[340px] md:border md:border-[#dbdbdb] dark:border-[#262626] md:rounded-xl bg-white dark:bg-[#121212] ${activeId ? 'hidden md:block' : 'block'}`}>
        <div className="px-4 py-4 border-b border-[#dbdbdb] dark:border-[#262626]">
          <h2 className="font-bold text-lg text-[#262626] dark:text-[#f5f5f5]">{user?.user_metadata?.username || 'Messages'}</h2>
        </div>
        <NewChat onPicked={(id) => setActiveId(id)} onCreated={load} />
        <div className="overflow-y-auto max-h-[55vh] md:max-h-[calc(100vh-220px)]">
          {conversations.length === 0 && <p className="text-sm ig-gray text-center py-10 px-4">No conversations yet. Start one from a profile.</p>}
          {conversations.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] dark:bg-[#1a1a1a] text-left ${activeId === c.id ? 'bg-[#f2f2f2] dark:bg-[#1a1a1a]' : ''}`}>
              <img src={c.other.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.other.username)}&background=random`} className="w-12 h-12 rounded-full object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{c.other.username}</p>
                <p className="text-xs ig-gray truncate">{c.last_message || 'No messages yet'}</p>
              </div>
              {c.unread > 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#0095f6]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 md:border md:border-l-0 md:border-[#dbdbdb] dark:border-[#262626] md:rounded-r-xl bg-white dark:bg-[#121212] flex flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
        {activeId ? (
          <Thread key={activeId} conversationId={activeId} onBack={() => setActiveId(null)} onOpenProfile={onOpenProfile} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageCircle className="w-16 h-16 text-[#dbdbdb] mb-4" strokeWidth={1} />
            <p className="text-xl font-light text-[#262626] dark:text-[#f5f5f5]">Your messages</p>
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
    <div className="px-4 py-3 border-b border-[#dbdbdb] dark:border-[#262626]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Start a new chat…" className="ig-input pl-9 py-2 text-sm" />
      </div>
      {open && results.length > 0 && (
        <div className="mt-2 border border-[#dbdbdb] dark:border-[#262626] rounded-lg overflow-hidden shadow-sm">
          {results.map((p) => (
            <button key={p.id} onClick={() => pick(p.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] dark:bg-[#1a1a1a] text-left">
              <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=random`} className="w-9 h-9 rounded-full object-cover" alt="" />
              <div>
                <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5]">{p.username}</p>
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
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<ReturnType<typeof setupPresenceChannel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Resolve the "other" member (via SECURITY DEFINER function — RLS blocks direct read)
  useEffect(() => {
    (async () => {
      const partner = await fetchDmPartner(conversationId);
      if (partner) setOther(partner);
    })();
  }, [conversationId]);

  // Load messages + mark read (only once on open, not on every refresh)
  const refresh = useCallback(async () => {
    const msgs = await fetchMessages(conversationId);
    setMessages(msgs);
  }, [conversationId]);

  useEffect(() => {
    refresh();
    if (user) {
      markMessagesRead(conversationId);
      markRead(conversationId);
    }
    const sub = subscribeMessages(conversationId, () => refresh());
    return () => { supabase.removeChannel(sub); };
  }, [refresh, conversationId, user]);

  // Presence + typing
  useEffect(() => {
    if (!user || !other) return;
    const ch = setupPresenceChannel(
      conversationId,
      user.id,
      other.id,
      (onlineIds) => {
        const online = onlineIds.has(other.id);
        setOtherOnline(online);
        if (!online) setLastSeen(null);
      },
      () => setOtherTyping(true),
      () => setOtherTyping(false),
    );
    presenceRef.current = ch;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (user && presenceRef.current) sendStopTyping(presenceRef.current, user.id);
      supabase.removeChannel(ch);
    };
  }, [user, other, conversationId]);

  // Auto-scroll to bottom on new messages / typing
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, otherTyping]);

  const handleTyping = () => {
    if (!user || !presenceRef.current) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(presenceRef.current, user.id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (presenceRef.current) sendStopTyping(presenceRef.current, user!.id);
    }, 2500);
  };

  const submit = async () => {
    if (!body.trim() || busy || !user) return;
    await sendTextMessage(body.trim());
  };

  const sendTextMessage = async (text: string) => {
    if (!user) return;
    setBusy(true);
    setBody('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    if (presenceRef.current) sendStopTyping(presenceRef.current, user.id);

    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      body: text,
      created_at: new Date().toISOString(),
      read_at: null,
      media_url: null,
      media_type: null,
      media_name: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, body: text })
        .select('id, conversation_id, sender_id, body, created_at, read_at, media_url, media_type, media_name')
        .single();
      if (error) throw error;
      if (data) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? data : m));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setBody(text);
    }
    setBusy(false);
  };

  const detectMediaType = (file: File): MediaType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const sendFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const mediaType = detectMediaType(file);
    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      body: null,
      created_at: new Date().toISOString(),
      read_at: null,
      media_url: URL.createObjectURL(file),
      media_type: mediaType,
      media_name: file.name,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const url = await uploadFile('chat-attachments', file, user.id);
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, body: null, media_url: url, media_type: mediaType, media_name: file.name })
        .select('id, conversation_id, sender_id, body, created_at, read_at, media_url, media_type, media_name')
        .single();
      if (error) throw error;
      if (data) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? data : m));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
    setUploading(false);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      sendFile(files[0]);
    }
    e.target.value = '';
  };

  const statusText = otherTyping ? 'typing…' : otherOnline ? 'online' : lastSeen ? `last seen ${lastSeen}` : 'offline';

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#dbdbdb] dark:border-[#262626] bg-white dark:bg-[#121212]">
        <button onClick={onBack} className="md:hidden text-[#262626] dark:text-[#f5f5f5]"><ArrowLeft className="w-5 h-5" /></button>
        <button onClick={() => other && onOpenProfile?.(other.id)} className="flex items-center gap-3 text-left flex-1 min-w-0">
          <div className="relative">
            <img src={other?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.username || 'u')}&background=random`} className="w-10 h-10 rounded-full object-cover" alt="" />
            {otherOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] ring-2 ring-white" />}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] block truncate">{other?.username || 'Chat'}</span>
            <span className={`text-xs ${otherTyping ? 'text-[#0095f6]' : otherOnline ? 'text-[#25D366]' : 'ig-gray'}`}>{statusText}</span>
          </div>
        </button>
        <button className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#0095f6] p-1.5 rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] dark:bg-[#1a1a1a]"><Phone className="w-5 h-5" /></button>
        <button className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#0095f6] p-1.5 rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] dark:bg-[#1a1a1a]"><Video className="w-5 h-5" /></button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 bg-[#efeae2]">
        <div className="text-center my-3">
          <span className="text-[11px] ig-gray bg-white dark:bg-[#121212]/70 px-3 py-1 rounded-full">Messages are end-to-end encrypted in this demo</span>
        </div>
        {messages.length === 0 && <p className="text-center text-sm ig-gray py-10">Say hi 👋</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const isLastInGroup = i === messages.length - 1 || messages[i + 1]?.sender_id !== m.sender_id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const hasMedia = !!m.media_url;
          const hasText = !!m.body;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-2' : ''}`}>
              <div className={`max-w-[75%] text-sm shadow-sm relative ${
                hasMedia
                  ? mine
                    ? 'bg-[#d9fdd3] rounded-2xl rounded-br-sm overflow-hidden'
                    : 'bg-white dark:bg-[#121212] rounded-2xl rounded-bl-sm overflow-hidden'
                  : mine
                    ? 'bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-br-sm px-3 py-2'
                    : 'bg-white dark:bg-[#121212] text-[#111b21] rounded-2xl rounded-bl-sm px-3 py-2'
              }`}>
                {hasMedia && m.media_type === 'image' && (
                  <a href={m.media_url ?? undefined} target="_blank" rel="noopener noreferrer">
                    <img src={m.media_url ?? undefined} alt={m.media_name || 'photo'} className="w-full max-w-[280px] h-auto object-cover" />
                  </a>
                )}
                {hasMedia && m.media_type === 'video' && (
                  <video src={m.media_url ?? undefined} controls className="w-full max-w-[280px] h-auto" />
                )}
                {hasMedia && m.media_type === 'audio' && (
                  <div className="p-3">
                    <audio src={m.media_url ?? undefined} controls className="w-full max-w-[280px]" />
                  </div>
                )}
                {hasMedia && m.media_type === 'file' && (
                  <a href={m.media_url ?? undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 min-w-[200px]">
                    <FileText className="w-8 h-8 text-[#0095f6] flex-shrink-0" />
                    <span className="text-xs text-[#262626] dark:text-[#f5f5f5] truncate">{m.media_name || 'file'}</span>
                  </a>
                )}
                {hasText && (
                  <p className={`whitespace-pre-wrap break-words ${hasMedia ? 'px-3 pt-1 pb-2' : 'pr-12'} ${hasMedia ? '' : ''}`}>{m.body}</p>
                )}
                <span className={`flex items-center gap-0.5 text-[10px] text-[#667781] ${hasMedia ? 'absolute bottom-1.5 right-2 bg-white dark:bg-[#121212]/70 px-1 rounded' : 'absolute bottom-1 right-2'}`}>
                  {time}
                  {mine && isLastInGroup && (
                    m.read_at ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-[#667781]" />
                  )}
                </span>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white dark:bg-[#121212] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#90a4ae] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#90a4ae] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#90a4ae] animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-2.5 border-t border-[#dbdbdb] dark:border-[#262626] flex items-center gap-2 bg-white dark:bg-[#121212]">
        <input ref={fileRef} type="file" onChange={onFilePick} className="hidden" accept="video/*,audio/*,application/pdf,text/*,.*" />
        <input ref={imageRef} type="file" onChange={onFilePick} className="hidden" accept="image/*" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] dark:bg-[#1a1a1a] flex items-center justify-center text-[#262626] dark:text-[#f5f5f5] flex-shrink-0 transition disabled:opacity-40"
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <button
          onClick={() => imageRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] dark:bg-[#1a1a1a] flex items-center justify-center text-[#262626] dark:text-[#f5f5f5] flex-shrink-0 transition disabled:opacity-40"
          aria-label="Attach photo"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          value={body}
          onChange={(e) => { setBody(e.target.value); handleTyping(); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={uploading ? 'Uploading…' : 'Message…'}
          disabled={uploading}
          className="flex-1 ig-input py-2.5 text-sm rounded-full"
        />
        <button
          onClick={submit}
          disabled={(!body.trim() && !uploading) || busy || uploading}
          className="w-10 h-10 rounded-full bg-[#0095f6] hover:bg-[#1877f2] disabled:opacity-40 flex items-center justify-center text-white transition flex-shrink-0"
          aria-label="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
