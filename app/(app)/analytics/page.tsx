'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingBag, Award,
  AlertTriangle, BarChart2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/lib/auth-context';
import type { Order, Ingredient, MenuItem, LocalizedText } from '@/app/lib/types';
import { getLocalized, useLanguage } from '@/app/lib/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalRevenue:    number;
  orderCount:      number;
  bestSelling:     LocalizedText | string;   // raw from order — resolved with getLocalized at render
  bestSellingQty:  number;
  lowStockCount:   number;
  hourlyRevenue:   { hour: number; revenue: number }[];
  topItems:        { name: LocalizedText | string; qty: number }[];  // raw — resolved at render
  paymentData:     { name: 'cash' | 'bank_transfer'; value: number }[];  // raw keys — resolved at render
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#92400E', '#D97706'];

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #e7e5e4',
  fontSize: '13px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
const fmtYAxis  = (v: number) => `${(v / 1000).toFixed(0)}k`;

// ── Data fetching ─────────────────────────────────────────────────────────────

async function loadAnalytics(): Promise<AnalyticsData> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch today's orders, ingredients, and menu items in parallel.
  // menu_items is fetched here (not from order snapshots) so that item names
  // are always the current bilingual { vi, en } version, regardless of when
  // the order was placed. Orders created before the bilingual migration stored
  // name as a plain Vietnamese string — using the live menu_items record fixes
  // the display without requiring a data migration on historical orders.
  const [ordersSnap, ingSnap, menuSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
      ),
    ),
    getDocs(collection(db, 'ingredients')),
    getDocs(collection(db, 'menu_items')),
  ]);

  // Build a menuItemId → name map from the live menu_items collection
  const menuNameMap = new Map<string, LocalizedText | string>();
  for (const d of menuSnap.docs) {
    menuNameMap.set(d.id, (d.data() as MenuItem).name);
  }

  const orders = ordersSnap.docs.map((d) => d.data() as Order);

  // ── KPI: revenue + order count ─────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const orderCount   = orders.length;

  // ── Revenue by hour (slots 8–22, filled with 0 for empty hours) ────────────
  const hourMap = new Map<number, number>();
  for (const o of orders) {
    const h = o.createdAt.toDate().getHours();
    hourMap.set(h, (hourMap.get(h) ?? 0) + o.totalAmount);
  }
  const hourlyRevenue = Array.from({ length: 15 }, (_, i) => ({
    hour:    i + 8,
    revenue: hourMap.get(i + 8) ?? 0,
  }));

  // ── Top 5 items by total quantity sold ─────────────────────────────────────
  // Groups by menuItemId (not name) — avoids counting the same item twice if
  // its name appears in different languages across old and new orders.
  const itemMap = new Map<string, { name: LocalizedText | string; qty: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const cur = itemMap.get(item.menuItemId);
      if (cur) cur.qty += item.quantity;
      else itemMap.set(item.menuItemId, {
        // Prefer the live menu_items name (always bilingual); fall back to the
        // order snapshot only if the item has since been deleted from the menu.
        name: menuNameMap.get(item.menuItemId) ?? item.name,
        qty:  item.quantity,
      });
    }
  }
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const bestSelling    = topItems[0]?.name ?? '—';
  const bestSellingQty = topItems[0]?.qty ?? 0;

  // ── Payment method distribution ────────────────────────────────────────────
  // Store raw keys ('cash' / 'bank_transfer') so the component can translate
  // them with t() — loadAnalytics() runs outside the React tree and has no
  // access to the language context.
  const payMap = { cash: 0, bank_transfer: 0 };
  for (const o of orders) payMap[o.paymentMethod]++;
  const paymentData = [
    { name: 'cash' as const,          value: payMap.cash         },
    { name: 'bank_transfer' as const, value: payMap.bank_transfer },
  ].filter((d) => d.value > 0);

  // ── Low-stock ingredients ──────────────────────────────────────────────────
  // Firestore cannot compare two fields in a single where() clause, so we
  // fetch all ingredients and filter client-side (small collection, acceptable).
  const lowStockCount = ingSnap.docs.filter((d) => {
    const ing = d.data() as Ingredient;
    return ing.currentStock < ing.minThreshold;
  }).length;

  return {
    totalRevenue, orderCount, bestSelling, bestSellingQty,
    lowStockCount, hourlyRevenue, topItems, paymentData,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

type KpiProps = {
  label:     string;
  value:     string;
  sub?:      string;
  delta?:    string;
  deltaUp?:  boolean;
  icon:      React.ReactNode;
  iconBg?:   string;
  href?:     string;
  skeleton?: boolean;
};

function KpiCard({
  label, value, sub, delta, deltaUp,
  icon, iconBg = 'bg-primary/10 text-primary', href, skeleton,
}: KpiProps) {
  const inner = (
    <div className="flex h-full flex-col rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
      <div className="relative mb-3 min-h-[2.5rem] pr-11">
        <span className={`absolute right-0 top-0 rounded-lg p-2 ${iconBg}`}>{icon}</span>
        <p className="text-xs font-medium text-muted">{label}</p>
      </div>
      {skeleton ? (
        <div className="mt-1 h-7 w-3/4 animate-pulse rounded bg-stone-100" />
      ) : (
        <>
          <p className="break-words text-xl font-bold text-ink sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
          {delta && (
            <p className={`mt-2 flex items-center gap-0.5 text-xs font-medium ${deltaUp ? 'text-accent' : 'text-danger'}`}>
              {deltaUp
                ? <TrendingUp  className="h-3.5 w-3.5 flex-none" />
                : <TrendingDown className="h-3.5 w-3.5 flex-none" />}
              {delta}
            </p>
          )}
        </>
      )}
    </div>
  );
  return href
    ? <Link href={href} className="block transition-opacity hover:opacity-90">{inner}</Link>
    : inner;
}

function ChartSkeleton({ height }: { height: number }) {
  return <div className="animate-pulse rounded-lg bg-stone-100" style={{ height }} />;
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-surface py-24 shadow-card">
      <BarChart2 className="h-16 w-16 text-stone-300" />
      <p className="mt-4 text-lg font-semibold text-stone-400">{t('analytics_empty_title')}</p>
      <p className="mt-1 text-sm text-muted">{t('analytics_empty_sub')}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router    = useRouter();
  const { user }  = useAuth();
  const { lang, t } = useLanguage();

  const [mounted,     setMounted]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(false);
  const [data,        setData]        = useState<AnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  // Staff cannot access analytics — redirect to POS if role is not owner
  useEffect(() => {
    if (user && user.role !== 'owner') {
      router.replace('/pos');
    }
  }, [user, router]);

  // Recharts uses browser APIs — must wait for client mount before rendering
  useEffect(() => { setMounted(true); }, []);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(false);
    try {
      const result = await loadAnalytics();
      setData(result);
      setLastUpdated(new Date());
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Resolve LocalizedText names into display strings for the current language
  const displayTopItems = (data?.topItems ?? []).map((item) => ({
    name: getLocalized(item.name, lang),
    qty:  item.qty,
  }));
  const displayBestSelling = data ? getLocalized(data.bestSelling, lang) : '—';

  // Resolve payment method keys to translated labels for the Pie chart
  const displayPaymentData = (data?.paymentData ?? []).map((d) => ({
    ...d,
    name: d.name === 'cash' ? t('analytics_payment_cash') : t('analytics_payment_transfer'),
  }));

  const hasData = (data?.orderCount ?? 0) > 0;

  const timeLocale   = lang === 'vi' ? 'vi-VN' : 'en-US';
  const updatedLabel = lastUpdated
    ? `${t('analytics_updated_at')} ${lastUpdated.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}`
    : t('analytics_loading_label');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-ink">{t('analytics_title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('analytics_data_prefix')} {updatedLabel}</p>
        </div>
        <button
          onClick={() => fetch(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-stone-50 disabled:opacity-50"
          aria-label={t('analytics_btn_refresh')}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('analytics_btn_refresh')}
        </button>
      </div>

      {/* ── Fetch error banner ─────────────────────────────────────────────── */}
      {fetchError && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle className="h-4 w-4 flex-none" />
          {t('analytics_err_load')}
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t('analytics_kpi_revenue')}
          value={data ? formatVND(data.totalRevenue) : '—'}
          icon={<TrendingUp className="h-5 w-5" />}
          skeleton={loading}
        />
        <KpiCard
          label={t('analytics_kpi_orders')}
          value={data ? String(data.orderCount) : '—'}
          icon={<ShoppingBag className="h-5 w-5" />}
          skeleton={loading}
        />
        <KpiCard
          label={t('analytics_kpi_best_seller')}
          value={displayBestSelling}
          sub={data && data.bestSellingQty > 0
            ? `${data.bestSellingQty} ${t('analytics_kpi_orders_unit')}`
            : undefined}
          icon={<Award className="h-5 w-5" />}
          skeleton={loading}
        />
        <KpiCard
          label={t('analytics_kpi_low_stock')}
          value={data
            ? (data.lowStockCount > 0
                ? `${data.lowStockCount} ${t('analytics_kpi_low_stock_unit')}`
                : t('analytics_kpi_low_stock_ok'))
            : '—'}
          sub={data && data.lowStockCount > 0 ? t('analytics_kpi_low_stock_sub') : undefined}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-warning/10 text-warning"
          href={data && data.lowStockCount > 0 ? '/inventory' : undefined}
          skeleton={loading}
        />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {!loading && (hasData ? (
        <div className="space-y-6">

          {/* Revenue by hour */}
          <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
            <h2 className="text-h3 mb-5 font-semibold text-ink">{t('analytics_chart_hourly')}</h2>
            {mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data!.hourlyRevenue}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h: number) => `${h}h`}
                    tick={{ fontSize: 12, fill: '#78716C' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtYAxis}
                    tick={{ fontSize: 12, fill: '#78716C' }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    formatter={(v) => [
                      typeof v === 'number' ? formatVND(v) : '—',
                      t('analytics_tooltip_revenue'),
                    ]}
                    labelFormatter={(h) => `${h}:00 – ${Number(h) + 1}:00`}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="revenue" fill="#92400E" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton height={300} />
            )}
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Top 5 best-selling items */}
            <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card lg:col-span-2">
              <h2 className="text-h3 mb-5 font-semibold text-ink">{t('analytics_chart_top5')}</h2>
              {mounted ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={displayTopItems}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: '#78716C' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 12, fill: '#1C1917' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [
                        typeof v === 'number' ? `${v} ${t('analytics_tooltip_orders_unit')}` : '—',
                        t('analytics_tooltip_qty'),
                      ]}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar dataKey="qty" fill="#D97706" radius={[0, 4, 4, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton height={240} />
              )}
            </div>

            {/* Payment method ratio */}
            <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
              <h2 className="text-h3 mb-5 font-semibold text-ink">{t('analytics_chart_payment')}</h2>
              {mounted ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={displayPaymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      outerRadius={78}
                      strokeWidth={0}
                    >
                      {displayPaymentData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span style={{ fontSize: '12px', color: '#78716C' }}>{value}</span>
                      )}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        typeof v === 'number' ? `${v} ${t('analytics_tooltip_orders_unit')}` : '—',
                        name,
                      ]}
                      contentStyle={TOOLTIP_STYLE}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ChartSkeleton height={240} />
              )}
            </div>

          </div>
        </div>
      ) : (
        !fetchError && <EmptyState />
      ))}

      {/* Chart skeletons while loading */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
            <div className="mb-5 h-5 w-48 animate-pulse rounded bg-stone-100" />
            <ChartSkeleton height={300} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card lg:col-span-2">
              <div className="mb-5 h-5 w-40 animate-pulse rounded bg-stone-100" />
              <ChartSkeleton height={240} />
            </div>
            <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
              <div className="mb-5 h-5 w-36 animate-pulse rounded bg-stone-100" />
              <ChartSkeleton height={240} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
