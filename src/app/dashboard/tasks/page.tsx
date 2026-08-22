'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import {
  LayoutGrid, List, Plus, RefreshCw, AlertCircle, Search,
  X, Loader2, MessageSquare, Calendar, ChevronDown,
  Flag, User as UserIcon, Clock, Tag, Filter,
  Paperclip, Send, CheckCircle2, AlertTriangle, Circle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  _id: string;
  key: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedId: string;
  assigneeName: string;
  assigneeInitial: string;
  creatorId: string;
  teamId: string | null;
  teamName: string | null;
  dueDate: string;
  startDate: string | null;
  dueLabel: string;
  isOverdue: boolean;
  commentCount: number;
  createdAt: string;
}

interface DetailTask extends TaskItem {
  creatorName: string;
  attachments: { fileName: string; fileUrl: string }[];
  comments: Comment[];
}

interface Comment {
  _id: string;
  commenterId: string;
  commenterName: string;
  commenterInitial: string;
  content: string;
  commentedAt: string;
}

interface Member { _id: string; name: string; }
interface TeamOpt { _id: string; name: string; }

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'pending',     label: 'Backlog',     color: 'text-zinc-400',   dot: 'bg-zinc-500',     headerBg: 'border-zinc-700' },
  { id: 'in_progress', label: 'In Progress', color: 'text-brand-blue', dot: 'bg-brand-blue',   headerBg: 'border-brand-blue/40' },
  { id: 'review',      label: 'In Review',   color: 'text-amber-400',  dot: 'bg-amber-400',    headerBg: 'border-amber-400/40' },
  { id: 'completed',   label: 'Done',        color: 'text-brand-green',dot: 'bg-brand-green',  headerBg: 'border-brand-green/40' },
  { id: 'cancelled',   label: 'Cancelled',   color: 'text-zinc-500',   dot: 'bg-zinc-600',     headerBg: 'border-zinc-700' },
] as const;

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', chip: 'bg-red-500/15 text-red-400',    border: 'border-l-red-500',    dot: 'bg-red-400',    icon: '🔴' },
  high:     { label: 'High',     chip: 'bg-orange-500/15 text-orange-400', border: 'border-l-orange-400', dot: 'bg-orange-400', icon: '🟠' },
  medium:   { label: 'Medium',   chip: 'bg-amber-500/15 text-amber-400', border: 'border-l-amber-400',  dot: 'bg-amber-400',  icon: '🟡' },
  low:      { label: 'Low',      chip: 'bg-zinc-500/15 text-zinc-400',   border: 'border-l-zinc-500',   dot: 'bg-zinc-400',   icon: '⚪' },
} as const;

