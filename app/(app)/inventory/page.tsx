'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  updateDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { db } from '@/app/lib/firebase';
import type { Ingredient, MenuItem, WithId } from '@/app/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortField  = 'name' | 'currentStock';
type SortDir    = 'asc' | 'desc';
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatNum = (n: number) => n.toLocaleString('vi-VN');

function getStatus(i: WithId<Ingredient>): StockStatus {
  if (i.currentStock === 0)             return 'out_of_stock';
  if (i.currentStock < i.minThreshold)  return 'low_stock';
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
  const Icon   = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={() => onSort(field)}
      className="group flex items-center gap-1 transition-colors hover:text-ink"
    >
      {label}
      <Icon className={[
        'h-3.5 w-3.5 transition-colors',
        active ? 'text-primary' : 'text-stone-400 group-hover:text-stone-600',
      ].join(' ')} />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  // ── Remote state ──────────────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<WithId<Ingredient>[]>([]);
  const [menuItems,   setMenuItems]   = useState<WithId<MenuItem>[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [sortField,    setSortField]    = useState<SortField | null>(null);
  const [sortDir,      setSortDir]      = useState<SortDir>('asc');
  const [restockTarget, setRestockTarget] = useState<WithId<Ingredient> | null>(null);
  const [restockQty,   setRestockQty]   = useState('');
  const [restockError, setRestockError] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', error: false });

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Ingredients: realtime — stock changes from POS orders appear instantly
    const unsubscribe = onSnapshot(
      collection(db, 'ingredients'),
      (snap) => {
        setIngredients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Ingredient) })));
        setLoading(false);
      },
      () => {
        setLoadError(true);
        setLoading(false);
      },
    );

    // Menu items: one-time load — only needed for the availability restore check
    getDocs(collection(db, 'menu_items')).then((snap) => {
      setMenuItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) })));
    });

    return () => unsubscribe();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const rows = ingredients
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name')         return a.name.localeCompare(b.name, 'vi') * dir;
      if (sortField === 'currentStock') return (a.currentStock - b.currentStock) * dir;
      return 0;
    });

  const outCount   = ingredients.filter((i) => getStatus(i) === 'out_of_stock').length;
  const lowCount   = ingredients.filter((i) => getStatus(i) === 'low_stock').length;
  const alertCount = outCount + lowCount;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const openRestock = (ingredient: WithId<Ingredient>) => {
    setRestockTarget(ingredient);
    setRestockQty('');
    setRestockError('');
  };

  const showToast = (message: string, error = false) => {
    setToast({ visible: true, message, error });
    setTimeout(() => setToast({ visible: false, message: '', error: false }), error ? 4000 : 3000);
  };

  const handleRestock = async () => {
    const qty = parseInt(restockQty, 10);
    if (!restockTarget) return;
    if (isNaN(qty) || qty <= 0) {
      setRestockError('Vui lòng nhập số lượng hợp lệ (lớn hơn 0)');
      return;
    }

    setRestockLoading(true);
    const now      = Timestamp.now();
    const newStock = restockTarget.currentStock + qty;

    try {
      // ── 1. Update ingredient currentStock ───────────────────────────────
      await updateDoc(doc(db, 'ingredients', restockTarget.id), {
        currentStock:    newStock,
        lastRestockedAt: now,
        updatedAt:       now,
      });

      // ── 2. Write audit record ────────────────────────────────────────────
      await addDoc(collection(db, 'stock_transactions'), {
        ingredientId:   restockTarget.id,
        type:           'restock',
        quantity:       qty,
        relatedOrderId: null,
        createdAt:      now,
      });

      // ── 3. Restore availability for menu items whose full recipe is met ──
      //
      // A menu item can go back to available = true only when EVERY ingredient
      // in its recipe has currentStock > 0 again.
      //
      // For the ingredient we just restocked: use newStock (state hasn't
      // updated yet via onSnapshot). For all others: use the live snapshot
      // values already in ingredients state.
      const toRestore = menuItems.filter((m) => {
        if (m.available) return false; // already available — skip
        return m.recipe.every((r) => {
          if (r.ingredientId === restockTarget.id) return newStock > 0;
          const ing = ingredients.find((i) => i.id === r.ingredientId);
          return ing ? ing.currentStock > 0 : false;
        });
      });

      if (toRestore.length > 0) {
        await Promise.all(
          toRestore.map((m) =>
            updateDoc(doc(db, 'menu_items', m.id), { available: true }),
          ),
        );
        // Sync local menuItems state so subsequent restocks in the same session
        // see the updated availability without a page reload
        setMenuItems((prev) =>
          prev.map((m) =>
            toRestore.some((r) => r.id === m.id) ? { ...m, available: true } : m,
          ),
        );
      }

      // ── Success ──────────────────────────────────────────────────────────
      const extra = toRestore.length > 0 ? ` — ${toRestore.length} món đã mở bán lại` : '';
      setRestockTarget(null);
      showToast(`✓ Đã nhập thêm ${formatNum(qty)} ${restockTarget.unit} ${restockTarget.name}${extra}`);

    } catch (err) {
      console.error('Restock failed:', err);
      setRestockTarget(null);
      showToast('✗ Nhập hàng thất bại, vui lòng thử lại', true);
    } finally {
      setRestockLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-h1 font-semibold text-ink">Kho nguyên liệu</h1>
        <p className="mt-1 text-sm text-muted">
          {loading ? 'Đang tải…' : `${ingredients.length} nguyên liệu`}
        </p>
      </div>

      {/* ── Alert banner ──────────────────────────────────────────────────── */}
      {!loading && alertCount > 0 && (
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

      {/* ── Search ────────────────────────────────────────────────────────── */}
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

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-stone-200 bg-stone-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <SortTh field="name" label="Nguyên liệu" current={sortField} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Đơn vị</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <SortTh field="currentStock" label="Tồn kho" current={sortField} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Ngưỡng cảnh báo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading skeleton */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-stone-100">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-4 animate-pulse rounded bg-stone-100" />
                  </td>
                ))}
              </tr>
            ))}

            {/* Error state */}
            {!loading && loadError && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-danger">
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-sm font-medium">Không thể tải dữ liệu — kiểm tra kết nối.</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty / no results */}
            {!loading && !loadError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  Không tìm thấy nguyên liệu nào
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading && !loadError && rows.map((ingredient) => {
              const status = getStatus(ingredient);
              const cfg    = STATUS_CONFIG[status];
              return (
                <tr
                  key={ingredient.id}
                  className={['border-b border-stone-100 last:border-0 transition-colors', cfg.row].join(' ')}
                >
                  <td className="px-4 py-3.5 font-medium text-ink">{ingredient.name}</td>
                  <td className="px-4 py-3.5 text-muted">{ingredient.unit}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{formatNum(ingredient.currentStock)}</td>
                  <td className="px-4 py-3.5 text-muted">{formatNum(ingredient.minThreshold)}</td>
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
            })}
          </tbody>
        </table>
      </div>

      {/* ── Restock modal ─────────────────────────────────────────────────── */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-h3 mb-1 font-semibold text-ink">Nhập hàng</h2>
            <p className="mb-5 text-sm text-muted">
              Nguyên liệu:{' '}
              <span className="font-semibold text-ink">{restockTarget.name}</span>
            </p>

            {/* Current stock */}
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
                'w-full rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1',
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
                disabled={restockLoading}
                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted hover:bg-stone-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRestock}
                disabled={restockLoading}
                className={[
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5',
                  'text-sm font-semibold transition-colors',
                  restockLoading
                    ? 'cursor-wait bg-primary/75 text-white'
                    : 'bg-primary text-white hover:bg-primary-hover',
                ].join(' ')}
              >
                {restockLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {restockLoading ? 'Đang lưu…' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast.visible && (
        <div
          className={[
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-white shadow-lg',
            toast.error ? 'bg-danger' : 'bg-accent',
          ].join(' ')}
        >
          {toast.error
            ? <AlertCircle className="h-5 w-5 flex-none" />
            : <CheckCircle className="h-5 w-5 flex-none" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </>
  );
}
