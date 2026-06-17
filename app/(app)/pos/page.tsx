'use client';

import { useState, useRef } from 'react';
import { Trash2, Plus, Minus, CheckCircle, ShoppingCart } from 'lucide-react';
import { MOCK_MENU_ITEMS, CATEGORIES, type MenuItem, type CartItem } from '@/app/lib/constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PosPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const orderCounterRef = useRef(1);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredItems =
    activeCategory === 'all'
      ? MOCK_MENU_ITEMS
      : MOCK_MENU_ITEMS.filter((i) => i.category === activeCategory);

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const addToCart = (item: MenuItem) => {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: item.price, quantity: 1 }];
    });
    setLastAddedId(item.id);
    setTimeout(() => setLastAddedId(null), 600);
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const removeItem = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const handleConfirm = () => {
    const code = `ORD-${String(orderCounterRef.current).padStart(4, '0')}`;
    orderCounterRef.current++;
    setShowModal(false);
    setCart([]);
    setPaymentMethod('cash');
    setToast({ visible: true, message: `✓ Tạo đơn thành công — ${code}` });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 2-column layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">

        {/* Left column — menu items */}
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

          {/* Item grid */}
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
          </div>
        </div>

        {/* Right column — cart */}
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
                      {/* Name + unit price */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-muted">{formatVND(item.unitPrice)}</p>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.menuItemId, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 text-muted transition-colors hover:bg-stone-200"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.menuItemId, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 text-muted transition-colors hover:bg-stone-200"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="w-20 text-right text-sm font-semibold text-ink">
                        {formatVND(item.unitPrice * item.quantity)}
                      </span>

                      {/* Delete */}
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
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Tổng cộng</span>
                  <span className="text-h3 font-bold text-primary">{formatVND(total)}</span>
                </div>

                {/* Payment method */}
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'cash' | 'bank_transfer')
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                </select>

                {/* Confirm button */}
                <button
                  onClick={() => setShowModal(true)}
                  disabled={cart.length === 0}
                  className={[
                    'w-full rounded-lg py-3 text-sm font-semibold transition-colors',
                    cart.length > 0
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

            {/* Items summary */}
            <div className="mb-4 space-y-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span className="text-muted">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium text-ink">
                    {formatVND(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total + payment */}
            <div className="border-t border-stone-100 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-ink">Tổng cộng</span>
                <span className="font-bold text-primary">{formatVND(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Thanh toán: {paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-stone-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Hoàn thành
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
