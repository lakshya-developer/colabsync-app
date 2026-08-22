'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import {
  Settings, Building2, Clock, CheckSquare, MessageSquare,
  Shield, Tag, Plus, X, Loader2, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import AnimatedThemeSwitch from '@/components/AnimatedThemeSwitch';

// ─── Primitives ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function SectionCard({
  icon: Icon, title, accent = 'blue', children, isDark,
}: {
  icon: React.ElementType;
  title: string;
  accent?: 'blue' | 'green';
  children: React.ReactNode;
  isDark: boolean;
}) {
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const iconBg = accent === 'blue' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-green/10 text-brand-green';
  return (
    <div className={`rounded-2xl border p-5 ${panel}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-xl p-1.5 ${iconBg}`}><Icon className="h-4 w-4" /></div>
        <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label, description, value, onChange, isDark,
}: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void; isDark: boolean;
}) {
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className={`text-xs ${muted}`}>{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${value ? 'bg-brand-green' : 'bg-zinc-600'}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { company, isLoading: companyLoading } = useCompany();
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [defaultPriority, setDefaultPriority] = useState('medium');
  const [allowTaskDelete, setAllowTaskDelete] = useState(true);
  const [allowFileSharing, setAllowFileSharing] = useState(true);
  const [archivePeriodDays, setArchivePeriodDays] = useState(90);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState(90);
  const [allowExternalUsers, setAllowExternalUsers] = useState(false);
  const [designations, setDesignations] = useState<string[]>([]);
  const [newDesig, setNewDesig] = useState('');

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';
  const role = session?.user?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return; }
    if (status === 'authenticated' && role !== 'admin') { router.push('/dashboard'); }
  }, [status, role, router]);

  // Populate form from company context (full settings shape)
  useEffect(() => {
    if (!company) return;
    setCompanyName(company.name);
    setTimezone(company.settings?.timezone ?? 'UTC');
    setWorkStart(company.settings?.workingHours?.start ?? '09:00');
    setWorkEnd(company.settings?.workingHours?.end ?? '18:00');
    setDefaultPriority(company.settings?.task?.defaultPriority ?? 'medium');
    setAllowTaskDelete(company.settings?.task?.allowTaskDelete ?? true);
    setAllowFileSharing(company.settings?.chat?.allowFileSharing ?? true);
    setArchivePeriodDays(company.settings?.chat?.archivePeriodDays ?? 90);
    setPasswordExpiryDays(company.settings?.policies?.passwordExpiryDays ?? 90);
    setAllowExternalUsers(company.settings?.policies?.allowExternalUsers ?? false);
    setDesignations(company.designations ?? []);
  }, [company]);

  async function handleSave() {
    if (!company) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/company/${company._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          settings: {
            timezone,
            workingHours: { start: workStart, end: workEnd },
            task: { defaultPriority, allowTaskDelete },
            chat: { allowFileSharing, archivePeriodDays },
            policies: { passwordExpiryDays, allowExternalUsers },
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message ?? 'Failed to save settings.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addDesignation() {
    if (!newDesig.trim() || !company) return;
    try {
      await fetch(`/api/company/${company._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designations: [newDesig.trim()] }),
      });
      setDesignations((d) => [...d, newDesig.trim()]);
      setNewDesig('');
    } catch {/* ignore */}
  }

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBase = isDark
    ? 'border-zinc-700 bg-zinc-800/70 text-zinc-100 placeholder-zinc-500 focus:ring-brand-blue'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:ring-brand-blue';
  const divider = isDark ? 'border-zinc-800' : 'border-zinc-100';

  if (!mounted || status === 'loading' || companyLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            <span className="text-brand-blue">Admin</span> · Configuration
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <button
          id="btn-save-settings"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <SectionCard icon={Settings} title="Appearance" accent="blue" isDark={isDark}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className={`text-xs ${muted}`}>Toggle between light and dark mode</p>
          </div>
          <AnimatedThemeSwitch />
        </div>
      </SectionCard>

      {/* ── Company info ────────────────────────────────────────────────────── */}
      <SectionCard icon={Building2} title="Company Info" accent="blue" isDark={isDark}>
        <div className="space-y-4">
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Company Name</label>
            <input
              id="input-company-name"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Work schedule ───────────────────────────────────────────────────── */}
      <SectionCard icon={Clock} title="Work Schedule" accent="green" isDark={isDark}>
        <div className="space-y-4">
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Timezone</label>
            <select
              id="select-timezone"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
                'Europe/Paris', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Work Start</label>
              <input
                id="input-work-start"
                type="time"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
              />
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Work End</label>
              <input
                id="input-work-end"
                type="time"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Task settings ───────────────────────────────────────────────────── */}
      <SectionCard icon={CheckSquare} title="Task Settings" accent="blue" isDark={isDark}>
        <div className="space-y-3">
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Default Priority</label>
            <select
              id="select-default-priority"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              value={defaultPriority}
              onChange={(e) => setDefaultPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className={`border-t pt-3 ${divider}`}>
            <ToggleRow
              label="Allow Task Deletion"
              description="Managers and admins can permanently delete tasks"
              value={allowTaskDelete}
              onChange={setAllowTaskDelete}
              isDark={isDark}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Chat settings ───────────────────────────────────────────────────── */}
      <SectionCard icon={MessageSquare} title="Chat & Messaging" accent="green" isDark={isDark}>
        <div className="space-y-3">
          <ToggleRow
            label="Allow File Sharing"
            description="Members can share files in chat rooms"
            value={allowFileSharing}
            onChange={setAllowFileSharing}
            isDark={isDark}
          />
          <div className={`border-t pt-3 ${divider}`}>
            <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Archive Period (days)</label>
            <input
              id="input-archive-period"
              type="number"
              min={1}
              max={365}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              value={archivePeriodDays}
              onChange={(e) => setArchivePeriodDays(Number(e.target.value))}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Policies ────────────────────────────────────────────────────────── */}
      <SectionCard icon={Shield} title="Security & Policies" accent="blue" isDark={isDark}>
        <div className="space-y-3">
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Password Expiry (days)</label>
            <input
              id="input-password-expiry"
              type="number"
              min={0}
              max={365}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${inputBase}`}
              value={passwordExpiryDays}
              onChange={(e) => setPasswordExpiryDays(Number(e.target.value))}
            />
          </div>
          <div className={`border-t pt-3 ${divider}`}>
            <ToggleRow
              label="Allow External Users"
              description="Users outside your company domain can be invited"
              value={allowExternalUsers}
              onChange={setAllowExternalUsers}
              isDark={isDark}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Designations ────────────────────────────────────────────────────── */}
      <SectionCard icon={Tag} title="Designations" accent="green" isDark={isDark}>
        <p className={`mb-3 text-xs ${muted}`}>Custom job titles available to assign to members.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {designations.map((d) => (
            <span
              key={d}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-100'}`}
            >
              {d}
            </span>
          ))}
          {designations.length === 0 && (
            <span className={`text-xs ${muted}`}>No designations yet.</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            id="input-new-designation"
            className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${inputBase}`}
            placeholder="e.g. Senior Engineer"
            value={newDesig}
            onChange={(e) => setNewDesig(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDesignation()}
          />
          <button
            id="btn-add-designation"
            onClick={addDesignation}
            className="flex items-center gap-1 rounded-xl bg-brand-blue/10 px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </SectionCard>

      {/* ── Save footer ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
