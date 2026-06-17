'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Award,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const HOURLY_REVENUE = [
  { hour: 8,  revenue:  85000 },
  { hour: 9,  revenue: 195000 },
  { hour: 10, revenue: 175000 },
  { hour: 11, revenue: 130000 },
  { hour: 12, revenue: 290000 },
  { hour: 13, revenue: 265000 },
  { hour: 14, revenue: 150000 },
  { hour: 15, revenue: 110000 },
  { hour: 16, revenue: 145000 },
  { hour: 17, revenue: 200000 },
  { hour: 18, revenue: 240000 },
  { hour: 19, revenue: 195000 },
  { hour: 20, revenue: 140000 },
  { hour: 21, revenue:  95000 },
  { hour: 22, revenue:  60000 },
];

const PAYMENT_DATA = [
  { name: 'Tiền mặt',     value: 22 },
  { name: 'Chuyển khoản', value: 16 },
];

const TOP_ITEMS = [
  { name: 'Cà phê sữa',     qty: 15 },
  { name: 'Cà phê đen',     qty: 12 },
  { name: 'Trà đào cam sả', qty: 9  },
  { name: 'Sinh tố bơ',     qty: 7  },
  { name: 'Bạc xỉu',        qty: 6  },
];

const PIE_COLORS = ['#92400E', '#D97706'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatVND  = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
const fmtYAxis   = (v: number) => `${(v / 1000).toFixed(0)}k`;

// ── Sub-components ────────────────────────────────────────────────────────────

type KpiProps = {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaUp?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  href?: string;
};

function KpiCard({ label, value, sub, delta, deltaUp, icon, iconBg = 'bg-primary/10 text-primary', href }: KpiProps) {
  const inner = (
    <div className="flex h-full flex-col rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
      {/* pr-11 reserves 44 px on the right for the icon; min-h ensures the
          container is never shorter than the icon (36 px) even on 1-line labels */}
      <div className="relative mb-3 min-h-[2.5rem] pr-11">
        <span className={`absolute right-0 top-0 rounded-lg p-2 ${iconBg}`}>{icon}</span>
        <p className="text-xs font-medium text-muted">{label}</p>
      </div>
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

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #e7e5e4',
  fontSize: '13px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Phase 2: replace with real check — orders.length > 0 for today
  const hasData = true;

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-h1 font-semibold text-ink">Phân tích</h1>
        <p className="mt-1 text-sm text-muted">Dữ liệu hôm nay</p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Doanh thu hôm nay"
          value="2.450.000đ"
          delta="+12% so với hôm qua"
          deltaUp
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="Số đơn hàng"
          value="38"
          delta="+5 so với hôm qua"
          deltaUp
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <KpiCard
          label="Món bán chạy nhất"
          value="Cà phê sữa"
          sub="15 đơn"
          icon={<Award className="h-5 w-5" />}
        />
        <KpiCard
          label="Nguyên liệu sắp hết"
          value="2 mục"
          sub="Nhấn để xem chi tiết"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg="bg-warning/10 text-warning"
          href="/inventory"
        />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {hasData ? (
        <div className="space-y-6">

          {/* Revenue by hour */}
          <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card">
            <h2 className="text-h3 mb-5 font-semibold text-ink">Doanh thu theo giờ</h2>
            {mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={HOURLY_REVENUE}
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
                    formatter={(value: number | string) => [formatVND(Number(value)), 'Doanh thu']}
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

          {/* Bottom row: top items + payment pie */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Top 5 best-selling items */}
            <div className="rounded-xl border border-stone-100 bg-surface p-5 shadow-card lg:col-span-2">
              <h2 className="text-h3 mb-5 font-semibold text-ink">Top 5 món bán chạy</h2>
              {mounted ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={TOP_ITEMS}
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
                      formatter={(value: number | string) => [Number(value) + ' đơn', 'Số lượng']}
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
                      data={PAYMENT_DATA}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      outerRadius={78}
                      strokeWidth={0}
                    >
                      {PAYMENT_DATA.map((_, i) => (
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
                      formatter={(value: number | string, name: string) => [Number(value) + ' đơn', name]}
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
        <EmptyState />
      )}
    </>
  );
}
