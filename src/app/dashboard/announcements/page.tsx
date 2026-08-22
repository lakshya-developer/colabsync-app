'use client';

import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Megaphone, Sparkles } from 'lucide-react';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === 'dark';

  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';

  const steps = [
    { label: 'Company channels broadcast to all members instantly' },
    { label: 'Rich-text announcements with file attachments' },
    { label: 'Acknowledgment tracking & read receipts' },
    { label: 'Pinned announcements stay at the top for new members' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
          <span className="text-brand-blue">Workspace</span> · Announcements
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Announcements</h1>
      </div>

      {/* ── Coming soon card ────────────────────────────────────────────────── */}
      <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 px-8 text-center ${panel}`}>
        {/* Animated icon */}
        <div className="relative mb-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          >
            <Megaphone className="h-10 w-10 text-white" />
          </div>
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[9px] font-bold text-white">
            Soon
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
        </div>

        <h2 className="text-xl font-semibold">
          <span className="text-brand-blue">Company</span>{' '}
          <span className="text-brand-green">Announcements</span>
        </h2>
        <p className={`mt-2 max-w-sm text-sm leading-relaxed ${muted}`}>
          Broadcast important messages to your entire organization — or specific teams — in real time.
          This feature is coming soon as part of the CollabSync messaging platform.
        </p>

        {/* Feature list */}
        <div className="mt-8 w-full max-w-sm space-y-3 text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: i % 2 === 0 ? '#2E7DC5' : '#4ABF6A' }}
              >
                {i + 1}
              </div>
              <p className={`text-sm ${muted}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="mt-8 flex items-center gap-1.5">
          <span className="h-2 w-8 rounded-full bg-brand-blue" />
          <span className="h-2 w-2 rounded-full bg-brand-green/40" />
          <span className="h-2 w-2 rounded-full bg-brand-green/20" />
        </div>
        <p className={`mt-2 text-[10px] uppercase tracking-wider ${muted}`}>Coming with the messaging module</p>
      </div>
    </div>
  );
}
