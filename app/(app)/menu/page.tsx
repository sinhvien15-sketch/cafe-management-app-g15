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
  Loader2, X, AlertTriangle, Languages,
} from 'lucide-react';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/lib/auth-context';
import { CATEGORIES } from '@/app/lib/constants';
import type { MenuItem, Ingredient, Category, WithId } from '@/app/lib/types';
import { getLocalized, useLanguage } from '@/app/lib/i18n';
import { withTimeout } from '@/app/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

// Filter out 'all' — the form only needs the 4 real categories
const MENU_CATS = CATEGORIES.filter((c) => c.value !== 'all') as { value: Category; label: string }[];

// ── Form types ────────────────────────────────────────────────────────────────

type FormLine = { ingredientId: string; quantityUsed: string };
type ModalMode = { kind: 'add' } | { kind: 'edit'; item: WithId<MenuItem> };

interface FormState {
  name:      string;
  nameEn:    string;
  category:  Category;
  price:     string;
  available: boolean;
  recipe:    FormLine[];
}

function blank(): FormState {
  return { name: '', nameEn: '', category: 'coffee', price: '', available: true, recipe: [] };
}

function fromItem(item: WithId<MenuItem>): FormState {
  return {
    name:      getLocalized(item.name, 'vi'),   // always read each language separately
    nameEn:    getLocalized(item.name, 'en'),   // prevents silent overwrite on edit
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
  const { lang, t } = useLanguage();

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
  const [form,            setForm]            = useState<FormState>(blank());
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [warning,         setWarning]         = useState<string | null>(null);
  const [translatingName, setTranslatingName] = useState(false);

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

  // ── Auto-translate VI name → EN name ──────────────────────────────────────
  const translateName = async (viText: string) => {
    if (!viText.trim()) return;
    setTranslatingName(true);
    try {
      const res  = await fetch(`/api/translate?q=${encodeURIComponent(viText)}`);
      const json = await res.json();
      if (json.translation) {
        setForm((f) => ({ ...f, nameEn: json.translation }));
      } else {
        throw new Error('no translation');
      }
    } catch {
      showToast(t('lbl_translate_err'), true);
    } finally {
      setTranslatingName(false);
    }
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

  // ── Validation — returns dict keys, rendered with t() ─────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim())   e.name   = 'menu_err_name';
    if (!form.nameEn.trim()) e.nameEn = 'menu_err_name_en';
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0) e.price = 'menu_err_price';
    form.recipe.forEach((line, i) => {
      if (!line.ingredientId) e[`r_${i}_ingredientId`] = 'menu_err_select_ingredient';
      const qty = parseFloat(line.quantityUsed);
      if (!line.quantityUsed || isNaN(qty) || qty <= 0) e[`r_${i}_quantityUsed`] = 'menu_err_ingredient_qty';
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
        .map((r) => getLocalized(ingredients.find((i) => i.id === r.ingredientId)?.name, lang) || r.ingredientId);

      if (missingNames.length > 0) {
        available = false;
        availWarn = `${t('menu_warning_auto_unavailable')} ${missingNames.join(', ')}.`;
      }
    }

    try {
      if (modal?.kind === 'add') {
        await withTimeout(
          addDoc(collection(db, 'menu_items'), {
            name:      { vi: form.name.trim(), en: form.nameEn.trim() },
            category:  form.category,
            price,
            available,
            recipe,
            createdAt: Timestamp.now(),
          }),
          9000,
        );
      } else if (modal?.kind === 'edit') {
        await withTimeout(
          updateDoc(doc(db, 'menu_items', modal.item.id), {
            name:      { vi: form.name.trim(), en: form.nameEn.trim() },
            category:  form.category,
            price,
            available,
            recipe,
          }),
          9000,
        );
      }

      if (availWarn) {
        // Keep modal open so owner sees the warning before closing
        setWarning(availWarn);
        setForm((f) => ({ ...f, available: false }));
      } else {
        const toastMsg = modal?.kind === 'add' ? t('menu_toast_added') : t('menu_toast_updated');
        closeModal();
        showToast(`${toastMsg} "${form.name.trim()}"`);
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout';
      showToast(isTimeout ? t('err_save_timeout') : t('menu_toast_save_error'), true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const name = getLocalized(deleteTarget.name, lang);
    try {
      await withTimeout(deleteDoc(doc(db, 'menu_items', deleteTarget.id)), 9000);
      setDeleteTarget(null);
      showToast(`${t('menu_toast_deleted')} "${name}"`);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout';
      setDeleteTarget(null);
      showToast(isTimeout ? t('err_save_timeout') : t('menu_toast_delete_error'), true);
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
          <h1 className="text-h1 font-semibold text-ink">{t('menu_title')}</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? t('loading') : `${menuItems.length} ${t('menu_count_unit')}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {t('menu_btn_add')}
        </button>
      </div>

      {/* ── Load-error banner ─────────────────────────────────────────────── */}
      {!loading && loadError && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle className="h-4 w-4 flex-none" />
          {t('menu_err_load')}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-stone-200 bg-stone-50">
              {[
                t('menu_col_name'), t('menu_col_category'), t('menu_col_price'),
                t('menu_col_status'), t('menu_col_recipe'), t('menu_col_action'),
              ].map((h) => (
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
                    <p className="text-sm font-medium">{t('menu_err_load')}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {!loading && !loadError && menuItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                  {t('menu_empty')}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading && !loadError && menuItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50"
              >
                {/* Name — resolved via getLocalized for the current language */}
                <td className="px-4 py-3.5 font-medium text-ink">{getLocalized(item.name, lang)}</td>

                {/* Category — uses t() with the cat_ prefix keys */}
                <td className="px-4 py-3.5 text-muted">{t(`cat_${item.category}`)}</td>

                <td className="px-4 py-3.5 font-semibold text-ink">{formatVND(item.price)}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.available
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {item.available ? t('menu_status_available') : t('menu_status_unavailable')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-muted">
                  {item.recipe.length === 0
                    ? <span className="text-xs text-stone-400">{t('menu_recipe_none')}</span>
                    : `${item.recipe.length} ${t('menu_recipe_unit')}`}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('btn_edit')}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-danger hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('btn_delete')}
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
                  {modal.kind === 'add' ? t('menu_modal_add_title') : t('menu_modal_edit_title')}
                </h2>
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-stone-100 hover:text-ink disabled:opacity-50"
                  aria-label={t('btn_close')}
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

              <div className="space-y-4">

                {/* Vietnamese dish name — auto-translates EN field on blur if EN is empty */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    {t('menu_form_name_label')} <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    placeholder={t('menu_form_name_placeholder')}
                    autoFocus
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }));
                      setErrors((e_) => ({ ...e_, name: '' }));
                    }}
                    onBlur={(e) => {
                      if (!form.nameEn.trim() && e.target.value.trim()) {
                        translateName(e.target.value.trim());
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                      errors.name
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-stone-200 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-danger">{t(errors.name)}</p>}
                </div>

                {/* English dish name — always shown; translate button forces re-translate */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink">
                      {t('menu_form_name_en_label')} <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => translateName(form.name.trim())}
                      disabled={translatingName || !form.name.trim()}
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
                    value={form.nameEn}
                    placeholder={translatingName ? '…' : t('menu_form_name_en_placeholder')}
                    disabled={translatingName}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, nameEn: e.target.value }));
                      setErrors((e_) => ({ ...e_, nameEn: '' }));
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 disabled:bg-stone-50 disabled:text-muted ${
                      errors.nameEn
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-stone-200 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {errors.nameEn && <p className="mt-1 text-xs text-danger">{t(errors.nameEn)}</p>}
                </div>

                {/* Category + Price side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">{t('menu_form_category_label')}</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {MENU_CATS.map((c) => (
                        <option key={c.value} value={c.value}>{t(`cat_${c.value}`)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink">
                      {t('menu_form_price_label')} <span className="text-danger">*</span>
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
                      placeholder={t('menu_form_price_placeholder')}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                        errors.price
                          ? 'border-danger focus:border-danger focus:ring-danger'
                          : 'border-stone-200 focus:border-primary focus:ring-primary'
                      }`}
                    />
                    {errors.price && <p className="mt-1 text-xs text-danger">{t(errors.price)}</p>}
                  </div>
                </div>

                {/* Available toggle */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">{t('menu_form_status_label')}</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.available}
                    onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
                    className="flex items-center gap-3"
                  >
                    <span className={`relative flex h-6 w-11 flex-none items-center rounded-full transition-colors ${
                      form.available ? 'bg-emerald-500' : 'bg-stone-300'
                    }`}>
                      <span className={`mx-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        form.available ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </span>
                    <span className={`text-sm font-medium ${form.available ? 'text-emerald-700' : 'text-muted'}`}>
                      {form.available ? t('menu_status_available') : t('menu_status_unavailable')}
                    </span>
                  </button>
                </div>

                {/* ── Recipe section ────────────────────────────────────── */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink">{t('menu_form_recipe_label')}</label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('menu_form_add_ingredient')}
                    </button>
                  </div>

                  {/* Loading ingredients */}
                  {ingredients.length === 0 && (
                    <p className="text-xs text-muted">{t('menu_form_loading_ingredients')}</p>
                  )}

                  {/* Empty recipe placeholder */}
                  {form.recipe.length === 0 && ingredients.length > 0 && (
                    <p className="rounded-lg border border-dashed border-stone-300 px-4 py-3 text-center text-xs text-stone-400">
                      {t('menu_form_recipe_empty')}
                    </p>
                  )}

                  {/* Recipe lines */}
                  <div className="space-y-2">
                    {form.recipe.map((line, i) => {
                      const selectedIng = ingredients.find((ing) => ing.id === line.ingredientId);
                      return (
                        <div key={i} className="flex items-start gap-2">
                          {/* Ingredient dropdown — name resolved in current language */}
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
                              <option value="">{t('menu_form_select_ingredient')}</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {getLocalized(ing.name, lang)} ({ing.unit})
                                </option>
                              ))}
                            </select>
                            {errors[`r_${i}_ingredientId`] && (
                              <p className="mt-0.5 text-xs text-danger">{t(errors[`r_${i}_ingredientId`])}</p>
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
                              placeholder={t('menu_form_qty_placeholder')}
                              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 ${
                                errors[`r_${i}_quantityUsed`]
                                  ? 'border-danger focus:border-danger focus:ring-danger'
                                  : 'border-stone-200 focus:border-primary focus:ring-primary'
                              }`}
                            />
                            {errors[`r_${i}_quantityUsed`] && (
                              <p className="mt-0.5 text-xs text-danger">{t(errors[`r_${i}_quantityUsed`])}</p>
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
                            aria-label={t('menu_form_remove_line_aria')}
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
                  {warning ? t('btn_close') : t('btn_cancel')}
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
                    {submitting ? t('menu_btn_saving') : t('menu_btn_save')}
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
            <h2 className="mb-2 text-h3 font-semibold text-ink">{t('menu_delete_title')}</h2>
            <p className="mb-5 text-sm text-muted">
              {t('menu_delete_body')}{' '}
              <span className="font-semibold text-ink">
                &ldquo;{getLocalized(deleteTarget.name, lang)}&rdquo;
              </span>?{' '}
              {t('menu_delete_warning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                {t('btn_cancel')}
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
                {deleting ? t('btn_deleting') : t('btn_delete')}
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
