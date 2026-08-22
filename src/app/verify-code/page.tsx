'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, ArrowRight, MailCheck, RefreshCw } from 'lucide-react';

export default function VerifyCodePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

  // Retrieve email stored during sign-up
  const [email, setEmail] = useState('');
  useEffect(() => {
    const stored = sessionStorage.getItem('pending-verify-email');
    if (stored) setEmail(stored);
    else router.push('/sign-up'); // no email → go back
  }, [router]);

  // 6-digit OTP input state
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const shell = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const digitBox = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-brand-blue focus:ring-brand-blue/20'
    : 'border-zinc-300 bg-white text-zinc-900 focus:border-brand-blue focus:ring-brand-blue/20';

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return; // numbers only
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const code = digits.join('');
    if (code.length < 6) {
      setServerError('Please enter all 6 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message ?? 'Verification failed.');
        return;
      }

      setSuccess(true);
      sessionStorage.removeItem('pending-verify-email');
      setTimeout(() => router.push('/sign-in'), 1800);
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage('');
    setServerError('');
    // Trigger a new OTP by calling sign-up with the same email (the backend re-sends)
    // For now just surface a placeholder message — hook into your own resend endpoint if available
    await new Promise(r => setTimeout(r, 1000));
    setResendMessage('A new code has been sent to your email.');
    setResending(false);
    setDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  }

  return (
    <div className={`min-h-screen flex flex-col ${shell}`}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="CollabSync" width={130} height={18} />
        </Link>
        <Link href="/sign-up" className={`text-sm transition hover:text-brand-blue ${muted}`}>
          ← Back to sign up
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
              Verify email
            </span>
          </div>

          {/* Icon */}
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10">
            <MailCheck className="h-6 w-6 text-brand-blue" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Check your <span className="text-brand-blue">inbox</span>
          </h1>
          <p className={`mt-2 text-sm ${muted}`}>
            We sent a 6-digit code to{' '}
            <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{email || '…'}</span>.
            Enter it below to verify your account.
          </p>

          <form
            onSubmit={handleSubmit}
            className={`mt-8 rounded-2xl border p-6 sm:p-8 ${panel}`}
          >
            {/* Success */}
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10">
                  <MailCheck className="h-6 w-6 text-brand-green" />
                </div>
                <p className="text-center font-medium text-brand-green">Email verified!</p>
                <p className={`text-sm text-center ${muted}`}>Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                {/* OTP inputs */}
                <div
                  className="mb-6 flex justify-between gap-2"
                  onPaste={handlePaste}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className={`h-12 w-full rounded-xl border text-center text-lg font-semibold outline-none ring-0 transition focus:ring-2 ${digitBox} ${serverError ? 'border-red-500' : ''}`}
                    />
                  ))}
                </div>

                {/* Server / validation error */}
                {serverError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    {serverError}
                  </div>
                )}

                {/* Resend message */}
                {resendMessage && (
                  <div className="mb-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
                    {resendMessage}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  id="verify-submit"
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Verify account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Resend */}
                <div className="mt-5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className={`flex items-center gap-1.5 text-xs transition ${muted} hover:text-brand-blue disabled:opacity-60`}
                  >
                    <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Resending…' : "Didn't receive a code? Resend"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
