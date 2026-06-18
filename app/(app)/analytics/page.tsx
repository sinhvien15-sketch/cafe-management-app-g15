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
import type { Order, Ingredient } from '@/app/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalRevenue:    number;
  orderCount:      number;
  bestSelling:     string;
  bestSellingQty:  number;
  lowStockCount:   number;
  hourlyRevenue:   { hour: number; revenue: number }[];
  topItems:        { name: string; qty: number }[];
  paymentData:     { name: string; value: number }[];
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

  // Fetch today's orders and all ingredients in parallel
  const [ordersSnap, ingSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
      ),
    ),
    getDocs(collection(db, 'ingredients')),
  ]);

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
  const itemMap = new Map<string, { name: string; qty: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const cur = itemMap.get(item.menuItemId);
      if (cur) cur.qty += item.quantity;
      else itemMap.set(item.menuItemId, { name: item.name, qty: item.quantity });
    }
  }
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const bestSelling    = topItems[0]?.name ?? '—';
  const bestSellingQty = topItems[0]?.qty ?? 0;

  // ── Payment method distribution ────────────────────────────────────────────
  const payMap = { cash: 0, bank_transfer: 0 };
  for (const o of orders) payMap[o.paymentMethod]++;
  const paymentData = [
    { name: 'Tiền mặt',     value: payMap.cash          },
    { name: 'Chuyển khoản', value: payMap.bank_transfer  },
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
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-surface py-24 shadow-card">
      <BarChart2 className="h-16 w-16 text-stone-300" />
      <p className="mt-4 text-lg font-semibold text-stone-400">Chưa có dữ liệu hôm nay</p>
      <p className="mt-1 text-sm text-muted">Dữ liệu sẽ xuất hiện khi đơn hàng đầu tiên được tạo</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router  = useRouter();
  const { user } = useAuth();

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

  const hasData = (data?.orderCount ?? 0) > 0;

  const updatedLabel = lastUpdated
    ? `Cập nhật lúc ${lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    : 'Đang tải…';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-ink">Phân tích</h1>
          <p className="mt-1 text-sm text-muted">Dữ liệu hôm nay · {updatedLabel}</p>
        </div>
        <button
          onClick={() => fetch(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-stone-50 disabled:opacity-50"
          aria-label="Làm mới dữ liệu"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* ── Fetch error banner ─────────────────────────────────────────────── */}
      {fetchError && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle className="h-4 w-4 flex-none" />
          Không thể tải dữ liệu — kiểm tra kết nối rồi nhấn Làm mới.
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Doanh thu hôm nay"
          value={data ? formatVND(data.totalRevenue) : '—'}
          icon={<TrendingUp className="h-5 w-5" />}
          skeleton={loading}
        />
        <KpiCard
          label="Số đơn hàng"
          value={data ? String(data.orderCount) : '—'}
          icon={<ShoppingBag className="h-5 w-5" />}
          skeleton={loading}
        />
        <KpiCard
          label="Món bán chạy nhất"
          value={data ? data.bestSelling : '—'}
          sub={data && data.bestSellingQty > 0 ? `${data.bestSellingQty} đơn` : undefined}
          icon={<Award className="h-5 w-5" />}
          skeleton={loading}
        />
        <KpiCard
          label="Nguyên liệu sắp hết"
          value={data ? (data.lowStockCount > 0 ? `${data.lowStockCount} mục` : 'Đủ hàng') : '—'}
          sub={data && data.lowStockCount > 0 ? 'Nhấn để xem chi tiết' : undefined}
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
            <h2 className="text-h3 mb-5 font-semibold text-ink">Doanh thu theo giờ</h2>
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
                    formatter={(v) => [typeof v === 'number' ? formatVND(v) : '—', 'Doanh thu']}
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
              <h2 className="text-h3 mb-5 font-semibold text-ink">Top 5 món bán chạy</h2>
              {mounted ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data!.topItems}
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
                      formatter={(v) => [typeof v === 'number' ? v + ' đơn' : '—', 'Số lượng']}
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
              <h2 className="text-h3 mb-5 font-semibold text-ink">Hình thức thanh toán</h2>
              {mounted ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data!.paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      outerRadius={78}
                      strokeWidth={0}
                    >
                      {data!.paymentData.map((_, i) => (
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
                      formatter={(v, name) => [typeof v === 'number' ? v + ' đơn' : '—', name]}
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