// ─── Tiny primitives ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function Avatar({
  initial, size = 'sm', gradient = false,
}: {
  initial: string; size?: 'xs' | 'sm' | 'md'; gradient?: boolean;
}) {
  const sz = size === 'xs' ? 'h-5 w-5 text-[9px]' : size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-full font-bold text-white ${sz}`}
      style={{ background: gradient ? 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' : '#3f3f46' }}
    >
      {initial}
    </div>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.low;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cfg.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
    </span>
  );
}

// ─── Task Card (Board) ────────────────────────────────────────────────────────

function TaskCard({
  task, onClick, onDragStart, isDark,
}: {
  task: TaskItem;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  isDark: boolean;
}) {
  const pCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.low;
  const cardBg = isDark
    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
    : 'bg-white border-zinc-200 hover:border-zinc-300';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task._id)}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border border-l-4 p-3.5 transition-all duration-150 hover:shadow-md ${cardBg} ${pCfg.border}`}
    >
      {/* Key + Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] text-zinc-500">{task.key}</span>
        <PriorityChip priority={task.priority} />
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2 mb-3">{task.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Due date */}
          <span className={`flex items-center gap-1 text-[10px] font-medium ${task.isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
            <Calendar className="h-3 w-3" />
            {task.dueLabel}
          </span>
          {/* Comment count */}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
        </div>
        {/* Assignee avatar */}
        <Avatar initial={task.assigneeInitial} size="xs" />
      </div>
    </div>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

function BoardColumn({
  col, tasks, onCardClick, onDragStart, onDrop, isDark,
}: {
  col: typeof COLUMNS[number];
  tasks: TaskItem[];
  onCardClick: (t: TaskItem) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  isDark: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const colBg = isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200';

  return (
    <div
      className={`flex min-w-[260px] max-w-[280px] flex-col rounded-2xl border transition-all ${colBg} ${dragOver ? 'ring-2 ring-brand-blue/40' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e, col.id); }}
    >
      {/* Column header */}
      <div className={`flex items-center gap-2 border-b px-4 py-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <span className={`h-2 w-2 rounded-full shrink-0 ${col.dot}`} />
        <p className={`text-xs font-semibold uppercase tracking-widest ${col.color}`}>{col.label}</p>
        <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center py-8 opacity-40">
            <p className="text-xs">No tasks</p>
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t._id}
              task={t}
              onClick={() => onCardClick(t)}
              onDragStart={onDragStart}
              isDark={isDark}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Task Detail Drawer ───────────────────────────────────────────────────────

function TaskDetailDrawer({
  taskId, onClose, onStatusChange, onDelete, isDark, role,
}: {
  taskId: string;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
  role: string;
}) {
  const [task, setTask] = useState<DetailTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const panel = isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200';
  const muted  = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 focus:ring-brand-blue'
    : 'border-zinc-300 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:ring-brand-blue';
  const rowBg = isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50';

  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      setTask(data.task ?? null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.comments?.length]);

  async function handleStatusChange(newStatus: string) {
    if (!task) return;
    setChangingStatus(true);
    try {
      await fetch(`/api/task/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setTask((t) => t ? { ...t, status: newStatus } : t);
      onStatusChange(task._id, newStatus);
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleComment() {
    if (!task || !comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/task/${task._id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTask((t) => t ? { ...t, comments: [...t.comments, data.comment], commentCount: t.commentCount + 1 } : t);
        setComment('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const pCfg = task ? (PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.low) : null;
  const canDelete = role === 'admin' || role === 'manager';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className={`flex w-full max-w-xl flex-col border-l shadow-2xl overflow-hidden ${panel}`}
        style={{ animation: 'slideInRight 0.2s ease-out' }}>

        {/* Drawer header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span className="font-mono text-xs text-zinc-500">{task?.key}</span>
          )}
          <div className="flex items-center gap-2">
            {canDelete && task && (
              <button
                onClick={() => { onDelete(task._id); onClose(); }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-2 pt-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            </div>
          ) : !task ? (
            <div className="flex items-center justify-center py-20">
              <p className={`text-sm ${muted}`}>Task not found.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {/* Title + description */}
              <div className="p-6 space-y-3">
                <h2 className="text-xl font-semibold leading-snug">{task.title}</h2>
                {task.description ? (
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${muted}`}>{task.description}</p>
                ) : (
                  <p className={`text-sm italic ${muted}`}>No description.</p>
                )}
              </div>

              {/* Metadata fields */}
              <div className="p-6 space-y-1">
                {/* Status */}
                <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${muted}`} />
                  <span className={`w-24 text-xs font-medium ${muted}`}>Status</span>
                  <select
                    className={`flex-1 rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 ${inputBase}`}
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={changingStatus}
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  {changingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-blue" />}
                </div>

                {/* Priority */}
                <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                  <Flag className={`h-4 w-4 shrink-0 ${muted}`} />
                  <span className={`w-24 text-xs font-medium ${muted}`}>Priority</span>
                  <PriorityChip priority={task.priority} />
                </div>

                {/* Assignee */}
                <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                  <UserIcon className={`h-4 w-4 shrink-0 ${muted}`} />
                  <span className={`w-24 text-xs font-medium ${muted}`}>Assignee</span>
                  <div className="flex items-center gap-2">
                    <Avatar initial={task.assigneeInitial} size="xs" gradient />
                    <span className="text-sm">{task.assigneeName}</span>
                  </div>
                </div>

                {/* Team */}
                {task.teamName && (
                  <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                    <Tag className={`h-4 w-4 shrink-0 ${muted}`} />
                    <span className={`w-24 text-xs font-medium ${muted}`}>Team</span>
                    <span className="text-sm">{task.teamName}</span>
                  </div>
                )}

                {/* Due date */}
                <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                  <Calendar className={`h-4 w-4 shrink-0 ${muted}`} />
                  <span className={`w-24 text-xs font-medium ${muted}`}>Due</span>
                  <span className={`text-sm ${task.isOverdue ? 'text-red-400 font-medium' : ''}`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </span>
                </div>

                {/* Reporter */}
                <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                  <UserIcon className={`h-4 w-4 shrink-0 ${muted}`} />
                  <span className={`w-24 text-xs font-medium ${muted}`}>Reporter</span>
                  <span className="text-sm">{task.creatorName}</span>
                </div>

                {/* Created at */}
                <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowBg}`}>
                  <Clock className={`h-4 w-4 shrink-0 ${muted}`} />
                  <span className={`w-24 text-xs font-medium ${muted}`}>Created</span>
                  <span className={`text-sm ${muted}`}>
                    {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Comments */}
              <div className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Comments ({task.comments.length})
                </p>

                {task.comments.length === 0 ? (
                  <p className={`text-sm ${muted}`}>No comments yet. Be the first to comment.</p>
                ) : (
                  <div className="space-y-4">
                    {task.comments.map((c) => (
                      <div key={c._id} className="flex gap-3">
                        <Avatar initial={c.commenterInitial} size="sm" gradient />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold">{c.commenterName}</p>
                            <p className={`text-[10px] ${muted}`}>
                              {new Date(c.commentedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' '}
                              {new Date(c.commentedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} rounded-xl px-3 py-2`}>
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}

                {/* New comment input */}
                <div className="flex gap-3 pt-2">
                  <Avatar initial="Y" size="sm" gradient />
                  <div className="flex-1 flex gap-2">
                    <textarea
                      id="input-comment"
                      rows={1}
                      className={`flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputBase}`}
                      placeholder="Add a comment…"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
                      }}
                    />
                    <button
                      id="btn-submit-comment"
                      onClick={handleComment}
                      disabled={submitting || !comment.trim()}
                      className="self-end rounded-xl bg-brand-blue p-2 text-white hover:bg-brand-blue-dark disabled:opacity-40 transition"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({
  onClose, onCreated, isDark, session, members, teams,
}: {
  onClose: () => void;
  onCreated: (task: TaskItem) => void;
  isDark: boolean;
  session: any;
  members: Member[];
  teams: TeamOpt[];
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedId: session?.user?.role === 'employee' ? (session?.user?.id ?? '') : '',
    teamId: '',
    dueDate: '',
    startDate: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const panel = isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-800/70 text-zinc-100 placeholder-zinc-600 focus:ring-brand-blue'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:ring-brand-blue';
  const labelBase = `mb-1.5 block text-xs font-medium ${muted}`;

  async function handleCreate() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.assignedId) { setError('Assignee is required'); return; }
    if (!form.dueDate) { setError('Due date is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          assignedId: form.assignedId,
          teamId: form.teamId || undefined,
          dueDate: form.dueDate,
          startDate: form.startDate || undefined,
          creatorId: session?.user?.id,
          companyId: session?.user?.companyId,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message ?? 'Failed to create task'); return; }

      // Build a local TaskItem from the response to add to board immediately
      const newTask: TaskItem = {
        _id: String(data.data._id),
        key: `CS-${String(data.data._id).slice(-5).toUpperCase()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        status: 'pending',
        priority: form.priority,
        assignedId: form.assignedId,
        assigneeName: members.find((m) => m._id === form.assignedId)?.name ?? 'Unassigned',
        assigneeInitial: (members.find((m) => m._id === form.assignedId)?.name ?? 'U').charAt(0).toUpperCase(),
        creatorId: session?.user?.id ?? '',
        teamId: form.teamId || null,
        teamName: teams.find((t) => t._id === form.teamId)?.name ?? null,
        dueDate: form.dueDate,
        startDate: form.startDate || null,
        dueLabel: 'Soon',
        isOverdue: false,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };
      onCreated(newTask);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isEmployee = session?.user?.role === 'employee';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${panel}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
            <h2 className="ml-1 text-base font-semibold">Create Task</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-6">
          {/* Title */}
          <div>
            <label className={labelBase}>Title <span className="text-red-400">*</span></label>
            <input
              id="input-task-title"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelBase}>Description</label>
            <textarea
              id="input-task-description"
              rows={3}
              className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              placeholder="Add details…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Row: Assignee + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>Assignee <span className="text-red-400">*</span></label>
              {isEmployee ? (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${isDark ? 'border-zinc-700 bg-zinc-800/40' : 'border-zinc-300 bg-zinc-50'}`}>
                  <Avatar initial={session?.user?.name?.charAt(0) ?? 'Y'} size="xs" gradient />
                  <span>{session?.user?.name}</span>
                </div>
              ) : (
                <select
                  id="select-task-assignee"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                  value={form.assignedId}
                  onChange={(e) => setForm((f) => ({ ...f, assignedId: e.target.value }))}
                >
                  <option value="">Select assignee…</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelBase}>Priority</label>
              <select
                id="select-task-priority"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
          </div>

          {/* Row: Team + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>Team</label>
              <select
                id="select-task-team"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={form.teamId}
                onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
              >
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelBase}>Initial Status</label>
              <select
                id="select-task-status"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Start date + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>Start Date</label>
              <input
                id="input-task-start-date"
                type="date"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelBase}>Due Date <span className="text-red-400">*</span></label>
              <input
                id="input-task-due-date"
                type="date"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${isDark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
            >
              Cancel
            </button>
            <button
              id="btn-submit-create-task"
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white disabled:opacity-60 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List View Row ─────────────────────────────────────────────────────────────

function ListRow({ task, onClick, isDark }: { task: TaskItem; onClick: () => void; isDark: boolean }) {
  const pCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.low;
  const colCfg = COLUMNS.find((c) => c.id === task.status);
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div
      onClick={onClick}
      className={`grid cursor-pointer items-center gap-4 px-4 py-3 text-sm transition ${isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'}`}
      style={{ gridTemplateColumns: '2fr 1fr 100px 100px 80px 80px' }}
    >
      {/* Title + key */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pCfg.dot}`} />
        <span className={`font-mono text-[10px] shrink-0 ${muted}`}>{task.key}</span>
        <span className="truncate font-medium">{task.title}</span>
      </div>
      {/* Assignee */}
      <div className="flex items-center gap-2 min-w-0">
        <Avatar initial={task.assigneeInitial} size="xs" gradient />
        <span className={`truncate text-xs ${muted}`}>{task.assigneeName}</span>
      </div>
      {/* Priority */}
      <PriorityChip priority={task.priority} />
      {/* Status */}
      <span className={`text-xs font-medium ${colCfg?.color ?? muted}`}>{colCfg?.label ?? task.status}</span>
      {/* Due */}
      <span className={`text-xs ${task.isOverdue ? 'text-red-400 font-medium' : muted}`}>{task.dueLabel}</span>
      {/* Comments */}
      <div className="flex items-center gap-1">
        {task.commentCount > 0 && (
          <>
            <MessageSquare className={`h-3 w-3 ${muted}`} />
            <span className={`text-xs ${muted}`}>{task.commentCount}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { socket } = useSocket();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── View state ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');

  // ── DnD ────────────────────────────────────────────────────────────────────
  const draggingId = useRef<string | null>(null);

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role ?? 'employee';

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/sign-in');
  }, [status, router]);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterTeam && filterTeam !== 'all') params.set('teamId', filterTeam);
      const qs = params.toString();
      const res = await fetch(`/api/tasks${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [filterTeam]);

  const fetchSupportData = useCallback(async () => {
    try {
      // Fetch teams always; fetch user list only for admins
      const [mRes, tRes] = await Promise.all([
        role === 'admin' ? fetch('/api/user') : Promise.resolve(null),
        fetch('/api/dashboard/teams'),
      ]);

      // Parse teams response once (fixes the double-json bug)
      const tData = await tRes.json();
      const fetchedTeams: TeamOpt[] = (tData.teams ?? []).map((t: any) => ({ _id: t._id, name: t.name }));
      setTeams(fetchedTeams);

      // Managers: auto-select their single team so the board pre-filters
      if (role === 'manager' && fetchedTeams.length === 1) {
        setFilterTeam(fetchedTeams[0]._id);
      }

      // Populate assignee list
      if (role === 'admin' && mRes) {
        const mData = await mRes.json();
        setMembers((mData.users ?? []).map((u: any) => ({ _id: u._id, name: u.name })));
      } else {
        setMembers((tData.members ?? []).map((m: any) => ({ _id: m._id, name: m.name })));
      }
    } catch {/* ignore */}
  }, [role]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTasks();
      fetchSupportData();
    }
  }, [status, fetchTasks, fetchSupportData]);

  // ── Real-time socket events ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onCreated = (task: TaskItem) =>
      setTasks((prev) => prev.some((t) => t._id === task._id) ? prev : [task, ...prev]);

    const onUpdated = (update: Partial<TaskItem> & { _id: string }) =>
      setTasks((prev) =>
        prev.map((t) =>
          t._id === update._id
            ? { ...t, ...update, isOverdue: update.status && update.status !== 'completed' && update.status !== 'cancelled' ? t.isOverdue : false }
            : t,
        ),
      );

    const onCompleted = (data: { _id: string }) =>
      setTasks((prev) => prev.map((t) => t._id === data._id ? { ...t, status: 'completed', isOverdue: false } : t));

    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:completed', onCompleted);
    return () => {
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:completed', onCompleted);
    };
  }, [socket]);

  // ── DnD handlers ──────────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, taskId: string) {
    draggingId.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    const id = draggingId.current;
    if (!id) return;
    const task = tasks.find((t) => t._id === id);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: newStatus, isOverdue: newStatus === 'completed' ? false : t.isOverdue } : t));

    try {
      await fetch(`/api/task/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert
      setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: task.status } : t));
    }
    draggingId.current = null;
  }

  // ── Status change from drawer ──────────────────────────────────────────────
  function handleStatusChange(id: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: newStatus } : t));
  }

  // ── Delete from drawer ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    try {
      await fetch(`/api/task/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch {/* ignore */}
  }

  // ── Filter + search ────────────────────────────────────────────────────────
  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.key.includes(search.toUpperCase())) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && t.assignedId !== filterAssignee) return false;
    return true;
  });

  // ── Board grouping ─────────────────────────────────────────────────────────
  const byStatus = (statusId: string) => filtered.filter((t) => t.status === statusId);

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-900/60 text-zinc-100 placeholder-zinc-600 focus:ring-brand-blue'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:ring-brand-blue';
  const hdr = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200';

  if (!mounted || status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[60vh] w-64 shrink-0" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className="text-brand-blue">Workspace</span> · Project Board
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tasks
            <span className={`ml-2 text-base font-normal ${muted}`}>({filtered.length})</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Board / List toggle */}
          <div className={`flex rounded-xl border p-0.5 ${panel}`}>
            <button
              id="btn-view-board"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${viewMode === 'board' ? 'bg-brand-blue/10 text-brand-blue' : muted}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              id="btn-view-list"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${viewMode === 'list' ? 'bg-brand-green/10 text-brand-green' : muted}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>

          <button
            onClick={fetchTasks}
            className={`rounded-xl border p-2 transition ${panel} hover:border-brand-blue/40`}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            id="btn-create-task"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* ── Team tabs ──────────────────────────────────────────────────────── */}
      {role === 'admin' && teams.length > 0 && (
        <div className={`flex items-center gap-1 overflow-x-auto rounded-2xl border p-1 ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
          <button
            id="btn-team-all"
            onClick={() => setFilterTeam('all')}
            className={`shrink-0 rounded-xl px-4 py-1.5 text-xs font-medium transition ${
              filterTeam === 'all'
                ? 'bg-brand-blue/10 text-brand-blue'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            All Teams
          </button>
          {teams.map((t, i) => (
            <button
              key={t._id}
              id={`btn-team-${t._id}`}
              onClick={() => setFilterTeam(t._id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-medium transition ${
                filterTeam === t._id
                  ? 'bg-brand-green/10 text-brand-green'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${i % 2 === 0 ? 'bg-brand-blue' : 'bg-brand-green'}`} />
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Manager: show locked team label */}
      {role === 'manager' && teams.length > 0 && (
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
          <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Viewing team:</span>
          <span className="flex items-center gap-1.5 font-semibold text-brand-blue">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
            {teams[0]?.name}
          </span>
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${muted}`} />
          <input
            id="input-task-search"
            className={`rounded-xl border py-2 pl-8 pr-4 text-sm outline-none focus:ring-2 w-48 ${inputBase}`}
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Priority filter */}
        <select
          id="select-filter-priority"
          className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputBase}`}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚪ Low</option>
        </select>

        {/* Assignee filter */}
        {members.length > 0 && (
          <select
            id="select-filter-assignee"
            className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputBase}`}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
        )}

        {/* Active filter chips */}
        {(search || filterPriority !== 'all' || filterAssignee !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterPriority('all'); setFilterAssignee('all'); }}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'}`}
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Board view ─────────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-80 w-64 shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
            {COLUMNS.map((col) => (
              <BoardColumn
                key={col.id}
                col={col}
                tasks={byStatus(col.id)}
                onCardClick={(t) => setDetailId(t._id)}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                isDark={isDark}
              />
            ))}
          </div>
        )
      )}

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className={`rounded-2xl border overflow-hidden ${panel}`}>
          {/* List header */}
          <div
            className={`grid items-center gap-4 border-b px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] ${muted} ${hdr}`}
            style={{ gridTemplateColumns: '2fr 1fr 100px 100px 80px 80px' }}
          >
            <span>Title</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Due</span>
            <span></span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <p className={`text-sm ${muted}`}>No tasks match your filters.</p>
            </div>
          ) : (
            <div className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-zinc-200/60'}`}>
              {filtered.map((t) => (
                <ListRow
                  key={t._id}
                  task={t}
                  onClick={() => setDetailId(t._id)}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Total counts footer ─────────────────────────────────────────────── */}
      {!isLoading && tasks.length > 0 && (
        <div className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-3 text-xs ${panel}`}>
          {COLUMNS.map((c) => {
            const n = byStatus(c.id).length;
            return n > 0 ? (
              <span key={c.id} className={`flex items-center gap-1.5 ${c.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {c.label}: <span className="font-semibold">{n}</span>
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* ── Create Task Modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={(t) => setTasks((prev) => [t, ...prev])}
          isDark={isDark}
          session={session}
          members={members}
          teams={teams}
        />
      )}

      {/* ── Task Detail Drawer ──────────────────────────────────────────────── */}
      {detailId && (
        <TaskDetailDrawer
          taskId={detailId}
          onClose={() => setDetailId(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          isDark={isDark}
          role={role}
        />
      )}
    </div>
  );
}
