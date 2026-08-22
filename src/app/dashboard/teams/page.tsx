'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Trash2, Edit3, CheckCircle, AlertCircle,
  MoreHorizontal, X, Loader2, UserPlus, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  _id: string;
  name: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function Badge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: 'bg-brand-blue/10 text-brand-blue',
    manager: 'bg-brand-green/10 text-brand-green',
    employee: 'bg-zinc-500/10 text-zinc-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[role] ?? map.employee}`}>
      {role}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
      />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title, onClose, children, isDark,
}: {
  title: string; onClose: () => void; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Create modal state ─────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');

  // ── Delete modal state ─────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Rename modal state ─────────────────────────────────────────────────────
  const [renameTarget, setRenameTarget] = useState<Team | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role;

  // Role guard
  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return; }
    if (status === 'authenticated' && role !== 'admin') { router.push('/dashboard'); }
  }, [status, role, router]);

  // ── Fetch teams ────────────────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/teams');
      const data = await res.json();
      setTeams(data.teams ?? []);
    } catch {
      setError('Failed to load teams. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchTeams();
  }, [status, fetchTeams]);

  // ── Create team ────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createForm.name.trim()) { setCreateError('Team name is required'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          companyId: session?.user?.companyId,
        }),
      });
      const data = await res.json();
      if (!data.success) { setCreateError(data.message ?? 'Failed to create team'); return; }
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      fetchTeams();
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  // ── Delete team ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${deleteTarget._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        fetchTeams();
      }
    } finally {
      setDeleting(false);
    }
  }

  // ── Rename team ────────────────────────────────────────────────────────────
  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await fetch(`/api/teams/${renameTarget._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setRenameTarget(null);
      fetchTeams();
    } finally {
      setRenaming(false);
    }
  }

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-800 text-zinc-100 placeholder-zinc-500 focus:ring-brand-blue'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:ring-brand-blue';

  if (!mounted || status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className="text-brand-blue">Admin</span> · Teams
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Team Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTeams}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${panel} hover:border-brand-blue/40`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            id="btn-create-team"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          >
            <Plus className="h-4 w-4" />
            New Team
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Empty ──────────────────────────────────────────────────────────── */}
      {!isLoading && teams.length === 0 && (
        <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 ${panel}`}>
          <div className="rounded-2xl bg-brand-blue/10 p-4 text-brand-blue">
            <Users className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-semibold">No teams yet</p>
          <p className={`mt-1 text-sm ${muted}`}>Create your first team to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          >
            <Plus className="h-4 w-4" /> Create Team
          </button>
        </div>
      )}

      {/* ── Teams grid ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team._id}
              className={`group rounded-2xl border p-5 transition-shadow hover:shadow-md ${panel}`}
            >
              {/* Team header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{team.name}</p>
                    <p className={`text-xs ${muted}`}>{team.memberCount} members</p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    id={`btn-rename-team-${team._id}`}
                    onClick={() => { setRenameTarget(team); setRenameValue(team.name); }}
                    className={`rounded-lg p-1.5 transition hover:bg-zinc-200 dark:hover:bg-zinc-700 ${muted}`}
                    title="Rename"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id={`btn-delete-team-${team._id}`}
                    onClick={() => setDeleteTarget(team)}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Tasks</p>
                  <p className="text-xl font-semibold">{team.totalTasks}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Done</p>
                  <p className="text-xl font-semibold text-brand-green">{team.completedTasks}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className={`mb-1 flex items-center justify-between text-xs ${muted}`}>
                  <span>Completion</span>
                  <span className="font-medium">{team.completionPct}%</span>
                </div>
                <Progress value={team.completionPct} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary bar ────────────────────────────────────────────────────── */}
      {teams.length > 0 && (
        <div className={`flex items-center gap-6 rounded-2xl border px-5 py-3 text-sm ${panel}`}>
          <span className={`text-xs uppercase tracking-wider ${muted}`}>Summary</span>
          <span><span className="font-semibold">{teams.length}</span> teams</span>
          <span><span className="font-semibold">{teams.reduce((s, t) => s + t.memberCount, 0)}</span> members</span>
          <span><span className="font-semibold">{teams.reduce((s, t) => s + t.totalTasks, 0)}</span> total tasks</span>
          <span className="ml-auto flex items-center gap-1 text-brand-green">
            <CheckCircle className="h-3.5 w-3.5" />
            {teams.reduce((s, t) => s + t.completedTasks, 0)} completed
          </span>
        </div>
      )}

      {/* ── Create modal ───────────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Create New Team" onClose={() => setShowCreate(false)} isDark={isDark}>
          <div className="space-y-4">
            <div>
              <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Team Name *</label>
              <input
                id="input-team-name"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                placeholder="e.g. Engineering"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Description</label>
              <textarea
                id="input-team-description"
                className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                placeholder="What does this team do?"
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {createError && (
              <p className="text-xs text-red-400">{createError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${panel}`}
              >
                Cancel
              </button>
              <button
                id="btn-submit-create-team"
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create Team
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirmation modal ───────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete Team" onClose={() => setDeleteTarget(null)} isDark={isDark}>
          <p className={`text-sm ${muted}`}>
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-zinc-100">{deleteTarget.name}</span>?
            This cannot be undone and will unassign all members.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${panel}`}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-delete-team"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60 transition"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* ── Rename modal ───────────────────────────────────────────────────── */}
      {renameTarget && (
        <Modal title="Rename Team" onClose={() => setRenameTarget(null)} isDark={isDark}>
          <div className="space-y-4">
            <input
              id="input-rename-team"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${panel}`}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-rename-team"
                onClick={handleRename}
                disabled={renaming}
                className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60 transition"
              >
                {renaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
