'use client';

import Navbar from '@/components/NavBar';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const stats = [
  { label: 'Active teams', value: '1.2k+' },
  { label: 'Tasks completed', value: '94%' },
  { label: 'Response time', value: '< 2m' },
];

const featureCards = [
  {
    title: 'Project visibility',
    description:
      'Track tasks, blockers, and ownership in one place so teams stay aligned without endless updates.',
  },
  {
    title: 'Smart collaboration',
    description:
      'Communicate with the right people, move discussions into context, and keep momentum across every department.',
  },
  {
    title: 'Performance insights',
    description:
      'Turn activity into decisions with clear metrics, team health signals, and actionable reporting.',
  },
];

const workflow = [
  'Create workspaces for teams and departments.',
  'Assign ownership, due dates, and priorities.',
  'Track updates in real time with notifications and activity.',
  'Measure results with shared reporting and team insights.',
];

export default function Home() {
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const isDark = mounted && theme === 'dark';
  const isLoggedIn = status === 'authenticated';

  const shell = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900';

  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const panel =
    isDark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-zinc-50';
  const soft = isDark ? 'bg-zinc-900 text-zinc-200' : 'bg-zinc-100 text-zinc-700';
  const buttonPrimary = isDark
    ? 'bg-white text-zinc-950 hover:bg-zinc-200'
    : 'bg-zinc-950 text-white hover:bg-zinc-800';
  const buttonSecondary = isDark
    ? 'border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900'
    : 'border-zinc-300 text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50';

  return (
    <div className={`min-h-screen ${shell}`}>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-6 pb-20 pt-8 sm:px-10 lg:px-12">
        <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div className="max-w-2xl">
            <div
              className={`mb-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase ${panel} ${muted}`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
              Built for modern teams
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Bring every part of work into{' '}
              <span className="text-brand-blue">one</span>{' '}
              <span className="text-brand-green">clear</span> flow.
            </h1>

            <p className={`mt-6 max-w-xl text-lg leading-8 ${muted}`}>
              CollabSync keeps communication, task tracking, teams, and hiring activity in one workspace so employees and managers can move faster with less friction.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {isLoggedIn ? (
                <a
                  href="/dashboard"
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition`}
                  style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
                >
                  Go to your workspace →
                </a>
              ) : (
                <>
                  <a
                    href="/sign-up"
                    className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition ${buttonPrimary}`}
                  >
                    Get started
                  </a>
                  <a
                    href="/sign-in"
                    className={`inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition ${buttonSecondary}`}
                  >
                    Sign in
                  </a>
                </>
              )}
            </div>

            <div className="mt-10 grid max-w-xl gap-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className={`rounded-2xl border p-4 ${panel}`}>
                  <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
                  <div className={`mt-2 text-sm ${muted}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-[28px] border p-5 shadow-sm ${panel}`}>
            <div className={`rounded-[22px] border p-5 ${soft}`}>
              <div className="flex items-center justify-between pb-4">
                <div>
                  <p className={`text-xs uppercase tracking-[0.2em] ${muted}`}>Overview</p>
                  <h2 className="mt-2 text-2xl font-semibold">Team system</h2>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                  Live
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={muted}>Product launch</span>
                    <span className="font-medium">78%</span>
                  </div>
                  <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <div className="h-full w-[78%] rounded-full" style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={`rounded-2xl border p-4 ${isDark ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
                    <div className={`text-xs uppercase tracking-[0.2em] ${muted}`}>Tasks</div>
                    <div className="mt-3 text-3xl font-semibold">184</div>
                  </div>
                  <div className={`rounded-2xl border p-4 ${isDark ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
                    <div className={`text-xs uppercase tracking-[0.2em] ${muted}`}>Members</div>
                    <div className="mt-3 text-3xl font-semibold">28</div>
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${isDark ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-xs uppercase tracking-[0.2em] ${muted}`}>Updates</div>
                      <div className="mt-2 text-lg font-medium">Design review sent</div>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 lg:py-14">
          <div className="mb-8 max-w-2xl">
            <p className={`text-xs font-medium uppercase tracking-[0.2em] ${muted}`}>
              Why teams choose CollabSync
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              One workspace for the work that matters.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className={`rounded-3xl border p-6 ${panel}`}>
                <div className={`mb-4 h-11 w-11 rounded-2xl flex items-center justify-center ${isDark ? 'bg-brand-blue/10' : 'bg-brand-blue/10'}`}>
                  <div className="h-5 w-5 rounded-full" style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }} />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className={`mt-3 leading-7 ${muted}`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`mt-8 rounded-[30px] border p-6 sm:p-8 ${panel}`}>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className={`text-xs font-medium uppercase tracking-[0.2em] ${muted}`}>
                Simple workflow
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Keep everyone moving without the chaos.
              </h2>
            </div>

            <div className="space-y-4">
              {workflow.map((step, index) => (
                <div key={step} className={`flex gap-4 rounded-2xl border p-4 ${isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-white'}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: index % 2 === 0 ? '#2E7DC5' : '#4ABF6A' }}>
                    {index + 1}
                  </div>
                  <p className={`pt-1 leading-7 ${muted}`}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className={`rounded-[28px] border px-6 py-12 text-center ${panel}`}>
            <p className="text-xs font-medium uppercase tracking-[0.2em]">
              <span className="text-brand-blue">Ready</span> to <span className="text-brand-green">work faster?</span>
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build a <span className="text-brand-blue">calmer</span>,{' '}<span className="text-brand-green">smarter</span> workplace.
            </h2>
            <p className={`mx-auto mt-4 max-w-xl text-lg leading-8 ${muted}`}>
              Replace scattered tools with a connected workspace that keeps your people, projects, and communication aligned.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              {isLoggedIn ? (
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition"
                  style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
                >
                  Go to your workspace →
                </a>
              ) : (
                <>
                  <a
                    href="/sign-up"
                    className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition ${buttonPrimary}`}
                  >
                    Start free
                  </a>
                  <a
                    href="/sign-in"
                    className={`inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition ${buttonSecondary}`}
                  >
                    View workspace
                  </a>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
