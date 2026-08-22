'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { z } from 'zod';
import { Eye, EyeOff, Upload, User, Loader2, ArrowRight, Check } from 'lucide-react';

// ── Client-side validation schema (mirrors the server schema without File check) ──
const schema = z.object({
  name:     z.string().min(1, 'Name is required.'),
  email:    z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must contain minimum 6 characters.'),
});

// ── Upload avatar to ImageKit via the /api/imagekit-auth signing endpoint ──
async function uploadAvatarToImageKit(file: File): Promise<string> {
  // 1. Get auth params from our server
  const authRes = await fetch('/api/imagekit-auth');
  if (!authRes.ok) throw new Error('Could not get upload credentials.');
  const { token, expire, signature, publicKey } = await authRes.json();

  // 2. POST directly to ImageKit
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', `avatar_${Date.now()}_${file.name}`);
  formData.append('token', token);
  formData.append('expire', String(expire));
  formData.append('signature', signature);
  formData.append('publicKey', publicKey);
  formData.append('folder', '/avatars');

  const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!ikRes.ok) {
    const err = await ikRes.json().catch(() => ({}));
    throw new Error(err.message ?? 'Avatar upload failed.');
  }

  const ikData = await ikRes.json();
  return ikData.url as string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === 'dark';

  // ── Form state ──
  const [name,          setName]          = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword,  setShowPassword]  = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [submitting,    setSubmitting]    = useState(false);
  const [serverError,   setServerError]   = useState('');
  const [uploadStep,    setUploadStep]    = useState<'idle' | 'uploading' | 'registering'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Theme tokens ──
  const shell = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const panel = isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50';
  const input = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus:border-brand-blue focus:ring-brand-blue/20'
    : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-brand-blue focus:ring-brand-blue/20';
  const labelCls = isDark ? 'text-zinc-300' : 'text-zinc-700';

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate client-side: max 5 MB, image only
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: 'Image must be smaller than 5 MB.' }));
      return;
    }
    setErrors(prev => { const n = { ...prev }; delete n.avatar; return n; });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    // ── Client-side validation ──
    const result = schema.safeParse({ name, email, password });
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
      // ── Step 1: Upload avatar (if selected and ImageKit keys are configured) ──
      let avatarUrl = '';
      if (avatarFile) {
        try {
          setUploadStep('uploading');
          avatarUrl = await uploadAvatarToImageKit(avatarFile);
        } catch (uploadErr: any) {
          // ImageKit keys not configured yet → skip avatar silently
          // Only surface real errors (not missing-key errors)
          if (!uploadErr.message?.includes('credentials')) {
            setServerError(uploadErr.message ?? 'Avatar upload failed.');
            return;
          }
          // keys missing → proceed without avatar
          avatarUrl = '';
        }
      }

      // ── Step 2: Register user ──
      setUploadStep('registering');
      const res = await fetch('/api/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, avatar: avatarUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message ?? 'Something went wrong. Please try again.');
        return;
      }

      // ── Step 3: Persist email for verify-code page, then redirect ──
      sessionStorage.setItem('pending-verify-email', email);
      sessionStorage.setItem('pending-verify-name', name);
      router.push('/verify-code');

    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      setUploadStep('idle');
    }
  }

  // Loading label based on step
  const submitLabel =
    uploadStep === 'uploading'   ? 'Uploading photo…' :
    uploadStep === 'registering' ? 'Creating account…' :
    'Create account';

  return (
    <div className={`min-h-screen flex flex-col ${shell}`}>
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="CollabSync" width={130} height={18} />
        </Link>
        <Link href="/sign-in" className={`text-sm transition hover:text-brand-blue ${muted}`}>
          Already have an account?{' '}
          <span className="font-medium text-brand-blue">Sign in</span>
        </Link>
      </header>

      {/* ── Main ── */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Brand badge */}
          <div className="mb-6 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />
            <span className={`text-xs font-medium uppercase tracking-[0.18em] ${muted}`}>
              Create account
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Get started with{' '}
            <span className="text-brand-blue">Collab</span><span className="text-brand-green">Sync</span>
          </h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Set up your admin workspace in seconds.
          </p>

          <form onSubmit={handleSubmit} className={`mt-8 rounded-2xl border p-6 sm:p-8 ${panel}`}>

            {/* ── Avatar ── */}
            <div className="mb-6 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  avatarPreview
                    ? 'border-brand-blue'
                    : isDark
                    ? 'border-zinc-700 hover:border-brand-blue/50'
                    : 'border-zinc-300 hover:border-brand-blue/50'
                }`}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className={`h-6 w-6 ${muted}`} />
                )}
                {avatarPreview && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </button>

              <div>
                <p className={`text-sm font-medium ${labelCls}`}>Profile photo <span className={`font-normal ${muted}`}>(optional)</span></p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-0.5 flex items-center gap-1 text-xs text-brand-blue transition hover:text-brand-blue-dark"
                >
                  <Upload className="h-3 w-3" />
                  {avatarPreview ? 'Change photo' : 'Upload photo'}
                </button>
                {errors.avatar && <p className="mt-1 text-xs text-red-500">{errors.avatar}</p>}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
            </div>

            {/* ── Full name ── */}
            <div className="mb-4">
              <label className={`mb-1.5 block text-sm font-medium ${labelCls}`} htmlFor="signup-name">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ring-0 transition focus:ring-2 disabled:opacity-60 ${input} ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* ── Work email ── */}
            <div className="mb-4">
              <label className={`mb-1.5 block text-sm font-medium ${labelCls}`} htmlFor="signup-email">
                Work email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none ring-0 transition focus:ring-2 disabled:opacity-60 ${input} ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* ── Password ── */}
            <div className="mb-6">
              <label className={`mb-1.5 block text-sm font-medium ${labelCls}`} htmlFor="signup-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={submitting}
                  className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none ring-0 transition focus:ring-2 disabled:opacity-60 ${input} ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${muted} hover:text-brand-blue`}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* ── Server error ── */}
            {serverError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {serverError}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={submitting}
              id="signup-submit"
              className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition disabled:opacity-70"
              style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {submitLabel}
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className={`mt-4 text-center text-xs ${muted}`}>
              A verification code will be sent to your email.
            </p>
          </form>

          {/* ── Footer ── */}
          <p className={`mt-6 text-center text-xs ${muted}`}>
            By signing up you agree to our{' '}
            <span className="cursor-pointer text-brand-blue hover:underline">Terms</span>
            {' '}&amp;{' '}
            <span className="cursor-pointer text-brand-green hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </main>
    </div>
  );
}
