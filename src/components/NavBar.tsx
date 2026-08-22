'use client';

import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import AnimatedThemeSwitch from './AnimatedThemeSwitch';
import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';

export default function Navbar() {
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Only try to use company context when authenticated
  // We wrap a inner component so context is only rendered when needed
  if (!mounted) return null;

  const isAuth = status === 'authenticated';

  return isAuth ? <AuthNavbar theme={theme} session={session} /> : <PublicNavbar theme={theme} />;
}

function PublicNavbar({ theme }: { theme: string | undefined }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 shadow">
      <Link href="/">
        <Image className="cursor-pointer" src="/logo.png" alt="CollabSync" width={150} height={20} />
      </Link>

      <div className="flex gap-8 text-lg font-medium">
        <Link href="/" className="text-brand-blue font-semibold transition-opacity hover:opacity-80">
          Home
        </Link>
        <Link
          href="/sign-up"
          className={`transition hover:text-brand-green ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
        >
          Sign Up
        </Link>
        <Link
          href="/sign-in"
          className={`transition hover:text-brand-blue ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
        >
          Sign In
        </Link>
      </div>

      <AnimatedThemeSwitch />
    </nav>
  );
}

function AuthNavbar({ theme, session }: { theme: string | undefined; session: any }) {
  const { company } = useCompany();
  const isDark = theme === 'dark';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';

  const initials = company?.name
    ? company.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <nav className="w-full flex items-center justify-between px-6 shadow">
      {/* Company logo / initials instead of CollabSync logo */}
      <Link href="/dashboard" className="flex items-center gap-3">
        {company?.avatarUrl ? (
          <div className="relative h-8 w-8 overflow-hidden rounded-xl">
            <Image src={company.avatarUrl} alt={company.name} fill className="object-cover" />
          </div>
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #2E7DC5, #4ABF6A)' }}
          >
            {initials}
          </div>
        )}
        <span className="text-sm font-semibold">{company?.name ?? session?.user?.name}</span>
      </Link>

      <div className="flex gap-6 text-sm font-medium">
        <Link href="/dashboard" className="text-brand-blue font-semibold transition-opacity hover:opacity-80">
          Dashboard
        </Link>
        <Link href="/dashboard/tasks" className={`transition hover:text-brand-green ${muted}`}>
          Tasks
        </Link>
        <Link href="/dashboard/messages" className={`transition hover:text-brand-blue ${muted}`}>
          Messages
        </Link>
      </div>

      <AnimatedThemeSwitch />
    </nav>
  );
}
