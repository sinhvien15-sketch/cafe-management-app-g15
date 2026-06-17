'use client';

import { useState } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { MOCK_INGREDIENTS, type Ingredient } from '@/app/lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortField = 'name' | 'currentStock';
type SortDir   = 'asc' | 'desc';
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatNum = (n: number) => n.toLocaleString('vi-VN');

function getStatus(i: Ingredient): StockStatus {
  if (i.currentStock === 0) return 'out_of_stock';
  if (i.currentStock < i.minThreshold) return 'low_stock';
  return 'in_stock';
}

const STATUS_CONFIG: Record<StockStatus, { label: string; badge: string; row: string }> = {
  in_stock:     { label: 'Còn hàng', badge: 'bg-emerald-100 text-emerald-700', row: ''           },
  low_stock:    { label: 'Sắp hết',  badge: 'bg-amber-100 text-amber-700',     row: 'bg-amber-50' },
  out_of_stock: { label: 'Hết hàng', badge: 'bg-red-100 text-red-700',         row: 'bg-red-50'   },
};

// ── Sort header button ────────────────────────────────────────────────────────

function SortTh({
  field, label, current, dir, onSort,
}: {
  field: SortField;
  label: string;
  current: SortField | null;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={() => onSort(field)}
      className="group flex items-center gap-1 transition-colors hover:text-ink"
    >
      {label}
      <Icon
        className={[
          'h-3.5 w-3.5 transition-colors',
          active ? 'text-primary' : 'text-stone-400 group-hover:text-stone-600',
        ].join(' ')}
      />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(MOCK_INGREDIENTS);
  const [search, setSearch]           = useState('');
  const [sortField, setSortField]     = useState<SortField | null>(null);
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [restockTarget, setRestockTarget] = useState<Ingredient | null>(null);
  const [restockQty, setRestockQty]   = useState('');
  const [restockError, setRestockError] = useState('');
  const [toast, setToast]             = useState({ visible: false, message: '' });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const rows = ingredients
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name')         return a.name.localeCompare(b.name, 'vi') * dir;
      if (sortField === 'currentStock') return (a.currentStock - b.currentStock) * dir;
      return 0;
    });

  const outCount  = ingredients.filter((i) => getStatus(i) === 'out_of_stock').length;
  const lowCount  = ingredients.filter((i) => getStatus(i) === 'low_stock').length;
  const alertCount = outCount + lowCount;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const openRestock = (ingredient: Ingredient) => {
    setRestockTarget(ingredient);
    setRestockQty('');
    setRestockError('');
  };

  const handleRestock = () => {
    const qty = parseInt(restockQty, 10);
    if (!restockTarget) return;
    if (isNaN(qty) || qty <= 0) {
      setRestockError('Vui lòng nhập số lượng hợp lệ (lớn hơn 0)');
      return;
    }
    setIngredients((prev) =>
      prev.map((i) =>
        i.id === restockTarget.id ? { ...i, currentStock: i.currentStock + qty } : i,
      ),
    );
    const msg = `✓ Đã nhập thêm ${formatNum(qty)} ${restockTarget.unit} ${restockTarget.name}`;
    setRestockTarget(null);
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-h1 font-semibold text-ink">Kho nguyên liệu</h1>
        <p className="mt-1 text-sm text-muted">{ingredients.length} nguyên liệu</p>
      </div>

      {/* ── Alert banner ────────────────────────────────────────────────────── */}
      {alertCount > 0 && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-none" />
          <span>
            {alertCount} nguyên liệu cần chú ý —{' '}
            <span className="text-red-600">{outCount} hết hàng</span>
            {outCount > 0 && lowCount > 0 && ', '}
            {lowCount > 0 && <span>{lowCount} sắp hết</span>}
          </span>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Tìm nguyên liệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <SortTh field="name" label="Nguyên liệu" current={sortField} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Đơn vị
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <SortTh field="currentStock" label="Tồn kho" current={sortField} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Ngưỡng cảnh báo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  Không tìm thấy nguyên liệu nào
                </td>
              </tr>
            ) : (
              rows.map((ingredient) => {
                const status = getStatus(ingredient);
                const cfg    = STATUS_CONFIG[status];
                return (
                  <tr
                    key={ingredient.id}
                    className={[
                      'border-b border-stone-100 last:border-0 transition-colors',
                      cfg.row,
                    ].join(' ')}
                  >
                    <td className="px-4 py-3.5 font-medium text-ink">{ingredient.name}</td>
                    <td className="px-4 py-3.5 text-muted">{ingredient.unit}</td>
                    <td className="px-4 py-3.5 font-semibold text-ink">
                      {formatNum(ingredient.currentStock)}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {formatNum(ingredient.minThreshold)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => openRestock(ingredient)}
                        className="rounded-lg bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/20"
                      >
                        Nhập hàng
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Restock modal ───────────────────────────────────────────────────── */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-h3 mb-1 font-semibold text-ink">Nhập hàng</h2>
            <p className="mb-5 text-sm text-muted">
              Nguyên liệu:{' '}
              <span className="font-semibold text-ink">{restockTarget.name}</span>
            </p>

            {/* Current stock info */}
            <div className="mb-4 rounded-lg bg-stone-50 px-4 py-3 text-sm">
              <span className="text-muted">Tồn kho hiện tại: </span>
              <span className="font-semibold text-ink">
                {formatNum(restockTarget.currentStock)} {restockTarget.unit}
              </span>
            </div>

            {/* Qty input */}
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Số lượng nhập thêm ({restockTarget.unit})
            </label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => { setRestockQty(e.target.value); setRestockError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRestock(); }}
              placeholder={`Nhập số lượng (${restockTarget.unit})`}
              autoFocus
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm text-ink',
                'focus:outline-none focus:ring-1',
                restockError
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-stone-200 focus:border-primary focus:ring-primary',
              ].join(' ')}
            />
            {restockError && (
              <p className="mt-1.5 text-xs text-danger">{restockError}</p>
            )}

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setRestockTarget(null)}
                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRestock}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-white shadow-lg">
          <CheckCircle className="h-5 w-5 flex-none" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </>
  );
}
