'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, RefreshCw, AlertCircle, Filter,
  User, Users, CheckSquare, Trash2, Settings, Circle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
  _id: string;
  action: string;
  actorName: string;
  targetType: string;
  note: string;
  time: string;
}

// ─── Action → icon mapping ────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'Task created':            <CheckSquare className="h-4 w-4 text-brand-green" />,
  'Task updated':            <CheckSquare className="h-4 w-4 text-brand-blue" />,
  'Task completed':          <CheckSquare className="h-4 w-4 text-brand-green" />,
  'Task deleted':            <Trash2 className="h-4 w-4 text-red-400" />,
  'Member added':            <User className="h-4 w-4 text-brand-blue" />,
  'Member updated':          <User className="h-4 w-4 text-brand-blue" />,
  'Member removed':          <User className="h-4 w-4 text-red-400" />,
  'Team created':            <Users className="h-4 w-4 text-brand-green" />,
  'Team updated':            <Users className="h-4 w-4 text-brand-blue" />,
  'Team deleted':            <Trash2 className="h-4 w-4 text-red-400" />,
  'Company settings updated': <Settings className="h-4 w-4 text-brand-blue" />,
};

const TARGET_BADGE: Record<string, string> = {
  task:    'bg-brand-blue/10 text-brand-blue',
  team:    'bg-brand-green/10 text-brand-green',
  user:    'bg-zinc-500/10 text-zinc-400',
  company: 'bg-amber-500/10 text-amber-400',
  room:    'bg-purple-500/10 text-purple-400',
  message: 'bg-pink-500/10 text-pink-400',
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTarget, setFilterTarget] = useState<string>('all');

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return; }
    if (status === 'authenticated' && role !== 'admin') { router.push('/dashboard'); }
  }, [status, role, router]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/activity');
      const data = await res.json();
      setLogs(data.activity ?? []);
    } catch {
      setError('Failed to load audit log. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchLogs();
  }, [status, fetchLogs]);

  const filtered = filterTarget === 'all'
    ? logs
    : logs.filter((l) => l.targetType === filterTarget);

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-800/70 text-zinc-100 focus:ring-brand-blue'
    : 'border-zinc-300 bg-white text-zinc-900 focus:ring-brand-blue';

  if (!mounted || status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className="text-brand-blue">Admin</span> · Audit
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Audit Log</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            id="select-audit-filter"
            className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputBase}`}
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="team">Teams</option>
            <option value="user">Members</option>
            <option value="company">Company</option>
          </select>
          <button
            onClick={fetchLogs}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${panel} hover:border-brand-blue/40`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Timeline ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 ${panel}`}>
          <div className="rounded-2xl bg-brand-blue/10 p-4 text-brand-blue">
            <ClipboardList className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-semibold">No audit entries</p>
          <p className={`mt-1 text-sm ${muted}`}>Activity will appear here as actions are taken.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[27px] top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(180deg, #2E7DC5 0%, #4ABF6A 100%)', opacity: 0.25 }}
          />

          {filtered.map((log, i) => (
            <div key={log._id} className="relative flex gap-4 pb-4">
              {/* Icon dot */}
              <div className={`relative z-10 flex h-14 w-14 shrink-0 flex-col items-center`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                  {ACTION_ICONS[log.action] ?? <Circle className={`h-4 w-4 ${muted}`} />}
                </div>
              </div>

              {/* Card */}
              <div className={`flex-1 rounded-2xl border p-4 transition-shadow hover:shadow-sm ${panel}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{log.action}</p>
                    <p className={`mt-0.5 text-xs ${muted}`}>
                      by <span className="font-medium">{log.actorName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${TARGET_BADGE[log.targetType] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                      {log.targetType}
                    </span>
                    <span className={`text-[10px] ${muted}`}>{log.time}</span>
                  </div>
                </div>
                {log.note && (
                  <p className={`mt-2 text-xs leading-relaxed ${muted}`}>{log.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Count footer ───────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <p className={`text-center text-xs ${muted}`}>
          Showing {filtered.length} of {logs.length} recent entries
        </p>
      )}
    </div>
  );
}
