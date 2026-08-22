'use client';

/**
 * CollabSync — Announcements Channel (/dashboard/messages/announcements)
 *
 * Company-wide announcement broadcast.
 * - Admins/Managers: can compose and post announcements
 * - Employees: read-only
 *
 * Uses the "announcement" room type. One announcement room per company,
 * auto-seeded on first visit by admin.
 */

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useSocket } from '@/context/SocketContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Megaphone, Send, Loader2, Pin, Wifi, WifiOff,
  Shield, Users, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  _id: string;
  name: string;
  type: string;
  participantsId: string[];
}

interface AnnouncementMessage {
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

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AnnouncementCard({
  msg,
  isDark,
}: {
  msg: AnnouncementMessage;
  isDark: boolean;
}) {
  const sender = typeof msg.senderId === 'object' ? msg.senderId : { _id: msg.senderId, name: 'Admin' };
  const initial = sender.name?.charAt(0)?.toUpperCase() ?? 'A';
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`rounded-2xl border p-5 transition-shadow hover:shadow-sm ${panel}`}>
      <div className="flex items-start gap-3">
        {/* Sender avatar */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{sender.name}</p>
            {/* Admin badge */}
            <span className="flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue">
              <Shield className="h-2.5 w-2.5" />
              Admin
            </span>
            <span className={`ml-auto shrink-0 text-[10px] ${muted}`}>{formatRelative(msg.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AnnouncementsChannelPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { socket, isConnected } = useSocket();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';
  const myId = (session?.user as any)?._id ?? (session?.user as any)?.id ?? '';
  const role = (session?.user as any)?.role ?? 'employee';
  const canPost = role === 'admin' || role === 'manager';

  // ── Room ──────────────────────────────────────────────────────────────────
  const [room, setRoom] = useState<Room | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/room?type=announcement');
        const json = await res.json();

        if (json.success && json.data?.length > 0) {
          setRoom(json.data[0]);
        } else if (canPost) {
          // Admin/manager: auto-create the announcement room
          const createRes = await fetch('/api/room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'announcements',
              description: 'Company-wide announcements',
              type: 'announcement',
              companyId: (session?.user as any)?.companyId,
            }),
          });
          const createJson = await createRes.json();
          if (createJson.success) setRoom(createJson.data);
        }
      } catch { /* silent */ }
      finally { setRoomLoading(false); }
    };
    if (myId) init();
  }, [myId, canPost, session]);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room) return;
    const fetchMsgs = async () => {
      setMsgLoading(true);
      try {
        const res = await fetch(`/api/message/${room._id}`);
        const json = await res.json();
        if (json.success) {
          setMessages(json.data ?? []);
          setHasMore(json.hasMore ?? false);
        }
      } catch { /* silent */ }
      finally { setMsgLoading(false); }
    };
    fetchMsgs();
  }, [room]);

  // Socket join + live events
  useEffect(() => {
    if (!socket || !room) return;
    if (isConnected) socket.emit('room:join', { roomId: room._id });

    const onNew = (msg: AnnouncementMessage) => {
      if (msg.roomId !== room._id) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('message:new', onNew);
    return () => { socket.off('message:new', onNew); };
  }, [socket, room, isConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (!room || !hasMore || msgLoading) return;
    setMsgLoading(true);
    try {
      const oldest = messages[0];
      const res = await fetch(`/api/message/${room._id}?before=${oldest._id}`);
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...(json.data ?? []), ...prev]);
        setHasMore(json.hasMore ?? false);
      }
    } catch { /* silent */ }
    finally { setMsgLoading(false); }
  };

  // ── Compose ───────────────────────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const post = useCallback(async () => {
    const content = draft.trim();
    if (!content || !room || !myId) return;
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const tempMsg: AnnouncementMessage = {
      _id: tempId,
      roomId: room._id,
      senderId: { _id: myId, name: session?.user?.name ?? 'Admin' },
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setDraft('');

    if (socket && isConnected) {
      socket.emit('message:send', { roomId: room._id, content }, (ack: any) => {
        setSending(false);
        if (ack?.success && ack.message) {
          setMessages((prev) => prev.map((m) => (m._id === tempId ? ack.message : m)));
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      });
    } else {
      try {
        const res = await fetch(`/api/message/${room._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room._id, senderId: myId, content }),
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
  }, [draft, room, myId, socket, isConnected, session]);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-zinc-950' : 'bg-white';
  const border = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200';
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';

  if (!mounted) return null;

  return (
    <div className={`flex h-full flex-col ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-6 py-4 ${border}`}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          >
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
              <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${muted}`}>
                Channel
              </p>
            </div>
            <h1 className="text-base font-semibold leading-tight">#announcements</h1>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${muted} ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          {isConnected ? (
            <><Wifi className="h-3 w-3 text-brand-green" /><span className="text-brand-green">Live</span></>
          ) : (
            <><WifiOff className="h-3 w-3" /><span>Offline</span></>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pb-4">
            <button
              onClick={loadMore}
              disabled={msgLoading}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              {msgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
              Load earlier
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {(roomLoading || msgLoading) && messages.length === 0 && (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${panel}`}>
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state (no announcements yet) */}
        {!roomLoading && !msgLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
            >
              <Megaphone className="h-10 w-10 text-white" />
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
            </div>
            <h2 className="text-lg font-semibold">
              <span className="text-brand-blue">No</span>{' '}
              <span className="text-brand-green">announcements yet</span>
            </h2>
            <p className={`mt-2 max-w-sm text-sm leading-relaxed ${muted}`}>
              {canPost
                ? 'Use the compose box below to broadcast a message to your entire organization.'
                : 'Your admin will post important company-wide messages here.'}
            </p>
            {!canPost && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3">
                <Users className="h-4 w-4 text-brand-blue" />
                <p className="text-xs text-brand-blue">You'll be notified when new announcements arrive</p>
              </div>
            )}
          </div>
        )}

        {/* Announcement feed */}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((msg) => (
              <AnnouncementCard key={msg._id} msg={msg} isDark={isDark} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Compose box — only for admin/manager */}
      {canPost && (
        <div className={`border-t px-6 py-4 ${border}`}>
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg bg-brand-blue/10 p-1.5 text-brand-blue">
                <Megaphone className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-semibold">Broadcast to all members</p>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] text-brand-green">
                <Shield className="h-2.5 w-2.5" />
                {role === 'admin' ? 'Admin' : 'Manager'}
              </span>
            </div>

            <textarea
              ref={inputRef}
              id="announcement-compose-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); post(); }
              }}
              placeholder="Write an announcement for your entire organization…"
              rows={3}
              className={`w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none placeholder:${muted} focus:ring-2 focus:ring-brand-blue/30 leading-relaxed ${inputBg}`}
            />

            <div className="mt-3 flex items-center justify-between">
              <p className={`text-[10px] ${muted}`}>
                <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">Ctrl+Enter</kbd> to post
              </p>
              <button
                id="announcement-post-button"
                onClick={post}
                disabled={!draft.trim() || sending}
                className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only notice for employees */}
      {!canPost && (
        <div className={`border-t px-6 py-3 ${border}`}>
          <div className={`flex items-center gap-2 text-xs ${muted}`}>
            <Megaphone className="h-3.5 w-3.5 shrink-0" />
            <span>This channel is read-only. Only admins and managers can post announcements.</span>
          </div>
        </div>
      )}
    </div>
  );
}
