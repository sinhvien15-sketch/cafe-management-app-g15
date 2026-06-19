import type { Timestamp } from 'firebase/firestore';

// Utility: attach a Firestore document ID to any typed document
export type WithId<T> = T & { id: string };

// Bilingual text — used for MenuItem.name and Ingredient.name
export type LocalizedText = { vi: string; en: string };

// ── users ─────────────────────────────────────────────────────────────────────

export type UserRole = 'staff' | 'owner';

export interface User {
  name: string;
  role: UserRole;
  email: string;
  createdAt: Timestamp;
}

// ── menu_items ────────────────────────────────────────────────────────────────

export type Category = 'coffee' | 'tea' | 'smoothie' | 'snack';

export interface RecipeItem {
  ingredientId: string;
  quantityUsed: number;   // e.g. 18 → 18 g of coffee beans per cup
}

export interface MenuItem {
  name: LocalizedText;    // bilingual: { vi, en }
  price: number;          // VND
  category: Category;
  recipe: RecipeItem[];
  available: boolean;     // set to false automatically when a recipe ingredient hits 0
  createdAt: Timestamp;
}

// ── ingredients ───────────────────────────────────────────────────────────────

export interface Supplier {
  name:    string;
  phone:   string;
  zalo:    string;
  address: string;
}

export interface Ingredient {
  name: LocalizedText;    // bilingual: { vi, en }
  unit: string;           // "g" | "ml" | "kg" | "l" | "piece"
  currentStock: number;
  minThreshold: number;   // alert threshold
  lastRestockedAt: Timestamp;
  updatedAt: Timestamp;
  supplier: Supplier | null;  // null for old documents or ingredients without a supplier
}

// ── orders ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  menuItemId: string;
  name: string;           // name snapshot at time of order (menu names can change later)
  quantity: number;
  unitPrice: number;
  subtotal: number;       // unitPrice × quantity
}

export type PaymentMethod = 'cash' | 'bank_transfer';

export interface Order {
  orderCode: string;      // "ORD-0001"
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  staffId: string;        // uid of the staff who created the order
  createdAt: Timestamp;
}

// ── stock_transactions ────────────────────────────────────────────────────────

export type StockTransactionType = 'deduction' | 'restock';

export interface StockTransaction {
  ingredientId: string;
  type: StockTransactionType;
  quantity: number;
  relatedOrderId: string | null;  // null for restock entries
  createdAt: Timestamp;
}
