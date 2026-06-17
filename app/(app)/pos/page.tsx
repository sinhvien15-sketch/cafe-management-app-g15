'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  Trash2, Plus, Minus, CheckCircle, AlertCircle, ShoppingCart, Loader2,
} from 'lucide-react';
import { db, auth } from '@/app/lib/firebase';
import type { MenuItem, Ingredient, WithId } from '@/app/lib/types';
import { CATEGORIES, type CartItem } from '@/app/lib/constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PosPage() {
  // ── Remote state ──────────────────────────────────────────────────────────
  const [menuItems,   setMenuItems]   = useState<WithId<MenuItem>[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError,   setMenuError]   = useState(false);

  // ── Local UI state ────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart,           setCart]           = useState<CartItem[]>([]);
  const [paymentMethod,  setPaymentMethod]  = useState<'cash' | 'bank_transfer'>('cash');
  const [showModal,      setShowModal]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [toast,  setToast]  = useState({ visible: false, message: '', error: false });
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const orderCounterRef = useRef(1);

  // ── Load menu items in realtime ───────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'menu_items'),
      (snap) => {
        setMenuItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuItem) })));
        setLoadingMenu(false);
      },
      () => {
        setMenuError(true);
        setLoadingMenu(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredItems = menuItems.filter(
    (i) => activeCategory === 'all' || i.category === activeCategory,
  );
  const total    = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Cart handlers ──────────────────────────────────────────────────────────
  const addToCart = (item: WithId<MenuItem>) => {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing)
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: item.price, quantity: 1 }];
    });
    setLastAddedId(item.id);
    setTimeout(() => setLastAddedId(null), 600);
  };

  const updateQty = (menuItemId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );

  const removeItem = (menuItemId: string) =>
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));

  const showToast = (message: string, error = false) => {
    setToast({ visible: true, message, error });
    setTimeout(() => setToast({ visible: false, message: '', error: false }), error ? 4000 : 3000);
  };

  // ── Order confirmation — the critical path ────────────────────────────────
  const handleConfirm = async () => {
    if (submitting || cart.length === 0) return;
    setSubmitting(true);

    const now       = Timestamp.now();
    const orderCode = `ORD-${String(orderCounterRef.current).padStart(4, '0')}`;
    // Create the ref before the transaction — reserves an ID without writing yet
    const orderRef  = doc(collection(db, 'orders'));

    // Aggregate deductions across all cart items so each ingredient is read/
    // written exactly once inside the transaction (even if two cart items share
    // the same ingredient).
    const deductionMap = new Map<string, number>(); // ingredientId → qty to remove
    for (const cartItem of cart) {
      const menuItem = menuItems.find((m) => m.id === cartItem.menuItemId);
      if (!menuItem) continue;
      for (const r of menuItem.recipe) {
        deductionMap.set(
          r.ingredientId,
          (deductionMap.get(r.ingredientId) ?? 0) + r.quantityUsed * cartItem.quantity,
        );
      }
    }

    const depletedIds: string[] = []; // ingredients that hit 0 after this order

    try {
      // ── Step 1: runTransaction ─────────────────────────────────────────────
      //
      // Reads first, then writes — required by Firestore's transaction model.
      // If another transaction commits to any of these docs between our read
      // and write, Firestore retries the entire function automatically.

      await runTransaction(db, async (txn) => {
        // ── All reads ──────────────────────────────────────────────────────
        const ingSnaps: Record<string, ReturnType<typeof Object.create>> = {};
        for (const ingredientId of deductionMap.keys()) {
          ingSnaps[ingredientId] = await txn.get(doc(db, 'ingredients', ingredientId));
        }

        // ── All writes ─────────────────────────────────────────────────────

        // 1. Create the order document
        txn.set(orderRef, {
          orderCode,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            name:       c.name,
            quantity:   c.quantity,
            unitPrice:  c.unitPrice,
            subtotal:   c.unitPrice * c.quantity,
          })),
          totalAmount:   total,
          paymentMethod,
          // auth.currentUser is null until Phase 2.7 wires real Firebase Auth
          staffId:   auth.currentUser?.uid ?? 'mock-staff',
          createdAt: now,
        });

        // 2. Deduct each ingredient's stock
        for (const [ingredientId, deductQty] of deductionMap) {
          const snap = ingSnaps[ingredientId];
          if (!snap.exists()) continue;

          const currentStock = (snap.data() as Ingredient).currentStock;
          const newStock     = Math.max(0, currentStock - deductQty);

          txn.update(doc(db, 'ingredients', ingredientId), {
            currentStock: newStock,
            updatedAt:    now,
          });

          if (newStock <= 0) depletedIds.push(ingredientId);
        }
      });

      // ── Step 2: mark related menu items unavailable (post-transaction) ─────
      // Not inside the transaction — the menu item's availability is derived
      // state; losing this update in an edge case is recoverable (restock fixes
      // it). The onSnapshot listener on this page refreshes the grid instantly.
      if (depletedIds.length > 0) {
        const affected = menuItems.filter((m) =>
          m.recipe.some((r) => depletedIds.includes(r.ingredientId)),
        );
        await Promise.all(
          affected.map((m) =>
            updateDoc(doc(db, 'menu_items', m.id), { available: false }),
          ),
        );
      }

      // ── Step 3: write stock_transaction history (audit log) ─────────────────
      // Per spec: outside the main transaction — append-only log, not critical
      // to be atomic with the order itself.
      await Promise.all(
        Array.from(deductionMap.entries()).map(([ingredientId, quantity]) =>
          addDoc(collection(db, 'stock_transactions'), {
            ingredientId,
            type:           'deduction',
            quantity,
            relatedOrderId: orderRef.id,
            createdAt:      now,
          }),
        ),
      );

      // ── Success ───────────────────────────────────────────────────────────
      orderCounterRef.current++;
      setCart([]);
      setPaymentMethod('cash');
      showToast(`✓ Tạo đơn thành công — ${orderCode}`);

    } catch (err) {
      console.error('Order failed:', err);
      showToast('✗ Tạo đơn thất bại, vui lòng thử lại', true);
    } finally {
      setSubmitting(false);
      setShowModal(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 2-column layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">

        {/* Left: menu items ─────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 mb-4 font-semibold text-ink">Chọn món</h1>

          {/* Category tabs */}
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-stone-200">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={[
                  '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors',
                  activeCategory === cat.value
                    ? 'border-primary font-bold text-primary'
                    : 'border-transparent text-muted hover:text-ink',
                ].join(' ')}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loadingMenu && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loadingMenu && menuError && (
            <div className="flex flex-col items-center gap-2 py-16 text-danger">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">Không thể tải menu — kiểm tra kết nối.</p>
            </div>
          )}

          {/* Item grid */}
          {!loadingMenu && !menuError && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={!item.available}
                  className={[
                    'relative rounded-xl border border-stone-100 bg-surface p-4 text-left',
                    'shadow-card transition-all duration-150',
                    item.available
                      ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover'
                      : 'cursor-not-allowed opacity-50',
                    lastAddedId === item.id ? 'ring-2 ring-accent' : '',
                  ].join(' ')}
                >
                  {!item.available && (
                    <span className="absolute right-2 top-2 rounded-full bg-danger px-2 py-0.5 text-xs font-medium text-white">
                      Hết hàng
                    </span>
                  )}
                  <p className="pr-12 text-sm font-semibold leading-snug text-ink">
                    {item.name}
                  </p>
                  <p className="mt-2 text-base font-bold text-secondary">
                    {formatVND(item.price)}
                  </p>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <p className="col-span-4 py-12 text-center text-sm text-muted">
                  Không có món nào trong danh mục này
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: cart ──────────────────────────────────────────────────────── */}
        <div className="w-full flex-none md:w-[320px]">
          <div className="md:sticky md:top-0">
            <div className="flex flex-col rounded-xl border border-stone-100 bg-surface shadow-card md:max-h-[calc(100vh-8rem)]">

              {/* Cart header */}
              <div className="flex flex-none items-center gap-2 border-b border-stone-100 px-5 py-4">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-h3 font-semibold text-ink">Đơn hàng</h2>
                {totalQty > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                    {totalQty}
                  </span>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-3">
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">Chưa có món nào</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-muted">{formatVND(item.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.menuItemId, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 text-muted hover:bg-stone-200"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.menuItemId, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 text-muted hover:bg-stone-200"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-ink">
                        {formatVND(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="text-muted transition-colors hover:text-danger"
                        aria-label={`Xóa ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Cart footer */}
              <div className="flex-none space-y-4 border-t border-stone-100 px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Tổng cộng</span>
                  <span className="text-h3 font-bold text-primary">{formatVND(total)}</span>
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_transfer')}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                </select>
                <button
                  onClick={() => setShowModal(true)}
                  disabled={cart.length === 0 || submitting}
                  className={[
                    'w-full rounded-lg py-3 text-sm font-semibold transition-colors',
                    cart.length > 0 && !submitting
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'cursor-not-allowed bg-stone-100 text-muted',
                  ].join(' ')}
                >
                  Xác nhận thanh toán
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order confirmation modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-h3 mb-4 font-semibold text-ink">Xác nhận đơn hàng</h2>
            <div className="mb-4 space-y-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span className="text-muted">{item.name} × {item.quantity}</span>
                  <span className="font-medium text-ink">
                    {formatVND(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-ink">Tổng cộng</span>
                <span className="font-bold text-primary">{formatVND(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Thanh toán: {paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted hover:bg-stone-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={[
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5',
                  'text-sm font-semibold transition-colors',
                  submitting
                    ? 'cursor-wait bg-primary/75 text-white'
                    : 'bg-primary text-white hover:bg-primary-hover',
                ].join(' ')}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Đang xử lý…' : 'Hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
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
