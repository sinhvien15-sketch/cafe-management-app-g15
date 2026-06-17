'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show a full-page loader while Firebase resolves the persisted session.
  // This prevents a flash of the protected page before the redirect fires.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream">
        <span className="text-4xl" aria-hidden="true">☕</span>
        <p className="text-sm text-muted">Đang xác thực…</p>
      </div>
    );
  }

  // Redirect is in flight — render nothing so there's no flash of content
  if (!user) return null;

  return <>{children}</>;
}
