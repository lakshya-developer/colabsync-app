'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, ArrowRight, MailCheck, Send, Clock } from 'lucide-react';

// 1.5 minutes in seconds
const TIMER_SECONDS = 90;
const LS_EXPIRY_KEY = 'verify-code-expiry';  // localStorage key for persisted timer

export default function VerifyCodePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

  // ── Email from sessionStorage ──────────────────────────────────────────────
  const [email, setEmail] = useState('');
  useEffect(() => {
    const stored = sessionStorage.getItem('pending-verify-email');
    if (stored) setEmail(stored);
    else router.push('/sign-up');
  }, [router]);

  // ── OTP input ──────────────────────────────────────────────────────────────
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  // ── Send-code state ────────────────────────────────────────────────────────
  const [codeSent, setCodeSent] = useState(false);       // true once first send succeeds
  const [sending, setSending] = useState(false);          // API in-flight
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  // ── Countdown timer ────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(0);     // 0 = not running
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start an interval that ticks down from `initial` seconds, writing expiry to localStorage
  const startIntervalFrom = useCallback((initial: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(initial);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          localStorage.removeItem(LS_EXPIRY_KEY);  // clean up when expired
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  // Write expiry to localStorage then start the interval
  const startTimer = useCallback(() => {
    const expiry = Date.now() + TIMER_SECONDS * 1000;
    localStorage.setItem(LS_EXPIRY_KEY, expiry.toString());
    startIntervalFrom(TIMER_SECONDS);
  }, [startIntervalFrom]);

  // On mount: restore timer from localStorage if a valid expiry exists
  useEffect(() => {
    const stored = localStorage.getItem(LS_EXPIRY_KEY);
    if (stored) {
      const remaining = Math.floor((Number(stored) - Date.now()) / 1000);
      if (remaining > 0) {
        setCodeSent(true);             // OTP inputs should be visible
        startIntervalFrom(remaining);  // resume from exact remaining seconds
      } else {
        localStorage.removeItem(LS_EXPIRY_KEY); // already expired, clean up
      }
    }
  }, [startIntervalFrom]);

  // Cleanup interval on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Format mm:ss ───────────────────────────────────────────────────────────
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Send / Resend code ─────────────────────────────────────────────────────
  async function handleSendCode() {
    setSending(true);
    setSendError('');
    setSendSuccess('');
    try {
      const res = await fetch('/api/resend-verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.message ?? 'Failed to send code. Please try again.');
        return;
      }
      setCodeSent(true);
      setSendSuccess('Code sent! Check your inbox.');
      setDigits(['', '', '', '', '', '']);
      setServerError('');
      startTimer();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // ── OTP input handlers ────────────────────────────────────────────────────
  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
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

  // ── Verify submit ─────────────────────────────────────────────────────────
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

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const shell = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const digitBox = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-brand-blue focus:ring-brand-blue/20'
    : 'border-zinc-300 bg-white text-zinc-900 focus:border-brand-blue focus:ring-brand-blue/20';

  const timerRunning = secondsLeft > 0;
  const timerUrgent = secondsLeft > 0 && secondsLeft <= 20;

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
            We will send a 6-digit code to{' '}
            <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{email || '…'}</span>.
            Click <span className="font-medium text-brand-blue">Send Code</span> below to receive it.
          </p>

          <form
            onSubmit={handleSubmit}
            className={`mt-8 rounded-2xl border p-6 sm:p-8 ${panel}`}
          >
            {/* ── Success state ── */}
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
                {/* ── Send Code button ── */}
                <div className="mb-6">
                  <button
                    type="button"
                    id="send-code-btn"
                    onClick={handleSendCode}
                    disabled={sending || timerRunning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition disabled:opacity-60"
                    style={
                      timerRunning
                        ? {}
                        : { background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)', color: 'white', border: 'none' }
                    }
                    {...(timerRunning && {
                      style: {
                        background: isDark ? 'transparent' : 'transparent',
                        color: isDark ? '#52525b' : '#71717a',
                        borderColor: isDark ? '#3f3f46' : '#d4d4d8',
                      }
                    })}
                  >
                    {sending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    ) : timerRunning ? (
                      <>
                        <Clock className={`h-4 w-4 ${timerUrgent ? 'text-red-400' : ''}`} />
                        <span>
                          Resend in{' '}
                          <span className={`font-mono font-bold ${timerUrgent ? 'text-red-400' : 'text-brand-blue'}`}>
                            {formatTime(secondsLeft)}
                          </span>
                        </span>
                      </>
                    ) : codeSent ? (
                      <><Send className="h-4 w-4" /> Resend Code</>
                    ) : (
                      <><Send className="h-4 w-4" /> Send Code</>
                    )}
                  </button>

                  {/* Send error */}
                  {sendError && (
                    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                      {sendError}
                    </div>
                  )}

                  {/* Send success */}
                  {sendSuccess && !sendError && (
                    <div className="mt-3 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green flex items-center gap-2">
                      <MailCheck className="h-4 w-4 shrink-0" />
                      {sendSuccess}
                    </div>
                  )}
                </div>

                {/* Divider — only shown after code is sent */}
                {codeSent && (
                  <>
                    <div className="relative mb-6 flex items-center">
                      <div className={`h-px flex-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <span className={`mx-3 text-xs ${muted}`}>Enter your code</span>
                      <div className={`h-px flex-1 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    </div>

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

                    {/* Verify button */}
                    <button
                      type="submit"
                      disabled={submitting || digits.join('').length < 6}
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
                  </>
                )}

                {/* Hint before code is sent */}
                {!codeSent && (
                  <p className={`text-center text-xs ${muted}`}>
                    Click <span className="text-brand-blue font-medium">Send Code</span> first — the 6-digit OTP will appear here.
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
