'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email)                    errors.email    = 'Vui lòng nhập email';
  else if (!EMAIL_RE.test(email)) errors.email   = 'Email không đúng định dạng';
  if (!password)                 errors.password = 'Vui lòng nhập mật khẩu';
  else if (password.length < 6) errors.password  = 'Mật khẩu phải có ít nhất 6 ký tự';
  return errors;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [touched,  setTouched]  = useState({ email: false, password: false });
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const errors  = validate(email, password);
  const isValid = Object.keys(errors).length === 0;

  const touch = (field: 'email' | 'password') =>
    setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;

    setLoading(true);
    // Phase 1 mock: any valid credentials succeed after 1 s
    await new Promise((r) => setTimeout(r, 1000));
    router.push('/pos');
  };

  // ── Shared input class builder ─────────────────────────────────────────────

  const inputCls = (field: 'email' | 'password', extra: string) =>
    [
      'w-full rounded-lg border py-2.5 text-sm text-ink placeholder:text-muted',
      'focus:outline-none focus:ring-1 transition-colors',
      extra,
      touched[field] && errors[field]
        ? 'border-danger focus:border-danger focus:ring-danger'
        : 'border-stone-200 focus:border-primary focus:ring-primary',
    ].join(' ');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-8 text-center">
          <span className="text-5xl" aria-hidden="true">☕</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">CaféOS</h1>
          <p className="mt-1 text-sm text-muted">Hệ thống quản lý quán cà phê</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-stone-100 bg-surface px-8 py-8 shadow-card">
          <h2 className="mb-6 text-lg font-semibold text-ink">Đăng nhập</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ten@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch('email')}
                  aria-invalid={!!(touched.email && errors.email)}
                  aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                  className={inputCls('email', 'pl-10 pr-4')}
                />
              </div>
              {touched.email && errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-danger" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => touch('password')}
                  aria-invalid={!!(touched.password && errors.password)}
                  aria-describedby={touched.password && errors.password ? 'pw-error' : undefined}
                  className={inputCls('password', 'pl-10 pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p id="pw-error" className="mt-1.5 text-xs text-danger" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !isValid}
              className={[
                'mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2.5',
                'text-sm font-semibold transition-colors',
                loading
                  ? 'cursor-wait bg-primary/75 text-white'
                  : !isValid
                  ? 'cursor-not-allowed bg-stone-100 text-muted'
                  : 'bg-primary text-white hover:bg-primary-hover',
              ].join(' ')}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Phase 1 hint */}
        <p className="mt-5 text-center text-xs text-muted">
          Phase 1 — nhập bất kỳ email hợp lệ và mật khẩu ≥ 6 ký tự để đăng nhập
        </p>

      </div>
    </main>
  );
}
