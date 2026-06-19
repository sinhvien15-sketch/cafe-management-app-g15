'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import {
  Plus, Pencil, Trash2, AlertCircle, CheckCircle,
  Loader2, X, AlertTriangle,
} from 'lucide-react';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/lib/auth-context';
import { CATEGORIES } from '@/app/lib/constants';
import type { MenuItem, Ingredient, Category, WithId } from '@/app/lib/types';
import { getLocalized } from '@/app/lib/i18n';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

// Filter out 'all' — the form only needs the 4 real categories
const MENU_CATS = CATEGORIES.filter((c) => c.value !== 'all') as {
  value: Category;
  label: string;
}[];

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  MENU_CATS.map((c) => [c.value, c.label]),
);

// ── Form types ────────────────────────────────────────────────────────────────

type FormLine = { ingredientId: string; quantityUsed: string };

type ModalMode = { kind: 'add' } | { kind: 'edit'; item: WithId<MenuItem> };

interface FormState {
  name:      string;
  category:  Category;
  price:     string;
  available: boolean;
  recipe:    FormLine[];
}

function blank(): FormState {
  return { name: '', category: 'coffee', price: '', available: true, recipe: [] };
}

function fromItem(item: WithId<MenuItem>): FormState {
  return {
    name:      getLocalized(item.name, 'vi'),
    category:  item.category,
    price:     String(item.price),
    available: item.available,
    recipe:    item.recipe.map((r) => ({
      ingredientId: r.ingredientId,
      quantityUsed: String(r.quantityUsed),
    })),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const router   = useRouter();
  const { user } = useAuth();

  // ── Remote state ──────────────────────────────────────────────────────────
  const [menuItems,   setMenuItems]   = useState<WithId<MenuItem>[]>([]);
  const [ingredients, setIngredients] = useState<WithId<Ingredient>[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(false);

  // ── Modal / dialog state ──────────────────────────────────────────────────
  const [modal,        setModal]        = useState<ModalMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WithId<MenuItem> | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form,    setForm]    = useState<FormState>(blank());
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);

  // ── Toast state ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: '', error: false });

  // ── Owner-only guard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== 'owner') router.replace('/pos');
  }, [user, router]);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu_items'),
      (snap) => {
        setMenuItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) })));
        setLoading(false);
        setLoadError(false);
      },
      () => { setLoadError(true); setLoading(false); },
    );

    // Ingredients loaded once — only needed for the recipe dropdown
    getDocs(collection(db, 'ingredients')).then((snap) => {
      setIngredients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Ingredient) })));
    });

    return () => unsub();
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message: string, error = false) => {
    setToast({ visible: true, message, error });
    setTimeout(() => setToast({ visible: false, message: '', error: false }), error ? 4000 : 3000);
  };

  // ── Modal open/close ──────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(blank());
    setErrors({});
    setWarning(null);
    setModal({ kind: 'add' });
  };

  const openEdit = (item: WithId<MenuItem>) => {
    setForm(fromItem(item));
    setErrors({});
    setWarning(null);
    setModal({ kind: 'edit', item });
  };

  const closeModal = () => {
    setModal(null);
    setWarning(null);
    setErrors({});
  };

  // ── Recipe line helpers ───────────────────────────────────────────────────
  const addLine = () =>
    setForm((f) => ({ ...f, recipe: [...f.recipe, { ingredientId: '', quantityUsed: '' }] }));

  const updateLine = (i: number, field: keyof FormLine, value: string) => {
    setForm((f) => {
      const recipe = [...f.recipe];
      recipe[i] = { ...recipe[i], [field]: value };
      return { ...f, recipe };
    });
    setErrors((e) => { const c = { ...e }; delete c[`r_${i}_${field}`]; return c; });
  };

  const removeLine = (i: number) =>
    setForm((f) => ({ ...f, recipe: f.recipe.filter((_, idx) => idx !== i) }));

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên món';
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0) e.price = 'Giá phải lớn hơn 0';
    form.recipe.forEach((line, i) => {
      if (!line.ingredientId) e[`r_${i}_ingredientId`] = 'Chọn nguyên liệu';
      const qty = parseFloat(line.quantityUsed);
      if (!line.quantityUsed || isNaN(qty) || qty <= 0) e[`r_${i}_quantityUsed`] = 'Số lượng > 0';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setWarning(null);

    const recipe = form.recipe.map((r) => ({
      ingredientId: r.ingredientId,
      quantityUsed: parseFloat(r.quantityUsed),
    }));
    const price = parseFloat(form.price);

    // If user intends available=true, check that every recipe ingredient has stock > 0
    let available = form.available;
    let availWarn: string | null = null;

    if (available && recipe.length > 0) {
      const missingNames = recipe
        .filter((r) => {
          const ing = ingredients.find((i) => i.id === r.ingredientId);
          return !ing || ing.currentStock <= 0;
        })
        .map((r) => getLocalized(ingredients.find((i) => i.id === r.ingredientId)?.name, 'vi') || r.ingredientId);

      if (missingNames.length > 0) {
        available = false;
        availWarn = `Đã tự động đặt về "Ngừng bán" vì các nguyên liệu sau đang hết hàng: ${missingNames.join(', ')}.`;
      }
    }

    try {
      if (modal?.kind === 'add') {
        await addDoc(collection(db, 'menu_items'), {
          name: { vi: form.name.trim(), en: form.name.trim() },
          category: form.category,
          price,
          available,
          recipe,
          createdAt: Timestamp.now(),
        });
      } else if (modal?.kind === 'edit') {
        await updateDoc(doc(db, 'menu_items', modal.item.id), {
          name: { vi: form.name.trim(), en: form.name.trim() },
          category: form.category,
          price,
          available,
          recipe,
        });
      }

      if (availWarn) {
        // Keep modal open so owner sees the warning before closing
        setWarning(availWarn);
        setForm((f) => ({ ...f, available: false }));
      } else {
        const verb = modal?.kind === 'add' ? 'Đã thêm' : 'Đã cập nhật';
        closeModal();
        showToast(`✓ ${verb} "${form.name.trim()}"`);
      }
    } catch {
      showToast('✗ Lưu thất bại, vui lòng thử lại', true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const name = getLocalized(deleteTarget.name, 'vi');
    try {
      await deleteDoc(doc(db, 'menu_items', deleteTarget.id));
      setDeleteTarget(null);
      showToast(`✓ Đã xóa "${name}"`);
    } catch {
      setDeleteTarget(null);
      showToast('✗ Xóa thất bại, vui lòng thử lại', true);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-ink">Quản lý menu</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? 'Đang tải…' : `${menuItems.length} món`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Thêm món mới
        </button>
      </div>

      {/* ── Load-error banner ─────────────────────────────────────────────── */}
      {!loading && loadError && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle className="h-4 w-4 flex-none" />
          Không thể tải dữ liệu — kiểm tra kết nối.
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-stone-200 bg-stone-50">
              {['Tên món', 'Danh mục', 'Giá', 'Trạng thái', 'Công thức', 'Thao tác'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {h}
                </th>
              ))}
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
                    <p className="text-sm font-medium">Không thể tải dữ liệu.</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {!loading && !loadError && menuItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  Chưa có món nào — nhấn &quot;Thêm món mới&quot; để bắt đầu.
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading && !loadError && menuItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50"
              >
                <td className="px-4 py-3.5 font-medium text-ink">{getLocalized(item.name, 'vi')}</td>
                <td className="px-4 py-3.5 text-muted">{CAT_LABEL[item.category] ?? item.category}</td>
                <td className="px-4 py-3.5 font-semibold text-ink">{formatVND(item.price)}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.available
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {item.available ? 'Đang bán' : 'Ngừng bán'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-muted">
                  {item.recipe.length === 0
                    ? <span className="text-xs text-stone-400">Không có</span>
                    : `${item.recipe.length} nguyên liệu`}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-danger hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">

              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-h3 font-semibold text-ink">
                  {modal.kind === 'add' ? 'Thêm món mới' : 'Chỉnh sửa món'}
                </h2>
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink disabled:opacity-50"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Availability warning (shown after save if stock insufficient) */}
              {warning && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{warning}</span>
                </div>
              )}

              {/* ── Form fields ──────────────────────────────────────────── */}
              <div className="space-y-4">

                {/* Dish name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Tên món <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }));
                      setErrors((e_) => ({ ...e_, name: '' }));
                    }}
                    placeholder="Ví dụ: Cà phê đen"
                    autoFocus
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                      errors.name
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-stone-200 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
                </div>

                {/* Category + Price side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">Danh mục</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {MENU_CATS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      Giá (VND) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={form.price}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, price: e.target.value }));
                        setErrors((e_) => ({ ...e_, price: '' }));
                      }}
                      placeholder="Ví dụ: 35000"
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                        errors.price
                          ? 'border-danger focus:border-danger focus:ring-danger'
                          : 'border-stone-200 focus:border-primary focus:ring-primary'
                      }`}
                    />
                    {errors.price && <p className="mt-1 text-xs text-danger">{errors.price}</p>}
                  </div>
                </div>

                {/* Available toggle */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Trạng thái bán</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.available}
                    onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
                    className="flex items-center gap-3"
                  >
                    <span
                      className={`relative flex h-6 w-11 flex-none items-center rounded-full transition-colors ${
                        form.available ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`mx-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          form.available ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </span>
                    <span className={`text-sm font-medium ${form.available ? 'text-emerald-700' : 'text-muted'}`}>
                      {form.available ? 'Đang bán' : 'Ngừng bán'}
                    </span>
                  </button>
                </div>

                {/* ── Recipe section ────────────────────────────────────── */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink">
                      Công thức (nguyên liệu)
                    </label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm nguyên liệu
                    </button>
                  </div>

                  {/* Loading ingredients */}
                  {ingredients.length === 0 && (
                    <p className="text-xs text-muted">Đang tải danh sách nguyên liệu…</p>
                  )}

                  {/* Empty recipe placeholder */}
                  {form.recipe.length === 0 && ingredients.length > 0 && (
                    <p className="rounded-lg border border-dashed border-stone-300 px-4 py-3 text-center text-xs text-stone-400">
                      Chưa có — nhấn &quot;Thêm nguyên liệu&quot; để thêm công thức
                    </p>
                  )}

                  {/* Recipe lines */}
                  <div className="space-y-2">
                    {form.recipe.map((line, i) => {
                      const selectedIng = ingredients.find((ing) => ing.id === line.ingredientId);
                      return (
                        <div key={i} className="flex items-start gap-2">
                          {/* Ingredient dropdown */}
                          <div className="min-w-0 flex-1">
                            <select
                              value={line.ingredientId}
                              onChange={(e) => updateLine(i, 'ingredientId', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 ${
                                errors[`r_${i}_ingredientId`]
                                  ? 'border-danger focus:border-danger focus:ring-danger'
                                  : 'border-stone-200 focus:border-primary focus:ring-primary'
                              }`}
                            >
                              <option value="">— Chọn nguyên liệu —</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {getLocalized(ing.name, 'vi')} ({ing.unit})
                                </option>
                              ))}
                            </select>
                            {errors[`r_${i}_ingredientId`] && (
                              <p className="mt-0.5 text-xs text-danger">{errors[`r_${i}_ingredientId`]}</p>
                            )}
                          </div>

                          {/* Quantity input */}
                          <div className="w-28 flex-none">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={line.quantityUsed}
                              onChange={(e) => updateLine(i, 'quantityUsed', e.target.value)}
                              placeholder="Số lượng"
                              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                                errors[`r_${i}_quantityUsed`]
                                  ? 'border-danger focus:border-danger focus:ring-danger'
                                  : 'border-stone-200 focus:border-primary focus:ring-primary'
                              }`}
                            />
                            {errors[`r_${i}_quantityUsed`] && (
                              <p className="mt-0.5 text-xs text-danger">{errors[`r_${i}_quantityUsed`]}</p>
                            )}
                          </div>

                          {/* Unit label */}
                          <span className="mt-2.5 w-8 flex-none text-xs text-muted">
                            {selectedIng?.unit ?? ''}
                          </span>

                          {/* Remove line */}
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="mt-1.5 flex-none rounded p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-danger"
                            aria-label="Xóa dòng này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Modal actions ─────────────────────────────────────────── */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  {warning ? 'Đóng' : 'Hủy'}
                </button>
                {!warning && (
                  <button
                    onClick={handleSave}
                    disabled={submitting}
                    className={[
                      'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
                      submitting
                        ? 'cursor-wait bg-primary/75 text-white'
                        : 'bg-primary text-white hover:bg-primary-hover',
                    ].join(' ')}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? 'Đang lưu…' : 'Lưu'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-danger" />
            </div>
            <h2 className="mb-2 text-h3 font-semibold text-ink">Xác nhận xóa</h2>
            <p className="mb-5 text-sm text-muted">
              Bạn có chắc muốn xóa món{' '}
              <span className="font-semibold text-ink">&ldquo;{getLocalized(deleteTarget.name, 'vi')}&rdquo;</span>?
              Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={[
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
                  deleting
                    ? 'cursor-wait bg-danger/75 text-white'
                    : 'bg-danger text-white hover:bg-red-700',
                ].join(' ')}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? 'Đang xóa…' : 'Xóa'}
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
