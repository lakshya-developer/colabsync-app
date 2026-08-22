'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart2, TrendingUp, Target, CheckCircle,
  AlertCircle, RefreshCw, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamHealth {
  _id: string;
  name: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
}

interface TaskItem {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueLabel: string;
  isOverdue: boolean;
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

function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-zinc-400 truncate">{label}</span>
          <span className="ml-2 shrink-0 font-medium">{value}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
        />
      </div>
    </div>
  );
}

const PRIORITY_CHIP: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400',
  high:     'bg-orange-500/10 text-orange-400',
  medium:   'bg-amber-500/10 text-amber-400',
  low:      'bg-zinc-500/10 text-zinc-400',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [teams, setTeams] = useState<TeamHealth[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return; }
    if (status === 'authenticated' && role !== 'manager') { router.push('/dashboard'); }
  }, [status, role, router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [teamsRes, tasksRes] = await Promise.all([
        fetch('/api/dashboard/teams'),
        fetch('/api/dashboard/tasks'),
      ]);
      const [teamsData, tasksData] = await Promise.all([teamsRes.json(), tasksRes.json()]);
      setTeams(teamsData.teams ?? []);
      setTasks(tasksData.tasks ?? []);
    } catch {
      setError('Failed to load reports. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const totalTasks     = tasks.length;
  const overdueTasks   = tasks.filter((t) => t.isOverdue).length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgress     = tasks.filter((t) => t.status === 'in_progress').length;

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';

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
            <span className="text-brand-green">Manager</span> · Reports
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Team Reports</h1>
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

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Tasks"  value={totalTasks}    sub="in your team"  accent="blue"  icon={Target}       isDark={isDark} />
          <StatCard label="In Progress"  value={inProgress}    sub="active now"    accent="blue"  icon={TrendingUp}   isDark={isDark} />
          <StatCard label="Completed"    value={completedTasks} sub="this period"  accent="green" icon={CheckCircle}  isDark={isDark} />
          <StatCard label="Overdue"      value={overdueTasks}  sub="need attention" accent="green" icon={Clock}       isDark={isDark} />
        </div>
      )}

      {/* ── Team health ────────────────────────────────────────────────────── */}
      {!isLoading && teams.length > 0 && (
        <div className={`rounded-2xl border p-5 ${panel}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-xl bg-brand-blue/10 p-1.5 text-brand-blue">
              <BarChart2 className="h-4 w-4" />
            </div>
            <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>Team Health</p>
          </div>
          <div className="space-y-4">
            {teams.map((t) => (
              <Progress key={t._id} value={t.completionPct} label={t.name} />
            ))}
          </div>
        </div>
      )}

      {/* ── Task breakdown ─────────────────────────────────────────────────── */}
      {!isLoading && tasks.length > 0 && (
        <div className={`rounded-2xl border p-5 ${panel}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-xl bg-brand-green/10 p-1.5 text-brand-green">
              <Target className="h-4 w-4" />
            </div>
            <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>Task Breakdown</p>
          </div>

          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t._id}
                className={`flex items-center gap-3 rounded-xl p-3 transition ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-100'}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    t.status === 'completed'  ? 'bg-brand-green' :
                    t.isOverdue               ? 'bg-red-400'     :
                    t.status === 'in_progress'? 'bg-brand-blue'  :
                    'bg-zinc-500'
                  }`}
                />
                <span className="flex-1 truncate text-sm">{t.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${PRIORITY_CHIP[t.priority] ?? PRIORITY_CHIP.low}`}>
                  {t.priority}
                </span>
                <span className={`text-xs ${t.isOverdue ? 'text-red-400' : muted}`}>
                  {t.dueLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 ${panel}`}>
          <div className="rounded-2xl bg-brand-blue/10 p-4 text-brand-blue">
            <BarChart2 className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-semibold">No report data</p>
          <p className={`mt-1 text-sm ${muted}`}>Tasks will appear here once your team has assigned work.</p>
        </div>
      )}
    </div>
  );
}
