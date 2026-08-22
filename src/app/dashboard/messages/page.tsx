'use client';

/**
 * CollabSync — General Chat Page (/dashboard/messages)
 *
 * Full-screen real-time chat UI.
 * Left panel:  channel / room list (general + team channels)
 * Right panel: active chat thread with socket.io real-time messaging
 *
 * Data flow:
 *   1. Load rooms from GET /api/room (excludes DMs)
 *   2. Select a room → GET /api/message/[roomId] for history
 *   3. socket.emit('room:join') to subscribe
 *   4. socket.emit('message:send') to send  (server persists → broadcasts)
 *   5. socket.on('message:new') to receive in real-time
 *   6. socket.on('message:typing') for typing indicator
 */

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useSocket } from '@/context/SocketContext';
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  Hash, Plus, Search, Send, Smile, Paperclip,
  MoreHorizontal, Users, ChevronDown, Circle,
  MessageSquare, Loader2, AlertCircle, RefreshCw,
  Wifi, WifiOff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  _id: string;
  name: string;
  description?: string;
  type: 'general' | 'team' | 'direct' | 'announcement';
  participantsId: string[];
  meta: {
    lastMessageAt?: string;
    isArchived?: boolean;
  };
}

interface MessageSender {
  _id: string;
  name: string;
  avatarUrl?: string;
}

interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: MessageSender | string;
  content: string;
  createdAt: string;
  editedAt?: string;
  attachments?: { url: string; filename: string; fileType: string; size: number }[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800 ${className}`} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white`}
      style={{
        width: `${size * 4}px`,
        height: `${size * 4}px`,
        background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)',
      }}
    >
      {initial}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  myId,
  prevMsg,
  isDark,
}: {
  msg: ChatMessage;
  myId: string;
  prevMsg: ChatMessage | null;
  isDark: boolean;
}) {
  const sender = typeof msg.senderId === 'object' ? msg.senderId : { _id: msg.senderId, name: 'Unknown' };
  const isMe = sender._id === myId;
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';

  // Group consecutive messages from same sender (show avatar/name only for first)
  const prevSenderId = prevMsg ? (typeof prevMsg.senderId === 'object' ? prevMsg.senderId._id : prevMsg.senderId) : null;
  const isGrouped = prevSenderId === sender._id;

  const time = new Date(msg.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
      {/* Avatar — only shown for first in group */}
      <div className="w-8 shrink-0">
        {!isGrouped && !isMe && <Avatar name={sender.name} size={8} />}
      </div>

      <div className={`flex max-w-[70%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Name + timestamp — only for first in group */}
        {!isGrouped && (
          <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-xs font-semibold">{isMe ? 'You' : sender.name}</span>
            <span className={`text-[10px] ${muted}`}>{time}</span>
          </div>
        )}

        {/* Bubble */}
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
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ date, isDark }: { date: string; isDark: boolean }) {
  const muted = isDark ? 'text-zinc-600' : 'text-zinc-400';
  const line = isDark ? 'border-zinc-800' : 'border-zinc-200';
  return (
    <div className={`relative my-6 flex items-center`}>
      <div className={`flex-1 border-t ${line}`} />
      <span className={`mx-3 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${muted} ${line} ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        {date}
      </span>
      <div className={`flex-1 border-t ${line}`} />
    </div>
  );
}

// ─── Channel Item ─────────────────────────────────────────────────────────────

function ChannelItem({
  room,
  isActive,
  isDark,
  onClick,
  unread,
}: {
  room: Room;
  isActive: boolean;
  isDark: boolean;
  onClick: () => void;
  unread?: number;
}) {
  const activeBg = isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900';
  const hoverBg = isDark ? 'hover:bg-zinc-800/60 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500';

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-all ${
        isActive ? activeBg : hoverBg
      }`}
    >
      <Hash className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-brand-blue' : 'opacity-60'}`} />
      <span className="flex-1 truncate">{room.name}</span>
      {(unread ?? 0) > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-green px-1 text-[9px] font-bold text-white">
          {unread}
        </span>
      )}
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  return (
    <div className={`flex flex-1 flex-col items-center justify-center gap-4 ${muted}`}>
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(46,125,197,0.12), rgba(74,191,106,0.12))' }}
      >
        <MessageSquare className="h-9 w-9 opacity-40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Select a channel to start chatting</p>
        <p className="mt-1 text-xs opacity-60">Your workspace conversations live here</p>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ names, isDark }: { names: string[]; isDark: boolean }) {
  if (names.length === 0) return null;
  const text = names.length === 1
    ? `${names[0]} is typing…`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing…`
    : `${names[0]} and ${names.length - 1} others are typing…`;

  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  return (
    <div className={`flex items-center gap-2 px-4 py-1.5 text-xs ${muted}`}>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brand-blue/60"
            style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <span>{text}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDate(messages: ChatMessage[]): { date: string; messages: ChatMessage[] }[] {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.date === label) {
      last.messages.push(msg);
    } else {
      groups.push({ date: label, messages: [msg] });
    }
  }
  return groups;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { socket, isConnected } = useSocket();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';
  const myId = (session?.user as any)?._id ?? (session?.user as any)?.id ?? '';

  // ── Rooms ─────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const res = await fetch('/api/room');
      const json = await res.json();
      if (json.success) {
        // Filter out DMs — show only general and team channels here
        const channels = (json.data as Room[]).filter(
          (r) => r.type !== 'direct' && r.type !== 'announcement'
        );
        setRooms(channels);
      } else {
        setRoomsError(json.message);
      }
    } catch {
      setRoomsError('Failed to load channels.');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (roomId: string, before?: string) => {
    setMsgLoading(true);
    try {
      const url = `/api/message/${roomId}${before ? `?before=${before}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        const fetched: ChatMessage[] = json.data ?? [];
        if (before) {
          setMessages((prev) => [...fetched, ...prev]);
        } else {
          setMessages(fetched);
        }
        setHasMore(json.hasMore ?? false);
      }
    } catch {
      // silently fail — messages are optional
    } finally {
      setMsgLoading(false);
    }
  }, []);

  const selectRoom = useCallback(
    async (room: Room) => {
      // Leave previous room
      if (activeRoom && socket) {
        socket.emit('room:leave', { roomId: activeRoom._id });
      }

      setActiveRoom(room);
      setMessages([]);
      setTypingUsers({});

      // Join socket room
      if (socket && isConnected) {
        socket.emit('room:join', { roomId: room._id });
      }

      await fetchMessages(room._id);
    },
    [activeRoom, socket, isConnected, fetchMessages]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId → name
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: ChatMessage) => {
      if (!activeRoom || msg.roomId !== activeRoom._id) return;
      setMessages((prev) => {
        // Deduplicate by _id
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Clear typing for sender
      const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[senderId];
        return next;
      });
    };

    const onTyping = ({ userId, userName, isTyping, roomId }: any) => {
      if (!activeRoom || roomId !== activeRoom._id || userId === myId) return;
      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
        // Auto-clear after 4s
        if (typingTimers.current[userId]) clearTimeout(typingTimers.current[userId]);
        typingTimers.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 4000);
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:typing', onTyping);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:typing', onTyping);
    };
  }, [socket, activeRoom, myId]);

  // Re-join room when socket reconnects
  useEffect(() => {
    if (isConnected && socket && activeRoom) {
      socket.emit('room:join', { roomId: activeRoom._id });
    }
  }, [isConnected, socket, activeRoom]);

  // ── Message input + send ──────────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const typingEmittedRef = useRef(false);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !activeRoom || !isConnected) return;
      socket.emit('message:typing', { roomId: activeRoom._id, isTyping });
    },
    [socket, activeRoom, isConnected]
  );

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (!typingEmittedRef.current && val.length > 0) {
      emitTyping(true);
      typingEmittedRef.current = true;
    }
    if (val.length === 0) {
      emitTyping(false);
      typingEmittedRef.current = false;
    }
    // Auto-stop typing after 3s of no keystroke
    if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    if (val.length > 0) {
      typingClearTimer.current = setTimeout(() => {
        emitTyping(false);
        typingEmittedRef.current = false;
      }, 3000);
    }
  };

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || !activeRoom || !myId) return;

    // Stop typing indicator
    emitTyping(false);
    typingEmittedRef.current = false;
    if (typingClearTimer.current) clearTimeout(typingClearTimer.current);

    // Optimistic UI — add temp message
    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      _id: tempId,
      roomId: activeRoom._id,
      senderId: { _id: myId, name: session?.user?.name ?? 'You' },
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setDraft('');
    setSending(true);

    if (socket && isConnected) {
      // Preferred path: emit via socket (server persists + broadcasts)
      socket.emit(
        'message:send',
        { roomId: activeRoom._id, content },
        (ack: { success: boolean; message?: ChatMessage }) => {
          setSending(false);
          if (ack?.success && ack.message) {
            // Replace temp message with real one
            setMessages((prev) =>
              prev.map((m) => (m._id === tempId ? ack.message! : m))
            );
          } else {
            // Remove temp if failed
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
          }
        }
      );
    } else {
      // Fallback: REST API
      try {
        const res = await fetch(`/api/message/${activeRoom._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: activeRoom._id,
            senderId: myId,
            content,
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? json.data : m))
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      } finally {
        setSending(false);
      }
    }

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [draft, activeRoom, myId, socket, isConnected, emitTyping, session]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Create Room modal ─────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  const createRoom = async () => {
    const name = newRoomName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: 'general',
          companyId: (session?.user as any)?.companyId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRooms((prev) => [json.data, ...prev]);
        setNewRoomName('');
        setShowCreate(false);
        selectRoom(json.data);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  // ── Load more (pagination) ────────────────────────────────────────────────
  const loadMore = async () => {
    if (!activeRoom || !hasMore || msgLoading) return;
    const oldest = messages[0];
    if (oldest) await fetchMessages(activeRoom._id, oldest._id);
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-zinc-950' : 'bg-white';
  const border = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const panel = isDark ? 'bg-zinc-900' : 'bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200';
  const headerBg = isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200';

  const typingNames = Object.values(typingUsers);
  const grouped = groupByDate(messages);

  if (!mounted) return null;

  return (
    <div className={`flex h-full ${bg}`}>
      {/* ── Left Panel — Channel List ──────────────────────────────────────── */}
      <aside className={`flex w-60 shrink-0 flex-col border-r ${border} ${panel}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-4 py-3.5 ${border}`}>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
            <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${muted}`}>
              Channels
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className={`rounded-lg p-1 transition hover:bg-brand-blue/10 hover:text-brand-blue ${muted}`}
            title="Create channel"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-2.5 pb-1.5">
          <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${inputBg}`}>
            <Search className={`h-3.5 w-3.5 shrink-0 ${muted}`} />
            <input
              type="text"
              placeholder="Find channel…"
              className={`w-full bg-transparent text-xs outline-none placeholder:${muted}`}
            />
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {roomsLoading ? (
            <div className="space-y-1">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3 flex-1 rounded" />
                </div>
              ))}
            </div>
          ) : roomsError ? (
            <div className={`px-2 py-4 text-center text-xs ${muted}`}>
              <AlertCircle className="mx-auto mb-2 h-5 w-5 opacity-40" />
              <p>{roomsError}</p>
              <button
                onClick={fetchRooms}
                className="mt-2 text-brand-blue hover:underline text-xs"
              >
                Retry
              </button>
            </div>
          ) : rooms.length === 0 ? (
            <div className={`px-2 py-8 text-center text-xs ${muted}`}>
              <Hash className="mx-auto mb-2 h-6 w-6 opacity-30" />
              <p>No channels yet.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-1.5 text-brand-blue hover:underline text-xs"
              >
                Create one
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {rooms.map((room) => (
                <ChannelItem
                  key={room._id}
                  room={room}
                  isActive={activeRoom?._id === room._id}
                  isDark={isDark}
                  onClick={() => selectRoom(room)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-1.5 border-t px-3 py-2 ${border}`}>
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3 text-brand-green" />
              <span className="text-[10px] text-brand-green">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className={`h-3 w-3 ${muted}`} />
              <span className={`text-[10px] ${muted}`}>Offline</span>
            </>
          )}
        </div>
      </aside>

      {/* ── Right Panel — Message Thread ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <>
            {/* Thread header */}
            <div className={`flex items-center justify-between border-b px-5 py-3 backdrop-blur-sm ${headerBg}`}>
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-brand-blue/10 p-1.5">
                  <Hash className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{activeRoom.name}</p>
                  {activeRoom.description && (
                    <p className={`text-xs ${muted}`}>{activeRoom.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${muted} ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <Users className="h-3.5 w-3.5" />
                  <span>{activeRoom.participantsId.length} members</span>
                </div>
                <button className={`rounded-lg p-1.5 transition hover:bg-brand-blue/10 hover:text-brand-blue ${muted}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-5 py-2"
            >
              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={loadMore}
                    disabled={msgLoading}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {msgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
                    Load earlier messages
                  </button>
                </div>
              )}

              {/* Messages loading */}
              {msgLoading && messages.length === 0 && (
                <div className="space-y-4 py-4">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className={`flex items-end gap-2.5 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className={`flex flex-col gap-1 ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-56' : 'w-40'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Welcome banner (empty channel) */}
              {!msgLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
                  >
                    <Hash className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold">Welcome to #{activeRoom.name}!</h3>
                  <p className={`mt-1 max-w-xs text-sm ${muted}`}>
                    This is the beginning of the <strong>#{activeRoom.name}</strong> channel.
                    {activeRoom.description ? ` ${activeRoom.description}` : ' Start the conversation below.'}
                  </p>
                </div>
              )}

              {/* Grouped messages */}
              {grouped.map(({ date, messages: dayMsgs }) => (
                <div key={date}>
                  <DateSeparator date={date} isDark={isDark} />
                  {dayMsgs.map((msg, idx) => (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      myId={myId}
                      prevMsg={idx > 0 ? dayMsgs[idx - 1] : null}
                      isDark={isDark}
                    />
                  ))}
                </div>
              ))}

              {/* Typing indicator */}
              <TypingIndicator names={typingNames} isDark={isDark} />

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className={`border-t px-4 py-3 ${border}`}>
              <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 transition-shadow focus-within:ring-2 focus-within:ring-brand-blue/30 ${inputBg}`}>
                <button className={`mb-1 rounded-lg p-1 transition hover:text-brand-blue ${muted}`}>
                  <Paperclip className="h-4 w-4" />
                </button>

                <textarea
                  ref={inputRef}
                  id="chat-message-input"
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeRoom.name}…`}
                  rows={1}
                  className={`max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:${muted} leading-relaxed`}
                  style={{ overflowY: draft.split('\n').length > 4 ? 'auto' : 'hidden' }}
                />

                <button className={`mb-1 rounded-lg p-1 transition hover:text-brand-green ${muted}`}>
                  <Smile className="h-4 w-4" />
                </button>

                <button
                  id="chat-send-button"
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className={`mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    draft.trim()
                      ? 'bg-brand-blue text-white hover:bg-brand-blue-dark'
                      : `${isDark ? 'bg-zinc-700' : 'bg-zinc-200'} ${muted} cursor-not-allowed`
                  }`}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className={`mt-1.5 text-[10px] ${muted}`}>
                <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">Enter</kbd> to send &nbsp;·&nbsp;
                <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        ) : (
          <EmptyState isDark={isDark} />
        )}
      </div>

      {/* ── Create Channel Modal ───────────────────────────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-brand-blue/10 p-2 text-brand-blue">
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Create Channel</h2>
                <p className={`text-xs ${muted}`}>Open to everyone in your company</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`mb-1 block text-xs font-medium ${muted}`}>Channel name</label>
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${inputBg}`}>
                  <Hash className={`h-3.5 w-3.5 ${muted}`} />
                  <input
                    id="create-room-name-input"
                    autoFocus
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                    placeholder="e.g. engineering, design"
                    className="flex-1 bg-transparent text-sm outline-none"
                    maxLength={40}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowCreate(false); setNewRoomName(''); }}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
                >
                  Cancel
                </button>
                <button
                  id="create-room-submit-button"
                  onClick={createRoom}
                  disabled={!newRoomName.trim() || creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Create Channel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bounce keyframes for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
