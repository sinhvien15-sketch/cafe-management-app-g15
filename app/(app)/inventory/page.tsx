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
  Languages,
} from 'lucide-react';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/lib/auth-context';
import type { Ingredient, Supplier, MenuItem, WithId } from '@/app/lib/types';
import { getLocalized, useLanguage } from '@/app/lib/i18n';
import { withTimeout } from '@/app/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortField   = 'name' | 'currentStock';
type SortDir     = 'asc' | 'desc';
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

interface EditForm {
  name:         string;
  nameEn:       string;
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

// Uses dict keys so t() can be called in JSX (STATUS_CONFIG is outside the component)
const STATUS_CONFIG: Record<StockStatus, { labelKey: string; badge: string; row: string }> = {
  in_stock:     { labelKey: 'inv_status_in_stock', badge: 'bg-emerald-100 text-emerald-700', row: ''            },
  low_stock:    { labelKey: 'inv_status_low',       badge: 'bg-amber-100 text-amber-700',     row: 'bg-amber-50' },
  out_of_stock: { labelKey: 'inv_status_out',       badge: 'bg-red-100 text-red-700',         row: 'bg-red-50'   },
};

function toEditForm(ing: WithId<Ingredient>): EditForm {
  return {
    name:         getLocalized(ing.name, 'vi'),
    nameEn:       getLocalized(ing.name, 'en'),
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
  const { lang, t } = useLanguage();

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
  const [editTarget,      setEditTarget]      = useState<WithId<Ingredient> | null>(null);
  const [editForm,        setEditForm]        = useState<EditForm | null>(null);
  const [editErrors,      setEditErrors]      = useState<Record<string, string>>({});
  const [editLoading,     setEditLoading]     = useState(false);
  const [translatingName, setTranslatingName] = useState(false);

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
    .filter((i) => getLocalized(i.name, lang).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;
      const d = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name')         return getLocalized(a.name, lang).localeCompare(getLocalized(b.name, lang), 'vi') * d;
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
      setRestockError(t('inv_restock_err'));
      return;
    }

    setRestockLoading(true);
    const now      = Timestamp.now();
    const newStock = restockTarget.currentStock + qty;

    try {
      await withTimeout(
        updateDoc(doc(db, 'ingredients', restockTarget.id), {
          currentStock:    newStock,
          lastRestockedAt: now,
          updatedAt:       now,
        }),
        9000,
      );

      await withTimeout(
        addDoc(collection(db, 'stock_transactions'), {
          ingredientId:   restockTarget.id,
          type:           'restock',
          quantity:       qty,
          relatedOrderId: null,
          createdAt:      now,
        }),
        5000,
      );

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
        await withTimeout(
          Promise.all(
            toRestore.map((m) => updateDoc(doc(db, 'menu_items', m.id), { available: true })),
          ),
          5000,
        );
        setMenuItems((prev) =>
          prev.map((m) =>
            toRestore.some((r) => r.id === m.id) ? { ...m, available: true } : m,
          ),
        );
      }

      const ingName = getLocalized(restockTarget.name, lang);
      const extra   = toRestore.length > 0
        ? ` — ${toRestore.length} ${t('inv_toast_restock_restored')}`
        : '';
      setRestockTarget(null);
      showToast(`${t('inv_toast_restock_success')} ${formatNum(qty)} ${restockTarget.unit} ${ingName}${extra}`);

    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout';
      setRestockTarget(null);
      showToast(isTimeout ? t('err_save_timeout') : t('inv_toast_restock_error'), true);
    } finally {
      setRestockLoading(false);
    }
  };

