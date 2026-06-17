'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  BarChart3,
  BookOpen,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/app/lib/auth-context';

// ── Nav definition ────────────────────────────────────────────────────────────

const ALL_NAV = [
  { href: '/pos',       label: 'Bán hàng',        icon: ShoppingCart, ownerOnly: false },
  { href: '/inventory', label: 'Kho nguyên liệu',  icon: Package,      ownerOnly: false },
  { href: '/analytics', label: 'Phân tích',         icon: BarChart3,    ownerOnly: true  },
  { href: '/menu',      label: 'Quản lý menu',     icon: BookOpen,     ownerOnly: false },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Staff sees everything except /analytics (ownerOnly = true)
  const navItems = ALL_NAV.filter((item) =>
    !item.ownerOnly || user?.role === 'owner',
  );

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          'bg-surface border-r border-stone-200',
          'transition-transform duration-200 ease-in-out',
          'w-60',
          'md:static md:w-16 lg:w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex h-16 flex-none items-center justify-between border-b border-stone-200 px-4">
          <span className="text-h3 font-semibold text-primary md:hidden lg:block">☕ CaféOS</span>
          <span className="hidden text-xl md:block lg:hidden">☕</span>
          <button
            className="text-muted hover:text-ink md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={item.label}
                    className={[
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      'md:justify-center lg:justify-start',
                      active
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted hover:bg-stone-100 hover:text-ink',
                    ].join(' ')}
                  >
                    <item.icon className="h-5 w-5 flex-none" />
                    <span className="md:hidden lg:block">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Role badge (bottom of sidebar, desktop only) */}
        {user && (
          <div className="flex-none border-t border-stone-200 px-4 py-3 md:hidden lg:block">
            <p className="truncate text-xs font-medium text-ink">{user.name}</p>
            <p className="mt-0.5 text-xs text-muted capitalize">
              {user.role === 'owner' ? 'Chủ quán' : 'Nhân viên'}
            </p>
          </div>
        )}
      </aside>

      {/* ── Right column ──────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="flex h-16 flex-none items-center justify-between border-b border-stone-200 bg-surface px-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          {/* Left: hamburger + logo (mobile only) */}
          <div className="flex items-center gap-3">
            <button
              className="text-muted hover:text-ink md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-h3 font-semibold text-primary md:hidden">☕ CaféOS</span>
          </div>

          {/* Right: username + logout */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-ink">
              {user?.name ?? '…'}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-danger"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
