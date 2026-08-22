'use client';

import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import AnimatedThemeSwitch from '@/components/AnimatedThemeSwitch';
import { useSocket } from '@/context/SocketContext';
import { useEffect, useState } from 'react';

// Map route segments to readable breadcrumbs
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/teams': 'Teams',
  '/dashboard/members': 'Members',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/audit': 'Audit Log',
  '/dashboard/settings': 'Settings',
  '/dashboard/team': 'My Team',
  '/dashboard/reports': 'Reports',
  '/dashboard/messages': 'Messages',
  '/dashboard/announcements': 'Announcements',
  '/dashboard/notifications': 'Notifications',
};

export default function DashboardTopbar() {
  const { theme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  // ── Live unread notification count ──────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);

  // Seed initial unread count from the notifications API
  useEffect(() => {
    fetch('/api/dashboard/notifications')
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  // Listen for new notifications via socket
  useEffect(() => {
    if (!socket) return;

    const onNew = () => setUnreadCount((n) => n + 1);
    socket.on('notification:new', onNew);
    return () => { socket.off('notification:new', onNew); };
  }, [socket]);

  // When the user navigates to /dashboard/notifications, reset the badge
  useEffect(() => {
    if (pathname === '/dashboard/notifications') {
      setUnreadCount(0);
    }
  }, [pathname]);

  const isDark = theme === 'dark';
  const border = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const bg = isDark ? 'bg-zinc-950' : 'bg-white';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = isDark
    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
    : 'bg-zinc-100 border-transparent text-zinc-900 placeholder:text-zinc-400';
  const iconHover = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';

  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';
  const greeting = getGreeting();

  return (
    <header
      className={`flex h-16 shrink-0 items-center justify-between border-b ${border} ${bg} px-6 transition-colors`}
    >
      {/* Left: Page title */}
      <div>
        <p className={`text-xs font-medium uppercase tracking-[0.15em] ${muted}`}>
          {greeting},{' '}
          <span className="text-brand-blue">
            {session?.user?.name?.split(' ')[0] ?? 'there'}
          </span>
        </p>
        <h1 className="text-lg font-semibold leading-tight">{pageTitle}</h1>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className={`absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            placeholder="Search..."
            className={`rounded-xl border py-2 pl-8 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-brand-blue/20 w-48 ${inputBg}`}
          />
        </div>

        {/* Notification bell — live badge */}
        <button
          id="btn-topbar-notifications"
          onClick={() => router.push('/dashboard/notifications')}
          className={`relative rounded-xl p-2 transition ${iconHover} ${muted}`}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />

          {/* Live unread badge */}
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-green px-1 text-[9px] font-bold text-white leading-none animate-in fade-in duration-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            /* Subtle static dot when no notifications */
            <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-brand-green' : 'bg-zinc-600'}`} />
          )}
        </button>

        {/* Theme switch */}
        <AnimatedThemeSwitch />

        {/* User avatar */}
        <div
          className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          title={session?.user?.name ?? 'User'}
        >
          {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
