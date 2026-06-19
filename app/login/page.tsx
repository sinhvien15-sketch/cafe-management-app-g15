'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { auth } from '@/app/lib/firebase';
import { useAuth } from '@/app/lib/auth-context';
import { useLanguage } from '@/app/lib/i18n';
import type { Lang } from '@/app/lib/i18n';

// ── Validation — returns dict keys, not raw strings ───────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email)                     errors.email    = 'login_err_email_required';
  else if (!EMAIL_RE.test(email)) errors.email    = 'login_err_email_format';
  if (!password)                  errors.password = 'login_err_pw_required';
  else if (password.length < 6)   errors.password = 'login_err_pw_length';
  return errors;
}

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'login_err_invalid_credential';
    case 'auth/too-many-requests':
      return 'login_err_too_many_requests';
    case 'auth/user-disabled':
      return 'login_err_user_disabled';
    case 'auth/network-request-failed':
      return 'login_err_network';
    default:
      return 'login_err_default';
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [touched,   setTouched]   = useState({ email: false, password: false });
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [authError, setAuthError] = useState('');

  // If already authenticated, go straight to POS
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/pos');
    }
  }, [user, authLoading, router]);

  const errors  = validate(email, password);
  const isValid = Object.keys(errors).length === 0;

  const touch = (field: 'email' | 'password') =>
    setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;

    setLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/pos');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setAuthError(mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
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

  // Show coffee cup while auth state is resolving (avoids flash of login form)
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream">
        <span className="text-4xl" aria-hidden="true">☕</span>
        <p className="text-sm text-muted">{t('loading')}</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-cream px-4 py-12">

      {/* VI / EN toggle — top-right, independent of AppShell */}
      <div className="absolute right-4 top-4 flex items-center rounded-md border border-stone-200 bg-surface text-xs font-medium overflow-hidden shadow-sm">
        {(['vi', 'en'] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={[
              'px-3 py-1.5 transition-colors uppercase',
              lang === l
                ? 'bg-primary text-white'
                : 'text-muted hover:bg-stone-100',
            ].join(' ')}
            aria-label={l === 'vi' ? 'Tiếng Việt' : 'English'}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-8 text-center">
          <span className="text-5xl" aria-hidden="true">☕</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">CaféOS</h1>
          <p className="mt-1 text-sm text-muted">{t('login_subtitle')}</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-stone-100 bg-surface px-8 py-8 shadow-card">
          <h2 className="mb-6 text-lg font-semibold text-ink">{t('login_heading')}</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                {t('login_email_label')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('login_email_placeholder')}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                  onBlur={() => touch('email')}
                  aria-invalid={!!(touched.email && errors.email)}
                  aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                  className={inputCls('email', 'pl-10 pr-4')}
                />
              </div>
              {touched.email && errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-danger" role="alert">
                  {t(errors.email)}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                {t('login_password_label')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('login_password_placeholder')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                  onBlur={() => touch('password')}
                  aria-invalid={!!(touched.password && errors.password)}
                  aria-describedby={touched.password && errors.password ? 'pw-error' : undefined}
                  className={inputCls('password', 'pl-10 pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? t('login_aria_hide_pw') : t('login_aria_show_pw')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p id="pw-error" className="mt-1.5 text-xs text-danger" role="alert">
                  {t(errors.password)}
                </p>
              )}
            </div>

            {/* Firebase auth error (wrong credentials, etc.) */}
            {authError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">
                <AlertCircle className="h-4 w-4 flex-none" />
                {t(authError)}
              </div>
            )}

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
              {loading ? t('login_btn_loading') : t('login_btn')}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
