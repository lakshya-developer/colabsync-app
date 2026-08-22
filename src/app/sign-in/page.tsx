'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { z } from 'zod';
import { signInSchema } from '@/schemas/signInSchema';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const shell = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const input = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus:border-brand-blue focus:ring-brand-blue/20'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-brand-blue focus:ring-brand-blue/20';
  const label = isDark ? 'text-zinc-300' : 'text-zinc-700';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    // ── Client-side validation ──
    const result = signInSchema.safeParse({ identifier, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] != null) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      // ── Call NextAuth credentials provider ──
      // NextAuth v4 with redirect:false always returns error:"CredentialsSignin"
      // regardless of the real error thrown inside authorize(). We call our own
      // lightweight check first to surface a precise message, then let NextAuth
      // establish the session on success.
      const checkRes = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setServerError(checkData.message ?? 'Sign in failed. Please check your credentials.');
        return;
      }

      // Credentials are valid → let NextAuth create the session
      const res = await signIn('credentials', {
        redirect: false,
        identifier,
        password,
      });

      if (res?.error) {
        // Fallback: still show a helpful message (shouldn't normally reach here)
        setServerError('Sign in failed. Please try again.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`min-h-screen flex flex-col ${shell}`}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="CollabSync" width={130} height={18} />
        </Link>
        <Link href="/sign-up" className={`text-sm transition ${muted}`}>
          No account?{' '}
          <span className="text-brand-green font-medium hover:text-brand-green-dark transition">
            Sign up free
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand badge */}
          <div className="mb-6 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
            <span className={`text-xs font-medium uppercase tracking-[0.18em] ${muted}`}>
              Welcome back
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to{' '}
            <span className="text-brand-blue">Collab</span><span className="text-brand-green">Sync</span>
          </h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Enter your credentials to access your workspace.
          </p>

          <form
            onSubmit={handleSubmit}
            className={`mt-8 rounded-2xl border p-6 sm:p-8 ${panel}`}
          >
            {/* Email */}
            <div className="mb-4">
              <label className={`mb-1.5 block text-sm font-medium ${label}`} htmlFor="signin-email">
                Email address
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ring-0 transition focus:ring-2 ${input} ${errors.identifier ? 'border-red-500' : ''}`}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-red-500">{errors.identifier}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <div className="mb-1.5 flex items-center justify-between">
                <label className={`text-sm font-medium ${label}`} htmlFor="signin-password">
                  Password
                </label>
                <span className={`cursor-pointer text-xs text-brand-blue hover:text-brand-blue-dark transition`}>
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none ring-0 transition focus:ring-2 ${input} ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-brand-blue transition`}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              id="signin-submit"
              className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className={`mt-6 text-center text-xs ${muted}`}>
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-brand-green font-medium hover:text-brand-green-dark transition">
              Create one free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
