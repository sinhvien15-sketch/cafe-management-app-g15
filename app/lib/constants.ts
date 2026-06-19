// ── Types ────────────────────────────────────────────────────────────────────

export type Category = 'coffee' | 'tea' | 'smoothie' | 'snack';

export type MenuItem = {
  id: string;
  name: string;
  price: number;       // VND
  category: Category;
  available: boolean;
};

import type { LocalizedText } from './types';

export type CartItem = {
  menuItemId: string;
  name: LocalizedText;   // bilingual — resolved to string at display time via getLocalized
  unitPrice: number;
  quantity: number;
};

// ── Category labels ───────────────────────────────────────────────────────────

export const CATEGORIES: { value: 'all' | Category; label: string }[] = [
  { value: 'all',      label: 'Tất cả'     },
  { value: 'coffee',   label: 'Cà phê'     },
  { value: 'tea',      label: 'Trà'         },
  { value: 'smoothie', label: 'Sinh tố'    },
  { value: 'snack',    label: 'Đồ ăn nhẹ' },
];

// ── Ingredient ────────────────────────────────────────────────────────────────

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minThreshold: number;
};

// ── Mock ingredients (Phase 1 — replaced by Firestore in Phase 2) ─────────────

export const MOCK_INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'Hạt cà phê',  unit: 'g',  currentStock: 2500, minThreshold: 500  },
  { id: 'i2', name: 'Sữa tươi',    unit: 'ml', currentStock: 800,  minThreshold: 1000 },
  { id: 'i3', name: 'Đường',        unit: 'g',  currentStock: 3000, minThreshold: 500  },
  { id: 'i4', name: 'Trân châu',   unit: 'g',  currentStock: 0,    minThreshold: 300  },
  { id: 'i5', name: 'Bột cacao',   unit: 'g',  currentStock: 150,  minThreshold: 200  },
  { id: 'i6', name: 'Bơ lên men',  unit: 'g',  currentStock: 1200, minThreshold: 400  },
  { id: 'i7', name: 'Xoài chín',   unit: 'g',  currentStock: 80,   minThreshold: 300  },
  { id: 'i8', name: 'Mật ong',     unit: 'ml', currentStock: 600,  minThreshold: 200  },
];

// ── Mock menu items (Phase 1 — replaced by Firestore in Phase 2) ─────────────

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // ── Cà phê ──
  { id: 'm1',  name: 'Cà phê đen',        price: 25000, category: 'coffee',   available: true  },
  { id: 'm2',  name: 'Cà phê sữa',        price: 29000, category: 'coffee',   available: true  },
  { id: 'm3',  name: 'Bạc xỉu',           price: 32000, category: 'coffee',   available: true  },
  { id: 'm4',  name: 'Cà phê trứng',      price: 35000, category: 'coffee',   available: true  },
  // ── Trà ──
  { id: 'm5',  name: 'Trà sữa trân châu', price: 39000, category: 'tea',      available: false },
  { id: 'm6',  name: 'Trà đào cam sả',    price: 35000, category: 'tea',      available: true  },
  { id: 'm7',  name: 'Trà chanh mật ong', price: 30000, category: 'tea',      available: true  },
  // ── Sinh tố ──
  { id: 'm8',  name: 'Sinh tố bơ',        price: 45000, category: 'smoothie', available: true  },
  { id: 'm9',  name: 'Sinh tố xoài',      price: 42000, category: 'smoothie', available: true  },
  // ── Đồ ăn nhẹ ──
  { id: 'm10', name: 'Bánh croissant',    price: 35000, category: 'snack',    available: true  },
  { id: 'm11', name: 'Bánh mì sandwich', price: 28000, category: 'snack',    available: false },
  { id: 'm12', name: 'Phô mai que',      price: 25000, category: 'snack',    available: true  },
];
