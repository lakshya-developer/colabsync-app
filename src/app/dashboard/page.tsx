'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useDashboard } from '@/hooks/useDashboard';
import type { DashboardStats, ActivityItem, TeamHealth, TeamMember, TaskItem, NotificationItem } from '@/hooks/useDashboard';
import {
  Users, CheckSquare, TrendingUp, Clock, AlertCircle,
  MessageSquare, Briefcase, Calendar, ArrowRight,
  Activity, Target, Star, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function StatSkeleton({ isDark }: { isDark: boolean }) {
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  return (
    <div className={`rounded-2xl border p-5 ${panel}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

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
    <div className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${panel}`}>
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

function ProgressBar({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const track = isDark ? 'bg-zinc-800' : 'bg-zinc-200';
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className={`truncate ${muted}`}>{label}</span>
          <span className="ml-2 shrink-0 font-medium">{value}%</span>
        </div>
      )}
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${track}`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
        />
      </div>
    </div>
  );
}

function SectionCard({ title, children, isDark, action }: {
  title: string; children: React.ReactNode; isDark: boolean; action?: React.ReactNode;
}) {
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  return (
    <div className={`rounded-2xl border p-5 ${panel}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium hover:bg-red-500/10 transition">
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────

function AdminView({
  isDark, company, stats, activity, teams, isLoading,
}: {
  isDark: boolean;
  company: { name: string } | null;
  stats: DashboardStats | null;
  activity: ActivityItem[];
  teams: TeamHealth[];
  isLoading: boolean;
}) {
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const itemBg = isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-white';

  const statCards = [
    { label: 'Total Members',  value: stats?.totalMembers ?? 0,       sub: 'In your company',       accent: 'blue'  as const, icon: Users },
    { label: 'Active Tasks',   value: stats?.activeTasks ?? 0,        sub: 'Not yet completed',     accent: 'green' as const, icon: CheckSquare },
    { label: 'Teams',          value: stats?.teamsCount ?? 0,         sub: 'Active departments',    accent: 'blue'  as const, icon: Briefcase },
    { label: 'Online Now',     value: stats?.onlineMembersCount ?? 0, sub: 'Currently active',      accent: 'green' as const, icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
          <span className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>Admin Dashboard</span>
        </div>
        <h2 className="text-2xl font-semibold">
          {company?.name ?? 'Your Company'} — <span className="text-brand-blue">Workspace</span>
        </h2>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} isDark={isDark} />)
          : statCards.map((s) => <StatCard key={s.label} {...s} isDark={isDark} />)
        }
      </div>

      {/* Teams + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Team health */}
        <SectionCard title="Team Health" isDark={isDark}>
          {isLoading ? (
            <div className="space-y-5">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-8" /></div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : teams.length === 0 ? (
            <p className={`text-sm ${muted}`}>No teams found. Create your first team to see health data.</p>
          ) : (
            <div className="space-y-5">
              {teams.map((t) => (
                <div key={t._id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className={`text-xs ${muted}`}>{t.memberCount} members</span>
                    </div>
                  </div>
                  <ProgressBar label="" value={t.completionPct} isDark={isDark} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Activity feed */}
        <SectionCard title="Recent Activity" isDark={isDark}>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className={`flex gap-3 rounded-xl border p-3 ${itemBg}`}>
                  <Skeleton className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className={`text-sm ${muted}`}>No recent activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={a._id} className={`flex gap-3 rounded-xl border p-3 ${itemBg}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i % 2 === 0 ? 'bg-brand-blue' : 'bg-brand-green'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className={`text-xs ${muted}`}>{a.actorName}{a.note ? ` · ${a.note}` : ''}</p>
                  </div>
                  <span className={`ml-auto shrink-0 text-xs ${muted}`}>{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Manager View ──────────────────────────────────────────────────────────────

function ManagerView({
  isDark, stats, teams, members, tasks, isLoading,
}: {
  isDark: boolean;
  stats: DashboardStats | null;
  teams: TeamHealth[];
  members: TeamMember[];
  tasks: TaskItem[];
  isLoading: boolean;
}) {
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const itemBg = isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-white';
  const team = teams[0] ?? null;

  const statCards = [
    { label: 'Team Size',           value: stats?.teamSize ?? 0,                sub: 'Active members',    accent: 'blue'  as const, icon: Users },
    { label: 'Tasks Assigned',      value: stats?.tasksAssigned ?? 0,           sub: 'This sprint',       accent: 'green' as const, icon: CheckSquare },
    { label: 'Completed This Week', value: stats?.tasksCompletedThisWeek ?? 0,  sub: 'Great progress',    accent: 'blue'  as const, icon: TrendingUp },
    { label: 'Overdue',             value: stats?.overdueCount ?? 0,            sub: 'Needs attention',   accent: 'green' as const, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
          <span className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>Manager Dashboard</span>
        </div>
        <h2 className="text-2xl font-semibold">
          <span className="text-brand-green">{stats?.teamName ?? 'My Team'}</span> Overview
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} isDark={isDark} />)
          : statCards.map((s) => <StatCard key={s.label} {...s} isDark={isDark} />)
        }
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">

        {/* Team completion */}
        <SectionCard title="Task Completion" isDark={isDark}>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-2 w-full" /></div>
          ) : team ? (
            <div className="space-y-4">
              <ProgressBar label={`${team.name} — overall`} value={team.completionPct} isDark={isDark} />
              <div className={`flex items-center justify-between rounded-xl border p-3 text-sm ${itemBg}`}>
                <span className={muted}>Total tasks</span>
                <span className="font-semibold">{team.totalTasks}</span>
              </div>
              <div className={`flex items-center justify-between rounded-xl border p-3 text-sm ${itemBg}`}>
                <span className={muted}>Completed</span>
                <span className="font-semibold text-brand-green">{team.completedTasks}</span>
              </div>
              <div className={`flex items-center justify-between rounded-xl border p-3 text-sm ${itemBg}`}>
                <span className={muted}>Remaining</span>
                <span className="font-semibold text-brand-blue">{team.totalTasks - team.completedTasks}</span>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${muted}`}>No team assigned yet.</p>
          )}
        </SectionCard>

        {/* Member list */}
        <SectionCard title="Team Members" isDark={isDark}>
          {isLoading ? (
            <div className="space-y-2">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${itemBg}`}>
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className={`text-sm ${muted}`}>No members in your team yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m._id} className={`flex items-center gap-3 rounded-xl border p-3 ${itemBg}`}>
                  <div className="relative">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <span
                      className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                        isDark ? 'border-zinc-950' : 'border-white'
                      } ${m.isOnline ? 'bg-brand-green' : 'bg-zinc-400'}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className={`text-xs truncate ${muted}`}>{m.designation || 'Team Member'}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${muted}`}>{m.activeTasks} tasks</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Employee View ─────────────────────────────────────────────────────────────

function EmployeeView({
  isDark, session, stats, tasks, notifications, unreadCount, isLoading,
}: {
  isDark: boolean;
  session: any;
  stats: DashboardStats | null;
  tasks: TaskItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
}) {
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const itemBg = isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-white';

  const statCards = [
    { label: 'Due Today',      value: stats?.dueToday ?? 0,          sub: 'Action needed',   accent: 'blue'  as const, icon: Clock },
    { label: 'Overdue',        value: stats?.overdue ?? 0,           sub: 'Past due date',   accent: 'green' as const, icon: AlertCircle },
    { label: 'Completed',      value: stats?.completedThisWeek ?? 0, sub: 'This week',       accent: 'blue'  as const, icon: CheckSquare },
    { label: 'In Progress',    value: stats?.inProgress ?? 0,        sub: 'Active tasks',    accent: 'green' as const, icon: Activity },
  ];

  const priorityColor: Record<string, string> = {
    high: 'text-red-400', medium: 'text-amber-400', low: 'text-zinc-400',
  };

  const notifIcon: Record<string, string> = {
    task_assigned: 'bg-brand-blue',
    task_completed: 'bg-brand-green',
    company_announcement: 'bg-brand-blue',
    message: 'bg-brand-green',
  };

  const quickActions = [
    { label: 'New Message',    icon: MessageSquare, href: '/dashboard/messages',      accent: 'blue'  },
    { label: 'View Schedule',  icon: Calendar,      href: '/dashboard/schedule',      accent: 'green' },
    { label: 'My Tasks',       icon: Target,        href: '/dashboard/tasks',         accent: 'blue'  },
    { label: 'Announcements',  icon: Activity,      href: '/dashboard/announcements', accent: 'green' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
          <span className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>My Workspace</span>
        </div>
        <h2 className="text-2xl font-semibold">
          Welcome back, <span className="text-brand-blue">{session?.user?.name?.split(' ')[0] ?? 'there'}</span> 👋
        </h2>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} isDark={isDark} />)
          : statCards.map((s) => <StatCard key={s.label} {...s} isDark={isDark} />)
        }
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((a) => {
          const Icon = a.icon;
          const iconClass = a.accent === 'blue' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-green/10 text-brand-green';
          return (
            <a key={a.label} href={a.href}
              className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:shadow-sm ${itemBg}`}
            >
              <div className={`rounded-xl p-2.5 ${iconClass}`}><Icon className="h-5 w-5" /></div>
              <span className="text-sm font-medium">{a.label}</span>
              <ArrowRight className={`h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 ${a.accent === 'blue' ? 'text-brand-blue' : 'text-brand-green'}`} />
            </a>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">

        {/* Tasks */}
        <SectionCard title="My Tasks" isDark={isDark}>
          {isLoading ? (
            <div className="space-y-2">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${itemBg}`}>
                  <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className={`flex flex-col items-center gap-2 py-6 text-center ${muted}`}>
              <CheckSquare className="h-8 w-8 opacity-30" />
              <p className="text-sm">No tasks assigned yet. Enjoy the calm!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t._id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${itemBg} ${t.status === 'completed' ? 'opacity-50' : ''}`}
                >
                  <div className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    t.status === 'completed'
                      ? 'border-brand-green bg-brand-green'
                      : isDark ? 'border-zinc-700' : 'border-zinc-300'
                  }`} />
                  <span className={`flex-1 text-sm truncate ${t.status === 'completed' ? 'line-through' : ''}`}>
                    {t.title}
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${priorityColor[t.priority] ?? muted}`}>
                    {t.priority}
                  </span>
                  <span className={`shrink-0 text-xs ${t.isOverdue ? 'text-red-400 font-medium' : muted}`}>
                    {t.dueLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          title="Notifications"
          isDark={isDark}
          action={
            unreadCount > 0
              ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[10px] font-bold text-white">{unreadCount}</span>
              : undefined
          }
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className={`rounded-xl border p-3 ${itemBg}`}>
                  <div className="flex gap-2"><Skeleton className="mt-1 h-2 w-2 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div></div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className={`flex flex-col items-center gap-2 py-6 text-center ${muted}`}>
              <Activity className="h-8 w-8 opacity-30" />
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n, i) => (
                <li key={n._id} className={`rounded-xl border p-3 ${itemBg} ${!n.isRead ? 'ring-1 ring-brand-blue/20' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${notifIcon[n.type] ?? 'bg-zinc-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.body && <p className={`text-xs truncate ${muted}`}>{n.body}</p>}
                      <p className={`mt-1 text-[10px] ${muted}`}>{n.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { company } = useCompany();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role ?? 'employee';

  const {
    stats, activity, teams, members, tasks,
    notifications, unreadCount,
    isLoading, error, refetch,
  } = useDashboard();

  if (!mounted) return null;

  return (
    <>
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {role === 'admin' && (
        <AdminView
          isDark={isDark}
          company={company}
          stats={stats}
          activity={activity}
          teams={teams}
          isLoading={isLoading}
        />
      )}
      {role === 'manager' && (
        <ManagerView
          isDark={isDark}
          stats={stats}
          teams={teams}
          members={members}
          tasks={tasks}
          isLoading={isLoading}
        />
      )}
      {role === 'employee' && (
        <EmployeeView
          isDark={isDark}
          session={session}
          stats={stats}
          tasks={tasks}
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
