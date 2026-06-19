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
  Phone,
  MapPin,
  MessageCircle,
  Pencil,
  X,
  Building2,
} from 'lucide-react';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/lib/auth-context';
import type { Ingredient, Supplier, MenuItem, WithId } from '@/app/lib/types';
import { getLocalized } from '@/app/lib/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortField   = 'name' | 'currentStock';
type SortDir     = 'asc' | 'desc';
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

interface EditForm {
  name:         string;
  unit:         string;
  minThreshold: string;
  hasSupplier:  boolean;
  supName:      string;
  supPhone:     string;
  supZalo:      string;
  supAddress:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatNum = (n: number) => n.toLocaleString('vi-VN');

function getStatus(i: WithId<Ingredient>): StockStatus {
  if (i.currentStock === 0)            return 'out_of_stock';
  if (i.currentStock < i.minThreshold) return 'low_stock';
  return 'in_stock';
}

const STATUS_CONFIG: Record<StockStatus, { label: string; badge: string; row: string }> = {
  in_stock:     { label: 'Còn hàng', badge: 'bg-emerald-100 text-emerald-700', row: ''            },
  low_stock:    { label: 'Sắp hết',  badge: 'bg-amber-100 text-amber-700',     row: 'bg-amber-50' },
  out_of_stock: { label: 'Hết hàng', badge: 'bg-red-100 text-red-700',         row: 'bg-red-50'   },
};

function toEditForm(ing: WithId<Ingredient>): EditForm {
  return {
    name:         getLocalized(ing.name, 'vi'),
    unit:         ing.unit,
    minThreshold: String(ing.minThreshold),
    hasSupplier:  ing.supplier !== null,
    supName:      ing.supplier?.name    ?? '',
    supPhone:     ing.supplier?.phone   ?? '',
    supZalo:      ing.supplier?.zalo    ?? '',
    supAddress:   ing.supplier?.address ?? '',
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const { user } = useAuth();
  const isOwner  = user?.role === 'owner';

  // ── Remote state ──────────────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<WithId<Ingredient>[]>([]);
  const [menuItems,   setMenuItems]   = useState<WithId<MenuItem>[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir,   setSortDir]   = useState<SortDir>('asc');
  const [toast,     setToast]     = useState({ visible: false, message: '', error: false });

  // ── Restock modal state ────────────────────────────────────────────────────
  const [restockTarget,  setRestockTarget]  = useState<WithId<Ingredient> | null>(null);
  const [restockQty,     setRestockQty]     = useState('');
  const [restockError,   setRestockError]   = useState('');
  const [restockLoading, setRestockLoading] = useState(false);

  // ── Supplier detail modal state ────────────────────────────────────────────
  const [supplierTarget, setSupplierTarget] = useState<WithId<Ingredient> | null>(null);

  // ── Edit modal state ───────────────────────────────────────────────────────
  const [editTarget,  setEditTarget]  = useState<WithId<Ingredient> | null>(null);
  const [editForm,    setEditForm]    = useState<EditForm | null>(null);
  const [editErrors,  setEditErrors]  = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'ingredients'),
      (snap) => {
        setIngredients(snap.docs.map((d) => {
          const data = d.data() as Ingredient;
          return {
            id: d.id,
            ...data,
            supplier: data.supplier ?? null,   // old docs without this field → null
          };
        }));
        setLoading(false);
        setLoadError(false);
      },
      () => { setLoadError(true); setLoading(false); },
    );

