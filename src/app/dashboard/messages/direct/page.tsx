'use client';

/**
 * CollabSync — Direct Messages Page (/dashboard/messages/direct)
 *
 * DM interface: left panel = list of company members,
 * right panel = 1-on-1 chat thread with that member.
 *
 * DM room creation:
 *   - POST /api/room with type: "direct" and participantsId: [myId, otherUserId]
 *   - If a DM room already exists between those two users, return it
 */

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useSocket } from '@/context/SocketContext';
import { useEffect, useRef, useState, useCallback, type KeyboardEvent } from 'react';
import {
  AtSign, Search, Send, Loader2, MessageSquare,
  Circle, Wifi, WifiOff, Smile, ArrowLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  _id: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  meta?: { designation?: string };
}

interface Room {
  _id: string;
  name: string;
  type: string;
  participantsId: string[];
  meta: { lastMessageAt?: string };
}

interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: { _id: string; name: string; avatarUrl?: string } | string;
  content: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800 ${className}`} />;
}

function Avatar({ name, size = 8, isOnline }: { name: string; size?: number; isOnline?: boolean }) {
  return (
    <div className="relative shrink-0">
      <div
        className="flex items-center justify-center rounded-full text-xs font-bold text-white"
        style={{
          width: `${size * 4}px`,
          height: `${size * 4}px`,
          background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)',
        }}
      >
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${
            isOnline ? 'bg-brand-green' : 'bg-zinc-600'
          }`}
        />
      )}
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DirectMessagesPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { socket, isConnected } = useSocket();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';
  const myId = (session?.user as any)?._id ?? (session?.user as any)?.id ?? '';
  const myName = session?.user?.name ?? 'You';

  // ── Members ────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Try the user API first — it returns { users: [...] } for admins
        // or use the teams/members data available to all roles
        const res = await fetch('/api/user');
        const json = await res.json();
        // /api/user returns { users: [...] } format
        const list: Member[] = (json.users ?? json.data ?? []) as Member[];
        const others = list.filter((m) => m._id !== myId);
        setMembers(others);
      } catch { /* silent */ }
      finally { setMembersLoading(false); }
    };
    if (myId) fetchMembers();
  }, [myId]);


  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Active DM ─────────────────────────────────────────────────────────────
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openDM = useCallback(async (member: Member) => {
    if (activeMember?._id === member._id) return;

    // Leave previous room
    if (activeRoom && socket) {
      socket.emit('room:leave', { roomId: activeRoom._id });
    }

    setActiveMember(member);
    setMessages([]);
    setMsgLoading(true);
    setTypingUsers([]);

    try {
      // Check if DM room already exists
      const listRes = await fetch('/api/room?type=direct');
      const listJson = await listRes.json();
      let room: Room | null = null;

      if (listJson.success) {
        room = (listJson.data as Room[]).find((r) =>
          r.participantsId.includes(member._id) && r.participantsId.includes(myId)
        ) ?? null;
      }

      // Create DM room if it doesn't exist
      if (!room) {
        const createRes = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `dm-${[myId, member._id].sort().join('-')}`,
            type: 'direct',
            participantsId: [myId, member._id],
            companyId: (session?.user as any)?.companyId,
          }),
        });
        const createJson = await createRes.json();
        if (createJson.success) room = createJson.data;
      }

      if (!room) { setMsgLoading(false); return; }

      setActiveRoom(room);

      // Join socket room
      if (socket && isConnected) {
        socket.emit('room:join', { roomId: room._id });
      }

      // Load messages
      const msgRes = await fetch(`/api/message/${room._id}`);
      const msgJson = await msgRes.json();
      if (msgJson.success) setMessages(msgJson.data ?? []);

    } catch { /* silent */ }
    finally { setMsgLoading(false); }
  }, [activeMember, activeRoom, socket, isConnected, myId, session]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: ChatMessage) => {
      if (!activeRoom || msg.roomId !== activeRoom._id) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setTypingUsers([]);
    };

    const onTyping = ({ userId, userName, isTyping, roomId }: any) => {
      if (!activeRoom || roomId !== activeRoom._id || userId === myId) return;
      setTypingUsers(isTyping ? [userName] : []);
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:typing', onTyping);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:typing', onTyping);
    };
  }, [socket, activeRoom, myId]);

  // Re-join on reconnect
  useEffect(() => {
    if (isConnected && socket && activeRoom) {
      socket.emit('room:join', { roomId: activeRoom._id });
    }
  }, [isConnected, socket, activeRoom]);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingEmitted = useRef(false);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (!typingEmitted.current && val.length > 0 && socket && activeRoom) {
      socket.emit('message:typing', { roomId: activeRoom._id, isTyping: true });
      typingEmitted.current = true;
    }
    if (val.length === 0 && socket && activeRoom) {
      socket.emit('message:typing', { roomId: activeRoom._id, isTyping: false });
      typingEmitted.current = false;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (val.length > 0) {
      typingTimer.current = setTimeout(() => {
        if (socket && activeRoom) socket.emit('message:typing', { roomId: activeRoom._id, isTyping: false });
        typingEmitted.current = false;
      }, 3000);
    }
  };

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || !activeRoom || !myId) return;

    if (socket && activeRoom) socket.emit('message:typing', { roomId: activeRoom._id, isTyping: false });
    typingEmitted.current = false;

    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      _id: tempId,
      roomId: activeRoom._id,
      senderId: { _id: myId, name: myName },
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setDraft('');
    setSending(true);

    if (socket && isConnected) {
      socket.emit('message:send', { roomId: activeRoom._id, content }, (ack: any) => {
        setSending(false);
        if (ack?.success && ack.message) {
          setMessages((prev) => prev.map((m) => (m._id === tempId ? ack.message : m)));
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      });
    } else {
      try {
        const res = await fetch(`/api/message/${activeRoom._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: activeRoom._id, senderId: myId, content }),
        });
        const json = await res.json();
        if (json.success) {
          setMessages((prev) => prev.map((m) => (m._id === tempId ? json.data : m)));
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      } finally {
        setSending(false);
      }
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [draft, activeRoom, myId, myName, socket, isConnected]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-zinc-950' : 'bg-white';
  const border = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const panel = isDark ? 'bg-zinc-900' : 'bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200';
  const itemBg = isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-100';
  const activeItemBg = isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900';
  const headerBg = isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200';

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.date === label) last.msgs.push(msg);
    else grouped.push({ date: label, msgs: [msg] });
  }

  if (!mounted) return null;

  return (
    <div className={`flex h-full ${bg}`}>
      {/* ── Left Panel — People List ──────────────────────────────────────── */}
      <aside className={`flex w-60 shrink-0 flex-col border-r ${border} ${panel}`}>
        <div className={`flex items-center justify-between border-b px-4 py-3.5 ${border}`}>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
            <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${muted}`}>
              Direct Messages
            </p>
          </div>
        </div>

        <div className="px-3 pt-2.5 pb-1.5">
          <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${inputBg}`}>
            <Search className={`h-3.5 w-3.5 shrink-0 ${muted}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1.5">
          {membersLoading ? (
            <div className="space-y-1">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-2.5 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className={`py-8 text-center text-xs ${muted}`}>
              <AtSign className="mx-auto mb-2 h-5 w-5 opacity-30" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredMembers.map((member) => (
                <button
                  key={member._id}
                  onClick={() => openDM(member)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                    activeMember?._id === member._id ? activeItemBg : `${itemBg} text-zinc-400`
                  }`}
                >
                  <Avatar name={member.name} size={8} isOnline={member.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-inherit" style={{ color: 'inherit' }}>
                      {member.name}
                    </p>
                    <p className={`truncate text-[10px] ${muted}`}>
                      {member.isOnline ? 'Online' : member.meta?.designation ?? 'Offline'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1.5 border-t px-3 py-2 ${border}`}>
          {isConnected ? (
            <><Wifi className="h-3 w-3 text-brand-green" /><span className="text-[10px] text-brand-green">Connected</span></>
          ) : (
            <><WifiOff className={`h-3 w-3 ${muted}`} /><span className={`text-[10px] ${muted}`}>Offline</span></>
          )}
        </div>
      </aside>

      {/* ── Right Panel — DM Thread ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeMember ? (
          <>
            {/* Header */}
            <div className={`flex items-center gap-3 border-b px-5 py-3 backdrop-blur-sm ${headerBg}`}>
              <Avatar name={activeMember.name} size={9} isOnline={activeMember.isOnline} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{activeMember.name}</p>
                <p className={`text-xs ${muted}`}>
                  {activeMember.isOnline ? 'Online now' : activeMember.meta?.designation ?? 'Team member'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {msgLoading && messages.length === 0 && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-blue/40" />
                </div>
              )}

              {!msgLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
                  >
                    <AtSign className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold">
                    Start a conversation with{' '}
                    <span className="text-brand-blue">{activeMember.name}</span>
                  </h3>
                  <p className={`mt-1 text-xs ${muted}`}>This is the beginning of your direct message history.</p>
                </div>
              )}

              {grouped.map(({ date, msgs }) => (
                <div key={date}>
                  <div className={`relative my-5 flex items-center`}>
                    <div className={`flex-1 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
                    <span className={`mx-3 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${muted} ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
                      {date}
                    </span>
                    <div className={`flex-1 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
                  </div>

                  {msgs.map((msg, idx) => {
                    const sender = typeof msg.senderId === 'object' ? msg.senderId : { _id: msg.senderId, name: 'Unknown' };
                    const isMe = sender._id === myId;
                    const prevSenderId = idx > 0 ? (typeof msgs[idx - 1].senderId === 'object' ? (msgs[idx - 1].senderId as any)._id : msgs[idx - 1].senderId) : null;
                    const isGrouped = prevSenderId === sender._id;

                    return (
                      <div
                        key={msg._id}
                        className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}
                      >
                        <div className="w-8 shrink-0">
                          {!isGrouped && !isMe && <Avatar name={sender.name} size={8} />}
                        </div>
                        <div className={`flex max-w-[70%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isGrouped && (
                            <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-xs font-semibold">{isMe ? 'You' : sender.name}</span>
                              <span className={`text-[10px] ${muted}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                              isMe
                                ? 'rounded-br-sm text-white'
                                : isDark
                                ? 'rounded-bl-sm bg-zinc-800 text-zinc-100'
                                : 'rounded-bl-sm bg-zinc-100 text-zinc-800'
                            }`}
                            style={isMe ? { background: 'linear-gradient(135deg, #2E7DC5, #3B9A5A)' } : undefined}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {typingUsers.length > 0 && (
                <div className={`flex items-center gap-2 mt-3 text-xs ${muted}`}>
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-brand-blue/60"
                        style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span>{activeMember.name} is typing…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`border-t px-4 py-3 ${border}`}>
              <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-brand-blue/30 ${inputBg}`}>
                <textarea
                  ref={inputRef}
                  id="dm-message-input"
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeMember.name}…`}
                  rows={1}
                  className={`max-h-32 flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed placeholder:${muted}`}
                />
                <button className={`mb-1 rounded-lg p-1 transition hover:text-brand-green ${muted}`}>
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  id="dm-send-button"
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className={`mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    draft.trim()
                      ? 'bg-brand-blue text-white hover:bg-brand-blue-dark'
                      : `${isDark ? 'bg-zinc-700' : 'bg-zinc-200'} ${muted} cursor-not-allowed`
                  }`}
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className={`mt-1.5 text-[10px] ${muted}`}>
                <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">Enter</kbd> to send &nbsp;·&nbsp;
                <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        ) : (
          <div className={`flex flex-1 flex-col items-center justify-center gap-4 ${muted}`}>
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(46,125,197,0.12), rgba(74,191,106,0.12))' }}
            >
              <AtSign className="h-9 w-9 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Select someone to message</p>
              <p className="mt-1 text-xs opacity-60">Your private conversations live here</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
