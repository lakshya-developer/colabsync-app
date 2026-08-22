'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  Users, CheckCircle, AlertCircle, Circle,
  RefreshCw, TrendingUp, BarChart2, Target,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamInfo {
  _id: string;
  name: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
}

interface MemberInfo {
  _id: string;
  name: string;
  designation: string;
  isOnline: boolean;
  activeTasks: number;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function StatCard({
  label, value, sub, accent, icon: Icon, isDark,
}: {
  label: string; value: string | number; sub?: string;
  accent: 'blue' | 'green'; icon: React.ElementType; isDark: boolean;
}) {
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const iconBg = accent === 'blue' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-green/10 text-brand-green';
  return (
    <div className={`rounded-2xl border p-5 ${panel}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {sub && <p className={`mt-1 text-xs ${muted}`}>{sub}</p>}
        </div>
        <div className={`rounded-xl p-2 ${iconBg}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return; }
    if (status === 'authenticated' && role !== 'manager') { router.push('/dashboard'); }
  }, [status, role, router]);

  // ── Real-time presence ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onOnline = (data: { _id: string }) => {
      setMembers((prev) =>
        prev.map((m) => (m._id === data._id ? { ...m, isOnline: true } : m))
      );
    };

    const onOffline = (data: { _id: string }) => {
      setMembers((prev) =>
        prev.map((m) => (m._id === data._id ? { ...m, isOnline: false } : m))
      );
    };

    socket.on('presence:online', onOnline);
    socket.on('presence:offline', onOffline);

    return () => {
      socket.off('presence:online', onOnline);
      socket.off('presence:offline', onOffline);
    };
  }, [socket]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/teams');
      const data = await res.json();
      setTeam(data.teams?.[0] ?? null);
      setMembers(data.members ?? []);
    } catch {
      setError('Failed to load team data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const hdr   = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200';

  if (!mounted || status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className="text-brand-green">Manager</span> · My Team
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {team ? team.name : 'My Team'}
          </h1>
        </div>
        <button
          onClick={fetchData}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${panel} hover:border-brand-blue/40`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!isLoading && !team && (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 ${panel}`}>
          <div className="rounded-2xl bg-brand-green/10 p-4 text-brand-green">
            <Users className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-semibold">No team assigned</p>
          <p className={`mt-1 text-sm ${muted}`}>An admin hasn't assigned you to manage a team yet.</p>
        </div>
      )}

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : team && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Team Size"      value={team.memberCount}    accent="blue"  icon={Users}        isDark={isDark} />
            <StatCard label="Total Tasks"    value={team.totalTasks}     accent="blue"  icon={Target}       isDark={isDark} />
            <StatCard label="Completed"      value={team.completedTasks} accent="green" icon={CheckCircle}  isDark={isDark} />
            <StatCard label="Completion"     value={`${team.completionPct}%`} accent="green" icon={TrendingUp} isDark={isDark} />
          </div>

          {/* ── Progress overview ─────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-5 ${panel}`}>
            <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>Team Progress</p>
            <div className="mt-3">
              <div className={`mb-1.5 flex items-center justify-between text-sm ${muted}`}>
                <span>Overall Completion</span>
                <span className="font-semibold">{team.completionPct}%</span>
              </div>
              <Progress value={team.completionPct} />
            </div>
          </div>

          {/* ── Member list ───────────────────────────────────────────────── */}
          <div className={`overflow-hidden rounded-2xl border ${panel}`}>
            <div className={`border-b px-5 py-3 ${hdr}`}>
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${muted}`} />
                <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>Team Members</p>
                <span className="ml-auto flex h-5 items-center justify-center rounded-full bg-brand-green/10 px-2 text-[10px] font-medium text-brand-green">
                  {members.length}
                </span>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Users className={`h-6 w-6 ${muted}`} />
                <p className={`mt-2 text-sm ${muted}`}>No members assigned to this team yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {members.map((m) => (
                  <div key={m._id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    {/* Avatar */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{m.name}</p>
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.isOnline ? 'bg-brand-green' : 'bg-zinc-500'}`}
                          title={m.isOnline ? 'Online' : 'Offline'}
                        />
                      </div>
                      <p className={`truncate text-xs ${muted}`}>{m.designation || 'No designation'}</p>
                    </div>

                    {/* Active tasks pill */}
                    <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${m.activeTasks > 0 ? 'bg-brand-blue/10 text-brand-blue' : 'bg-zinc-500/10 text-zinc-400'}`}>
                      {m.activeTasks} active task{m.activeTasks !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