    getDocs(collection(db, 'menu_items')).then((snap) => {
      setMenuItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) })));
    });

    return () => unsubscribe();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const rows = ingredients
    .filter((i) => getLocalized(i.name, 'vi').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;
      const d = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name')         return getLocalized(a.name, 'vi').localeCompare(getLocalized(b.name, 'vi'), 'vi') * d;
      if (sortField === 'currentStock') return (a.currentStock - b.currentStock) * d;
      return 0;
    });

  const outCount   = ingredients.filter((i) => getStatus(i) === 'out_of_stock').length;
  const lowCount   = ingredients.filter((i) => getStatus(i) === 'low_stock').length;
  const alertCount = outCount + lowCount;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (message: string, error = false) => {
    setToast({ visible: true, message, error });
    setTimeout(() => setToast({ visible: false, message: '', error: false }), error ? 4000 : 3000);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Restock handlers ──────────────────────────────────────────────────────
  const openRestock = (ingredient: WithId<Ingredient>) => {
    setRestockTarget(ingredient);
    setRestockQty('');
    setRestockError('');
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
      await updateDoc(doc(db, 'ingredients', restockTarget.id), {
        currentStock:    newStock,
        lastRestockedAt: now,
        updatedAt:       now,
      });

      await addDoc(collection(db, 'stock_transactions'), {
        ingredientId:   restockTarget.id,
        type:           'restock',
        quantity:       qty,
        relatedOrderId: null,
        createdAt:      now,
      });

      // Restore availability for menu items whose full recipe is now covered
      const toRestore = menuItems.filter((m) => {
        if (m.available) return false;
        return m.recipe.every((r) => {
          if (r.ingredientId === restockTarget.id) return newStock > 0;
          const ing = ingredients.find((i) => i.id === r.ingredientId);
          return ing ? ing.currentStock > 0 : false;
        });
      });

      if (toRestore.length > 0) {
        await Promise.all(
          toRestore.map((m) => updateDoc(doc(db, 'menu_items', m.id), { available: true })),
        );
        setMenuItems((prev) =>
          prev.map((m) =>
            toRestore.some((r) => r.id === m.id) ? { ...m, available: true } : m,
          ),
        );
      }

      const extra = toRestore.length > 0 ? ` — ${toRestore.length} món đã mở bán lại` : '';
      const ingName = getLocalized(restockTarget.name, 'vi');
      setRestockTarget(null);
      showToast(`✓ Đã nhập thêm ${formatNum(qty)} ${restockTarget.unit} ${ingName}${extra}`);

    } catch {
      setRestockTarget(null);
      showToast('✗ Nhập hàng thất bại, vui lòng thử lại', true);
    } finally {
      setRestockLoading(false);
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEdit = (ingredient: WithId<Ingredient>) => {
    setEditTarget(ingredient);
    setEditForm(toEditForm(ingredient));
    setEditErrors({});
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditForm(null);
    setEditErrors({});
  };

  const setEF = (patch: Partial<EditForm>) =>
    setEditForm((f) => f ? { ...f, ...patch } : f);

  const validateEdit = (): boolean => {
    if (!editForm) return false;
    const e: Record<string, string> = {};
    if (!editForm.name.trim())         e.name = 'Vui lòng nhập tên nguyên liệu';
    if (!editForm.unit.trim())         e.unit = 'Vui lòng nhập đơn vị';
    const t = parseFloat(editForm.minThreshold);
    if (!editForm.minThreshold || isNaN(t) || t < 0) e.minThreshold = 'Ngưỡng phải ≥ 0';
    if (editForm.hasSupplier) {
      if (!editForm.supName.trim())  e.supName  = 'Vui lòng nhập tên nhà cung cấp';
      if (!editForm.supPhone.trim()) e.supPhone = 'Vui lòng nhập số điện thoại';
    }
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm || !validateEdit()) return;
    setEditLoading(true);

    const supplier: Supplier | null = editForm.hasSupplier
      ? {
          name:    editForm.supName.trim(),
          phone:   editForm.supPhone.trim(),
          zalo:    editForm.supZalo.trim(),
          address: editForm.supAddress.trim(),
        }
      : null;

    try {
      await updateDoc(doc(db, 'ingredients', editTarget.id), {
        name:         { vi: editForm.name.trim(), en: editForm.name.trim() },
        unit:         editForm.unit.trim(),
        minThreshold: parseFloat(editForm.minThreshold),
        supplier,
        updatedAt:    Timestamp.now(),
      });
      closeEdit();
      showToast(`✓ Đã cập nhật "${editForm.name.trim()}"`);
    } catch {
      showToast('✗ Cập nhật thất bại, vui lòng thử lại', true);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Column count (changes with role) ──────────────────────────────────────
  const COL_COUNT = 7;

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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Nhà cung cấp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading skeleton */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-stone-100">
                {Array.from({ length: COL_COUNT }).map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-4 animate-pulse rounded bg-stone-100" />
                  </td>
                ))}
              </tr>
            ))}

            {/* Error state */}
            {!loading && loadError && (
              <tr>
                <td colSpan={COL_COUNT} className="px-4 py-12 text-center">
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
                <td colSpan={COL_COUNT} className="px-4 py-12 text-center text-sm text-muted">
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
                  <td className="px-4 py-3.5 font-medium text-ink">{getLocalized(ingredient.name, 'vi')}</td>
                  <td className="px-4 py-3.5 text-muted">{ingredient.unit}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{formatNum(ingredient.currentStock)}</td>
                  <td className="px-4 py-3.5 text-muted">{formatNum(ingredient.minThreshold)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </td>

                  {/* Supplier column */}
                  <td className="px-4 py-3.5">
                    {ingredient.supplier ? (
                      <button
                        onClick={() => setSupplierTarget(ingredient)}
                        className="flex items-center gap-1.5 text-left text-sm text-primary transition-colors hover:text-primary-hover hover:underline"
                      >
                        <Building2 className="h-3.5 w-3.5 flex-none" />
                        {ingredient.supplier.name}
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">Chưa có</span>
                    )}
                  </td>

                  {/* Action column */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRestock(ingredient)}
                        className="rounded-lg bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/20"
                      >
                        Nhập hàng
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => openEdit(ingredient)}
                          className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                      )}
                    </div>
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
              <span className="font-semibold text-ink">{getLocalized(restockTarget.name, 'vi')}</span>
            </p>

            <div className="mb-4 rounded-lg bg-stone-50 px-4 py-3 text-sm">
              <span className="text-muted">Tồn kho hiện tại: </span>
              <span className="font-semibold text-ink">
                {formatNum(restockTarget.currentStock)} {restockTarget.unit}
              </span>
            </div>

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
            {restockError && <p className="mt-1.5 text-xs text-danger">{restockError}</p>}

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
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
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

      {/* ── Supplier detail modal ──────────────────────────────────────────── */}
      {supplierTarget?.supplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Nhà cung cấp · {getLocalized(supplierTarget.name, 'vi')}
                </p>
                <h2 className="mt-1 text-lg font-bold text-ink">
                  {supplierTarget.supplier.name}
                </h2>
              </div>
              <button
                onClick={() => setSupplierTarget(null)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Phone */}
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-xs text-muted">Điện thoại</p>
                  <a
                    href={`tel:${supplierTarget.supplier.phone}`}
                    className="text-sm font-medium text-ink hover:text-primary hover:underline"
                  >
                    {supplierTarget.supplier.phone}
                  </a>
                </div>
              </div>

              {/* Zalo */}
              {supplierTarget.supplier.zalo && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-sky-50">
                    <MessageCircle className="h-4 w-4 text-sky-500" />
                  </span>
                  <div>
                    <p className="text-xs text-muted">Zalo</p>
                    <a
                      href={`https://zalo.me/${supplierTarget.supplier.zalo.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-ink hover:text-sky-600 hover:underline"
                    >
                      {supplierTarget.supplier.zalo}
                    </a>
                  </div>
                </div>
              )}

              {/* Address */}
              {supplierTarget.supplier.address && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-amber-50">
                    <MapPin className="h-4 w-4 text-amber-600" />
                  </span>
                  <div>
                    <p className="text-xs text-muted">Địa chỉ</p>
                    <p className="text-sm font-medium text-ink">
                      {supplierTarget.supplier.address}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSupplierTarget(null)}
              className="mt-6 w-full rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ── Edit ingredient modal (owner only) ────────────────────────────── */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">

              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-h3 font-semibold text-ink">Chỉnh sửa nguyên liệu</h2>
                <button
                  onClick={closeEdit}
                  disabled={editLoading}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink disabled:opacity-50"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Tên nguyên liệu <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => { setEF({ name: e.target.value }); setEditErrors((v) => ({ ...v, name: '' })); }}
                    autoFocus
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 ${
                      editErrors.name
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-stone-200 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {editErrors.name && <p className="mt-1 text-xs text-danger">{editErrors.name}</p>}
                </div>

                {/* Unit + Min threshold */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Đơn vị <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.unit}
                      placeholder="g, ml, kg…"
                      onChange={(e) => { setEF({ unit: e.target.value }); setEditErrors((v) => ({ ...v, unit: '' })); }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                        editErrors.unit
                          ? 'border-danger focus:border-danger focus:ring-danger'
                          : 'border-stone-200 focus:border-primary focus:ring-primary'
                      }`}
                    />
                    {editErrors.unit && <p className="mt-1 text-xs text-danger">{editErrors.unit}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Ngưỡng cảnh báo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.minThreshold}
                      onChange={(e) => { setEF({ minThreshold: e.target.value }); setEditErrors((v) => ({ ...v, minThreshold: '' })); }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 ${
                        editErrors.minThreshold
                          ? 'border-danger focus:border-danger focus:ring-danger'
                          : 'border-stone-200 focus:border-primary focus:ring-primary'
                      }`}
                    />
                    {editErrors.minThreshold && <p className="mt-1 text-xs text-danger">{editErrors.minThreshold}</p>}
                  </div>
                </div>

                {/* Supplier section */}
                <div className="border-t border-stone-100 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">Thông tin nhà cung cấp</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editForm.hasSupplier}
                      onClick={() => setEF({ hasSupplier: !editForm.hasSupplier })}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`relative flex h-6 w-11 flex-none items-center rounded-full transition-colors ${
                          editForm.hasSupplier ? 'bg-primary' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`mx-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            editForm.hasSupplier ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                      <span className={`text-xs font-medium ${editForm.hasSupplier ? 'text-ink' : 'text-muted'}`}>
                        {editForm.hasSupplier ? 'Có' : 'Không'}
                      </span>
                    </button>
                  </div>

                  {editForm.hasSupplier && (
                    <div className="space-y-3">
                      {/* Supplier name */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          Tên nhà cung cấp <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.supName}
                          placeholder="Ví dụ: Công ty TNHH Cà phê Tây Nguyên"
                          onChange={(e) => { setEF({ supName: e.target.value }); setEditErrors((v) => ({ ...v, supName: '' })); }}
                          className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                            editErrors.supName
                              ? 'border-danger focus:border-danger focus:ring-danger'
                              : 'border-stone-200 focus:border-primary focus:ring-primary'
                          }`}
                        />
                        {editErrors.supName && <p className="mt-1 text-xs text-danger">{editErrors.supName}</p>}
                      </div>

                      {/* Phone + Zalo */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink">
                            Điện thoại <span className="text-danger">*</span>
                          </label>
                          <input
                            type="tel"
                            value={editForm.supPhone}
                            placeholder="0901 234 567"
                            onChange={(e) => { setEF({ supPhone: e.target.value }); setEditErrors((v) => ({ ...v, supPhone: '' })); }}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                              editErrors.supPhone
                                ? 'border-danger focus:border-danger focus:ring-danger'
                                : 'border-stone-200 focus:border-primary focus:ring-primary'
                            }`}
                          />
                          {editErrors.supPhone && <p className="mt-1 text-xs text-danger">{editErrors.supPhone}</p>}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink">Zalo</label>
                          <input
                            type="tel"
                            value={editForm.supZalo}
                            placeholder="Số Zalo (nếu khác ĐT)"
                            onChange={(e) => setEF({ supZalo: e.target.value })}
                            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">Địa chỉ</label>
                        <input
                          type="text"
                          value={editForm.supAddress}
                          placeholder="Số nhà, đường, quận, tỉnh/thành phố"
                          onChange={(e) => setEF({ supAddress: e.target.value })}
                          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeEdit}
                  disabled={editLoading}
                  className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editLoading}
                  className={[
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
                    editLoading
                      ? 'cursor-wait bg-primary/75 text-white'
                      : 'bg-primary text-white hover:bg-primary-hover',
                  ].join(' ')}
                >
                  {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editLoading ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </div>
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
