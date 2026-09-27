'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  Users, Search, RefreshCw, ShieldCheck,
  Briefcase, User, Circle, AlertCircle, Loader2, X,
  UserPlus, Check, Eye, EyeOff,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  isOnline: boolean;
  lastActive: string | null;
  avatarUrl: string | null;
  designation: string;
  employeeCode: string;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  joinedAt: string;
}

interface Team {
  _id: string;
  name: string;
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    manager: 'bg-brand-green/10 text-brand-green border-brand-green/20',
    employee: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };
  const icons: Record<string, React.ReactNode> = {
    admin: <ShieldCheck className="h-3 w-3" />,
    manager: <Briefcase className="h-3 w-3" />,
    employee: <User className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${map[role] ?? map.employee}`}>
      {icons[role]} {role}
    </span>
  );
}

function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${isOnline ? 'bg-brand-green' : 'bg-zinc-500'}`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}

function Modal({
  title, onClose, children, isDark,
}: {
  title: string; onClose: () => void; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'manager' | 'employee'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');

  // Role change modal
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [changingRole, setChangingRole] = useState(false);

  // Hire modal
  const [showHire, setShowHire] = useState(false);
  const [hireForm, setHireForm] = useState({
    name: '', email: '', role: 'employee' as 'employee' | 'manager',
    designation: '', teamId: '', tempPassword: '',
  });
  const [showTempPw, setShowTempPw] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState('');
  const [hireSuccess, setHireSuccess] = useState('');

  const { socket } = useSocket();

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return; }
    if (status === 'authenticated' && role === 'employee') { router.push('/dashboard'); }
  }, [status, role, router]);

  // ── Real-time presence ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onOnline = (data: { _id: string }) =>
      setMembers((prev) => prev.map((m) => (m._id === data._id ? { ...m, isOnline: true } : m)));
    const onOffline = (data: { _id: string }) =>
      setMembers((prev) => prev.map((m) => (m._id === data._id ? { ...m, isOnline: false } : m)));
    socket.on('presence:online', onOnline);
    socket.on('presence:offline', onOffline);
    return () => { socket.off('presence:online', onOnline); socket.off('presence:offline', onOffline); };
  }, [socket]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      setMembers(data.users ?? []);
    } catch { setError('Failed to load members. Please refresh.'); }
    finally { setIsLoading(false); }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams((data.data ?? []).map((t: any) => ({ _id: t._id, name: t.name })));
    } catch {}
  }, []);

  useEffect(() => {
    if (status === 'authenticated') { fetchMembers(); fetchTeams(); }
  }, [status, fetchMembers, fetchTeams]);

  async function handleRoleChange() {
    if (!roleTarget) return;
    setChangingRole(true);
    try {
      await fetch(`/api/user/${roleTarget._id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      setRoleTarget(null);
      fetchMembers();
    } finally { setChangingRole(false); }
  }

  async function handleHire(e: React.FormEvent) {
    e.preventDefault();
    setHireError(''); setHireSuccess('');
    if (!hireForm.name.trim() || !hireForm.email.trim()) {
      setHireError('Name and email are required.'); return;
    }
    setHiring(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hireForm.name,
          email: hireForm.email,
          role: hireForm.role,
          designation: hireForm.designation,
          teamId: hireForm.teamId || undefined,
          tempPassword: hireForm.tempPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setHireError(data.message ?? 'Failed to hire.'); return; }
      setHireSuccess(`${data.data.name} (${data.data.employeeCode}) hired! Login credentials sent to their email.`);
      setHireForm({ name: '', email: '', role: 'employee', designation: '', teamId: '', tempPassword: '' });
      fetchMembers();
    } catch { setHireError('Network error. Please try again.'); }
    finally { setHiring(false); }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = members.filter((m) => {
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'online' && m.isOnline) ||
      (filterStatus === 'offline' && !m.isOnline);
    return matchSearch && matchRole && matchStatus;
  });

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-800/70 text-zinc-100 placeholder-zinc-500 focus:ring-brand-blue'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:ring-brand-blue';
  const hdr = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200';
  const labelCls = isDark ? 'text-zinc-300' : 'text-zinc-700';

  if (!mounted || status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className={role === 'admin' ? 'text-brand-blue' : 'text-brand-green'}>
              {role === 'admin' ? 'Admin' : 'Manager'}
            </span>{' '}
            · Members
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            Members
            <span className={`ml-2 text-base font-normal ${muted}`}>({members.length})</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMembers}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${panel} hover:border-brand-blue/40`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>

          {/* Hire button — admin and manager */}
          <button
            id="btn-hire-member"
            onClick={() => { setShowHire(true); setHireError(''); setHireSuccess(''); }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
          >
            <UserPlus className="h-4 w-4" />
            Hire Member
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
          <input
            id="input-member-search"
            className={`w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 ${inputBase}`}
            placeholder="Search by name, email or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          id="select-member-role"
          className={`rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select
          id="select-member-status"
          className={`rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className={`overflow-hidden rounded-2xl border ${panel}`}>
        <div className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] border-b px-4 py-3 text-[10px] font-medium uppercase tracking-[0.12em] ${muted} ${hdr}`}>
          <span>Member</span>
          <span className="hidden sm:block">Team</span>
          <span>Role</span>
          <span className="hidden md:block">Code</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <div className="divide-y divide-zinc-800/40">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Users className={`h-8 w-8 ${muted}`} />
            <p className={`mt-3 text-sm ${muted}`}>No members match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {filtered.map((m) => (
              <div
                key={m._id}
                className="group grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-2 px-4 py-3.5 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                {/* Name + email */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className={`truncate text-xs ${muted}`}>{m.email}</p>
                  </div>
                </div>

                {/* Team */}
                <span className={`hidden truncate text-xs sm:block ${muted}`}>
                  {m.assignedTeamName ?? '—'}
                </span>

                {/* Role */}
                <div><RoleBadge role={m.role} /></div>

                {/* Code */}
                <span className={`hidden font-mono text-xs md:block ${muted}`}>
                  {m.employeeCode || '—'}
                </span>

                {/* Online */}
                <div className="flex items-center gap-1.5">
                  <OnlineDot isOnline={m.isOnline} />
                  <span className={`text-xs ${muted}`}>{m.isOnline ? 'Online' : 'Offline'}</span>
                </div>

                {/* Actions — only admin sees Change Role */}
                {role === 'admin' && (
                  <button
                    id={`btn-change-role-${m._id}`}
                    onClick={() => { setRoleTarget(m); setNewRole(m.role); }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium opacity-0 transition group-hover:opacity-100 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                  >
                    Change Role
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Online summary ──────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className={`flex items-center gap-6 rounded-2xl border px-5 py-3 text-sm ${panel}`}>
          <span className={`text-xs uppercase tracking-wider ${muted}`}>Live</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-green" />
            <span><span className="font-semibold">{members.filter((m) => m.isOnline).length}</span> online</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <span><span className="font-semibold">{members.filter((m) => !m.isOnline).length}</span> offline</span>
          </span>
        </div>
      )}

      {/* ── Change role modal ────────────────────────────────────────────────── */}
      {roleTarget && (
        <Modal title="Change Member Role" onClose={() => setRoleTarget(null)} isDark={isDark}>
          <p className={`mb-4 text-sm ${muted}`}>
            Changing role for <span className="font-semibold">{roleTarget.name}</span>
          </p>
          <select
            id="select-new-role"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as typeof newRole)}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setRoleTarget(null)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${panel}`}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-role-change"
              onClick={handleRoleChange}
              disabled={changingRole}
              className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60 transition"
            >
              {changingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* ── Hire Member modal ────────────────────────────────────────────────── */}
      {showHire && (
        <Modal title="Hire a New Member" onClose={() => { setShowHire(false); setHireSuccess(''); }} isDark={isDark}>

          {/* Brand divider */}
          <div className="mb-5 h-px w-full" style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }} />

          {hireSuccess ? (
            /* Success state */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10">
                <Check className="h-6 w-6 text-brand-green" />
              </div>
              <p className="text-sm text-brand-green font-medium">{hireSuccess}</p>
              <button
                onClick={() => { setHireSuccess(''); }}
                className="mt-1 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
              >
                Hire Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleHire} className="space-y-4">
              {/* Name */}
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${labelCls}`} htmlFor="hire-name">Full Name *</label>
                <input
                  id="hire-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={hireForm.name}
                  onChange={(e) => setHireForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                />
              </div>

              {/* Email */}
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${labelCls}`} htmlFor="hire-email">Work Email *</label>
                <input
                  id="hire-email"
                  type="email"
                  placeholder="jane@company.com"
                  value={hireForm.email}
                  onChange={(e) => setHireForm(f => ({ ...f, email: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                />
              </div>

              {/* Role — admin sees both options; manager only sees employee */}
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${labelCls}`} htmlFor="hire-role">Role *</label>
                <select
                  id="hire-role"
                  value={hireForm.role}
                  onChange={(e) => setHireForm(f => ({ ...f, role: e.target.value as 'employee' | 'manager' }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                >
                  <option value="employee">Employee</option>
                  {role === 'admin' && <option value="manager">Manager</option>}
                </select>
              </div>

              {/* Designation */}
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${labelCls}`} htmlFor="hire-designation">Designation</label>
                <input
                  id="hire-designation"
                  type="text"
                  placeholder="e.g. Frontend Developer"
                  value={hireForm.designation}
                  onChange={(e) => setHireForm(f => ({ ...f, designation: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                />
              </div>

              {/* Team — admin only; manager is auto-assigned */}
              {role === 'admin' && teams.length > 0 && (
                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${labelCls}`} htmlFor="hire-team">Assign to Team</label>
                  <select
                    id="hire-team"
                    value={hireForm.teamId}
                    onChange={(e) => setHireForm(f => ({ ...f, teamId: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                  >
                    <option value="">— No team —</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Temp password */}
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${labelCls}`} htmlFor="hire-password">
                  Temporary Password
                  <span className={`ml-1 font-normal ${muted}`}>(auto-generated if blank)</span>
                </label>
                <div className="relative">
                  <input
                    id="hire-password"
                    type={showTempPw ? 'text' : 'password'}
                    placeholder="Leave blank to auto-generate"
                    value={hireForm.tempPassword}
                    onChange={(e) => setHireForm(f => ({ ...f, tempPassword: e.target.value }))}
                    className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 ${inputBase}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPw(v => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${muted} hover:text-brand-blue`}
                  >
                    {showTempPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {hireError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {hireError}
                </div>
              )}

              {/* Info note */}
              <p className={`text-xs ${muted}`}>
                Login credentials will be emailed to the new member automatically.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowHire(false)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${panel}`}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-hire"
                  type="submit"
                  disabled={hiring}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
                >
                  {hiring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {hiring ? 'Hiring…' : 'Hire Member'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
