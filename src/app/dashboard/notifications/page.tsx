'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  Bell, CheckCircle2, Circle, AlertCircle,
  CheckSquare, Users, Briefcase, RefreshCw,
  MessageSquare, Settings, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  time: string;
}

// ─── Notification type → icon ─────────────────────────────────────────────────

function NotifIcon({ type, isRead }: { type: string; isRead: boolean }) {
  const base = `h-4 w-4 ${isRead ? 'text-zinc-400' : ''}`;
  const icon = (() => {
    if (type.startsWith('task'))    return <CheckSquare className={base || 'h-4 w-4 text-brand-blue'} />;
    if (type.startsWith('team'))    return <Users className={base || 'h-4 w-4 text-brand-green'} />;
    if (type === 'message')         return <MessageSquare className={base || 'h-4 w-4 text-purple-400'} />;
    if (type === 'company_announcement') return <Briefcase className={base || 'h-4 w-4 text-amber-400'} />;
    return <Bell className={base || 'h-4 w-4 text-zinc-400'} />;
  })();

  const bgMap: Record<string, string> = {
    task_assigned:        'bg-brand-blue/10',
    task_updated:         'bg-brand-blue/10',
    task_completed:       'bg-brand-green/10',
    team_update:          'bg-brand-green/10',
    team_member_added:    'bg-brand-green/10',
    company_announcement: 'bg-amber-500/10',
    message:              'bg-purple-500/10',
    system:               'bg-zinc-500/10',
  };

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bgMap[type] ?? 'bg-zinc-500/10'}`}>
      {icon}
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const { socket } = useSocket();

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/sign-in');
  }, [status, router]);

  // ── Real-time socket events ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // New notification arrives → prepend and bump unread count
    const onNew = (notif: { _id: string; type: string; title: string; body: string; time: string }) => {
      setNotifs((prev) => [{ ...notif, isRead: false }, ...prev]);
      setUnread((n) => n + 1);
    };

    // Notification marked read on another device → update locally
    const onRead = (data: { notificationId: string }) => {
      setNotifs((prev) =>
        prev.map((n) => (n._id === data.notificationId ? { ...n, isRead: true } : n))
      );
      setUnread((n) => Math.max(0, n - 1));
    };

    socket.on('notification:new', onNew);
    socket.on('notification:read', onRead);

    return () => {
      socket.off('notification:new', onNew);
      socket.off('notification:read', onRead);
    };
  }, [socket]);

  const fetchNotifs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/notifications');
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      setError('Failed to load notifications. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchNotifs();
  }, [status, fetchNotifs]);

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch('/api/dashboard/notifications', { method: 'PATCH' });
      fetchNotifs();
    } finally {
      setMarking(false);
    }
  }

  const filtered = filterUnread ? notifs.filter((n) => !n.isRead) : notifs;

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';

  if (!mounted || status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className="text-brand-blue">Workspace</span> · Notifications
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Notifications
            {unread > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full bg-brand-blue px-2 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterUnread((v) => !v)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              filterUnread
                ? 'border-brand-blue/40 bg-brand-blue/10 text-brand-blue'
                : `${panel} hover:border-brand-blue/40`
            }`}
          >
            {filterUnread ? 'Show All' : 'Unread Only'}
          </button>
          {unread > 0 && (
            <button
              id="btn-mark-all-read"
              onClick={markAllRead}
              disabled={marking}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${panel} hover:border-brand-green/40`}
            >
              {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark All Read
            </button>
          )}
          <button
            onClick={fetchNotifs}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${panel} hover:border-brand-blue/40`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-2xl border p-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-2.5 w-64" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 ${panel}`}>
          <div className="rounded-2xl bg-brand-blue/10 p-4 text-brand-blue">
            <Bell className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-semibold">
            {filterUnread ? 'No unread notifications' : 'All caught up!'}
          </p>
          <p className={`mt-1 text-sm ${muted}`}>
            {filterUnread ? 'Toggle filter to see all.' : 'Notifications will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n._id}
              className={`flex items-start gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-sm ${
                n.isRead ? panel : isDark
                  ? 'border-brand-blue/20 bg-brand-blue/5'
                  : 'border-brand-blue/20 bg-brand-blue/5'
              }`}
            >
              <NotifIcon type={n.type} isRead={n.isRead} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${n.isRead ? muted : ''}`}>{n.title}</p>
                  <span className={`shrink-0 text-[10px] ${muted}`}>{n.time}</span>
                </div>
                {n.body && <p className={`mt-0.5 text-xs leading-relaxed ${muted}`}>{n.body}</p>}
              </div>
              {!n.isRead && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-blue" />
              )}
            </div>
          ))}
        </div>
      )}

      {notifs.length > 0 && (
        <p className={`text-center text-xs ${muted}`}>
          {unread === 0 ? 'All notifications are read' : `${unread} unread · ${notifs.length} total`}
        </p>
      )}
    </div>
  );
}