  // ── Auto-translate ────────────────────────────────────────────────────────
  const translateName = async (viText: string) => {
    if (!viText.trim()) return;
    setTranslatingName(true);
    try {
      const res  = await fetch(`/api/translate?q=${encodeURIComponent(viText)}`);
      const json = await res.json();
      if (json.translation) {
        setEF({ nameEn: json.translation });
      } else {
        throw new Error('no translation');
      }
    } catch {
      showToast(t('lbl_translate_err'), true);
    } finally {
      setTranslatingName(false);
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
    if (!editForm.name.trim())         e.name   = 'inv_err_name';
    if (!editForm.nameEn.trim())       e.nameEn = 'inv_err_name_en';
    if (!editForm.unit.trim())         e.unit   = 'inv_err_unit';
    // renamed from 't' to 'threshold' to avoid shadowing the useLanguage t() function
    const threshold = parseFloat(editForm.minThreshold);
    if (!editForm.minThreshold || isNaN(threshold) || threshold < 0) e.minThreshold = 'inv_err_threshold';
    if (editForm.hasSupplier) {
      if (!editForm.supName.trim())  e.supName  = 'inv_err_sup_name';
      if (!editForm.supPhone.trim()) e.supPhone = 'inv_err_sup_phone';
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
      await withTimeout(
        updateDoc(doc(db, 'ingredients', editTarget.id), {
          name:         { vi: editForm.name.trim(), en: editForm.nameEn.trim() },
          unit:         editForm.unit.trim(),
          minThreshold: parseFloat(editForm.minThreshold),
          supplier,
          updatedAt:    Timestamp.now(),
        }),
        9000,
      );
      closeEdit();
      showToast(`${t('inv_toast_edit_success')} "${editForm.name.trim()}"`);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout';
      showToast(isTimeout ? t('err_save_timeout') : t('inv_toast_edit_error'), true);
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
        <h1 className="text-h1 font-semibold text-ink">{t('inv_title')}</h1>
        <p className="mt-1 text-sm text-muted">
          {loading ? t('loading') : `${ingredients.length} ${t('inv_count')}`}
        </p>
      </div>

      {/* ── Alert banner ──────────────────────────────────────────────────── */}
      {!loading && alertCount > 0 && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-none" />
          <span>
            {alertCount} {t('inv_alert_prefix')}{' '}
            <span className="text-red-600">{outCount} {t('inv_alert_out')}</span>
            {outCount > 0 && lowCount > 0 && ', '}
            {lowCount > 0 && <span>{lowCount} {t('inv_alert_low')}</span>}
          </span>
        </div>
      )}

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder={t('inv_search_placeholder')}
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
                <SortTh field="name" label={t('inv_col_name')} current={sortField} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('inv_col_unit')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <SortTh field="currentStock" label={t('inv_col_stock')} current={sortField} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('inv_col_threshold')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('inv_col_status')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('inv_col_supplier')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('inv_col_action')}</th>
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
                    <p className="text-sm font-medium">{t('inv_err_load')}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty / no results */}
            {!loading && !loadError && rows.length === 0 && (
              <tr>
                <td colSpan={COL_COUNT} className="px-4 py-12 text-center text-sm text-muted">
                  {t('inv_empty')}
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
                  <td className="px-4 py-3.5 font-medium text-ink">{getLocalized(ingredient.name, lang)}</td>
                  <td className="px-4 py-3.5 text-muted">{ingredient.unit}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{formatNum(ingredient.currentStock)}</td>
                  <td className="px-4 py-3.5 text-muted">{formatNum(ingredient.minThreshold)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
                      {t(cfg.labelKey)}
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
                      <span className="text-xs text-stone-400">{t('inv_no_supplier')}</span>
                    )}
                  </td>

                  {/* Action column */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRestock(ingredient)}
                        className="rounded-lg bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/20"
                      >
                        {t('inv_btn_restock')}
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => openEdit(ingredient)}
                          className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('btn_edit')}
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
            <h2 className="text-h3 mb-1 font-semibold text-ink">{t('inv_restock_modal_title')}</h2>
            <p className="mb-5 text-sm text-muted">
              {t('inv_restock_ingredient_label')}{' '}
              <span className="font-semibold text-ink">{getLocalized(restockTarget.name, lang)}</span>
            </p>

            <div className="mb-4 rounded-lg bg-stone-50 px-4 py-3 text-sm">
              <span className="text-muted">{t('inv_restock_current_stock')} </span>
              <span className="font-semibold text-ink">
                {formatNum(restockTarget.currentStock)} {restockTarget.unit}
              </span>
            </div>

            <label className="mb-1.5 block text-sm font-medium text-ink">
              {t('inv_restock_qty_label')} ({restockTarget.unit})
            </label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => { setRestockQty(e.target.value); setRestockError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRestock(); }}
              placeholder={t('inv_restock_qty_placeholder')}
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
                {t('btn_cancel')}
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
                {restockLoading ? t('inv_restock_btn_loading') : t('btn_confirm')}
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
                  {t('inv_supplier_context_label')} {getLocalized(supplierTarget.name, lang)}
                </p>
                <h2 className="mt-1 text-lg font-bold text-ink">
                  {supplierTarget.supplier.name}
                </h2>
              </div>
              <button
                onClick={() => setSupplierTarget(null)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink"
                aria-label={t('btn_close')}
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
                  <p className="text-xs text-muted">{t('inv_supplier_phone')}</p>
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
                    <p className="text-xs text-muted">{t('inv_supplier_zalo')}</p>
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
                    <p className="text-xs text-muted">{t('inv_supplier_address')}</p>
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
              {t('btn_close')}
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
                <h2 className="text-h3 font-semibold text-ink">{t('inv_edit_modal_title')}</h2>
                <button
                  onClick={closeEdit}
                  disabled={editLoading}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink disabled:opacity-50"
                  aria-label={t('btn_close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Vietnamese name — auto-translates EN field on blur if EN is empty */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    {t('inv_edit_name_label')} <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    placeholder={t('inv_edit_name_placeholder')}
                    autoFocus
                    onChange={(e) => { setEF({ name: e.target.value }); setEditErrors((v) => ({ ...v, name: '' })); }}
                    onBlur={(e) => {
                      if (!editForm.nameEn.trim() && e.target.value.trim()) {
                        translateName(e.target.value.trim());
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                      editErrors.name
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-stone-200 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {editErrors.name && <p className="mt-1 text-xs text-danger">{t(editErrors.name)}</p>}
                </div>

                {/* English name — always shown; translate button forces re-translate */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink">
                      {t('inv_edit_name_en_label')} <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => translateName(editForm.name.trim())}
                      disabled={translatingName || !editForm.name.trim()}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title={t('lbl_translate_btn')}
                    >
                      {translatingName
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Languages className="h-3.5 w-3.5" />}
                      {t('lbl_translate_btn')}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editForm.nameEn}
                    placeholder={translatingName ? '…' : t('inv_edit_name_en_placeholder')}
                    disabled={translatingName}
                    onChange={(e) => { setEF({ nameEn: e.target.value }); setEditErrors((v) => ({ ...v, nameEn: '' })); }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 disabled:bg-stone-50 disabled:text-muted ${
                      editErrors.nameEn
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-stone-200 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {editErrors.nameEn && <p className="mt-1 text-xs text-danger">{t(editErrors.nameEn)}</p>}
                </div>

                {/* Unit + Min threshold */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      {t('inv_edit_unit_label')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.unit}
                      placeholder={t('inv_edit_unit_placeholder')}
                      onChange={(e) => { setEF({ unit: e.target.value }); setEditErrors((v) => ({ ...v, unit: '' })); }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                        editErrors.unit
                          ? 'border-danger focus:border-danger focus:ring-danger'
                          : 'border-stone-200 focus:border-primary focus:ring-primary'
                      }`}
                    />
                    {editErrors.unit && <p className="mt-1 text-xs text-danger">{t(editErrors.unit)}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      {t('inv_edit_threshold_label')} <span className="text-danger">*</span>
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
                    {editErrors.minThreshold && <p className="mt-1 text-xs text-danger">{t(editErrors.minThreshold)}</p>}
                  </div>
                </div>

                {/* Supplier section */}
                <div className="border-t border-stone-100 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{t('inv_edit_supplier_section')}</span>
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
                        {editForm.hasSupplier ? t('inv_edit_supplier_yes') : t('inv_edit_supplier_no')}
                      </span>
                    </button>
                  </div>

                  {editForm.hasSupplier && (
                    <div className="space-y-3">
                      {/* Supplier name */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          {t('inv_edit_sup_name_label')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.supName}
                          placeholder={t('inv_edit_sup_name_placeholder')}
                          onChange={(e) => { setEF({ supName: e.target.value }); setEditErrors((v) => ({ ...v, supName: '' })); }}
                          className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                            editErrors.supName
                              ? 'border-danger focus:border-danger focus:ring-danger'
                              : 'border-stone-200 focus:border-primary focus:ring-primary'
                          }`}
                        />
                        {editErrors.supName && <p className="mt-1 text-xs text-danger">{t(editErrors.supName)}</p>}
                      </div>

                      {/* Phone + Zalo */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink">
                            {t('inv_edit_sup_phone_label')} <span className="text-danger">*</span>
                          </label>
                          <input
                            type="tel"
                            value={editForm.supPhone}
                            placeholder={t('inv_edit_sup_phone_placeholder')}
                            onChange={(e) => { setEF({ supPhone: e.target.value }); setEditErrors((v) => ({ ...v, supPhone: '' })); }}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                              editErrors.supPhone
                                ? 'border-danger focus:border-danger focus:ring-danger'
                                : 'border-stone-200 focus:border-primary focus:ring-primary'
                            }`}
                          />
                          {editErrors.supPhone && <p className="mt-1 text-xs text-danger">{t(editErrors.supPhone)}</p>}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink">{t('inv_edit_sup_zalo_label')}</label>
                          <input
                            type="tel"
                            value={editForm.supZalo}
                            placeholder={t('inv_edit_sup_zalo_placeholder')}
                            onChange={(e) => setEF({ supZalo: e.target.value })}
                            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-ink">{t('inv_edit_sup_address_label')}</label>
                        <input
                          type="text"
                          value={editForm.supAddress}
                          placeholder={t('inv_edit_sup_address_placeholder')}
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
                  {t('btn_cancel')}
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
                  {editLoading ? t('inv_edit_btn_saving') : t('inv_edit_btn_save')}
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
