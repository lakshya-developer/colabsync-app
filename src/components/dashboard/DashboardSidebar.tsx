'use client';

import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  BarChart2,
  Settings,
  ClipboardList,
  Bell,
  LogOut,
  ChevronRight,
  Briefcase,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Hash,
  AtSign,
  BookOpen,
} from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';

// ─── Nav link definitions per role ───────────────────────────────────────────

const NAV_LINKS = {
  admin: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/teams', label: 'Teams', icon: Users },
    { href: '/dashboard/members', label: 'Members', icon: Briefcase },
    { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/dashboard/audit', label: 'Audit Log', icon: ClipboardList },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ],
  manager: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/team', label: 'My Team', icon: Users },
    { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
  ],
  employee: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/tasks', label: 'My Tasks', icon: CheckSquare },
    { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  ],
};

// Chat section — visible to all roles
const CHAT_LINKS = [
  { href: '/dashboard/messages', label: 'General', icon: Hash },
  { href: '/dashboard/messages/direct', label: 'Direct Messages', icon: AtSign },
  { href: '/dashboard/messages/announcements', label: 'Announcements', icon: BookOpen },
];

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-brand-blue/10 text-brand-blue',
  manager: 'bg-brand-green/10 text-brand-green',
  employee: 'bg-zinc-500/10 text-zinc-400',
};

// ─── Tooltip wrapper (shown only when sidebar is collapsed) ───────────────────
function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  isDark,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  collapsed: boolean;
  isDark: boolean;
}) {
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const textBase = isDark ? 'text-zinc-300' : 'text-zinc-600';
  const hoverBg = isDark ? 'hover:bg-zinc-800/70' : 'hover:bg-zinc-100';
  const activeBg = isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900';

  return (
    <li title={collapsed ? label : undefined}>
      <Link
        href={href}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive ? activeBg : `${textBase} ${hoverBg}`
        } ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            isActive ? 'text-brand-blue' : `${muted} group-hover:text-brand-blue`
          }`}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {isActive && (
              <ChevronRight className="h-3.5 w-3.5 text-brand-blue opacity-70" />
            )}
          </>
        )}
      </Link>
    </li>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function DashboardSidebar() {
  const { data: session } = useSession();
  const { company, isLoading } = useCompany();
  const { theme } = useTheme();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Restore collapse state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const isDark = mounted && theme === 'dark';
  const role = (session?.user?.role ?? 'employee') as keyof typeof NAV_LINKS;
  const links = NAV_LINKS[role] ?? NAV_LINKS.employee;

  const border = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const bg = isDark ? 'bg-zinc-950' : 'bg-white';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = isDark ? 'hover:bg-zinc-800/70' : 'hover:bg-zinc-100';
  const textBase = isDark ? 'text-zinc-300' : 'text-zinc-600';
  const divider = isDark ? 'border-zinc-800' : 'border-zinc-100';

  const initials = company?.name
    ? company.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '??';

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r ${border} ${bg} transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* ── Company header + toggle ──────────────────────── */}
      {collapsed ? (
        /* Collapsed: logo on top, toggle below */
        <div className={`flex flex-col items-center gap-2 border-b ${border} py-3`}>
          {isLoading ? (
            <div className={`h-9 w-9 animate-pulse rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          ) : company?.avatarUrl ? (
            <div className="relative h-9 w-9 overflow-hidden rounded-xl">
              <Image src={company.avatarUrl} alt={company.name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
              title={company?.name ?? 'Your Company'}
            >
              {initials}
            </div>
          )}
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              isDark
                ? 'text-zinc-500 hover:bg-zinc-800 hover:text-brand-blue'
                : 'text-zinc-400 hover:bg-zinc-100 hover:text-brand-blue'
            }`}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Expanded: logo + name + toggle in a single row */
        <div className={`flex items-center gap-3 border-b ${border} px-4 py-4`}>
          {isLoading ? (
            <div className={`h-9 w-9 shrink-0 animate-pulse rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          ) : company?.avatarUrl ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
              <Image src={company.avatarUrl} alt={company.name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className={`h-4 w-24 animate-pulse rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
            ) : (
              <p className="truncate text-sm font-semibold">{company?.name ?? 'Your Company'}</p>
            )}
            <div className="mt-0.5 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
              <span className={`text-[10px] uppercase tracking-wider ${muted}`}>CollabSync</span>
            </div>
          </div>

          {/* Toggle lives here when expanded */}
          <button
            onClick={toggleCollapse}
            title="Collapse sidebar"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
              isDark
                ? 'text-zinc-500 hover:bg-zinc-800 hover:text-brand-blue'
                : 'text-zinc-400 hover:bg-zinc-100 hover:text-brand-blue'
            }`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Scrollable nav body ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">

        {/* Main nav */}
        {!collapsed && (
          <p className={`mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
            Navigation
          </p>
        )}
        <ul className="space-y-0.5">
          {links.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={pathname === href}
              collapsed={collapsed}
              isDark={isDark}
            />
          ))}
        </ul>

        {/* ── Chat section ───────────────────────────────── */}
        <div className={`my-3 border-t ${divider}`} />

        {!collapsed && (
          <div className="mb-1.5 flex items-center gap-2 px-2">
            <MessageSquare className={`h-3.5 w-3.5 ${muted}`} />
            <p className={`text-[10px] font-medium uppercase tracking-[0.15em] ${muted}`}>
              Chat
            </p>
            {/* Unread badge */}
            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-brand-green text-[9px] font-bold text-white">
              3
            </span>
          </div>
        )}

        {collapsed && (
          <div className="mb-1 flex justify-center" title="Chat">
            <div className="relative">
              <MessageSquare className={`h-4 w-4 ${muted}`} />
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-green text-[7px] font-bold text-white">
                3
              </span>
            </div>
          </div>
        )}

        <ul className="space-y-0.5">
          {CHAT_LINKS.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={pathname === href || pathname.startsWith(href + '/')}
              collapsed={collapsed}
              isDark={isDark}
            />
          ))}
        </ul>

        {/* Messages quick link (collapsed-only icon) */}
        {!collapsed && (
          <>
            <div className={`my-3 border-t ${divider}`} />
            <Link
              href="/dashboard/messages"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${textBase} ${hoverBg}`}
            >
              <MessageSquare className={`h-4 w-4 shrink-0 ${muted}`} />
              <span className="flex-1">All Messages</span>
              <ChevronRight className={`h-3.5 w-3.5 ${muted}`} />
            </Link>
          </>
        )}
      </div>


      {/* ── User footer ───────────────────────────────────── */}
      <div className={`border-t ${border} px-3 py-3`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
            title={session?.user?.name ?? 'User'}
          >
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session?.user?.name ?? 'User'}</p>
                <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${ROLE_BADGE[role]}`}>
                  {role}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/sign-in' })}
                className={`rounded-lg p-1.5 transition ${hoverBg} ${muted} hover:text-red-400`}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}

          {collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className={`rounded-lg p-1.5 transition ${hoverBg} ${muted} hover:text-red-400`}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
