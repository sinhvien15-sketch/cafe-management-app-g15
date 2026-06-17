/**
 * Seed script — pushes sample menu_items and ingredients into Firestore.
 * Safe to re-run: uses setDoc with fixed IDs (overwrites existing docs).
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// ── Firebase init ─────────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// ── Seed data ─────────────────────────────────────────────────────────────────

// 6 ingredients — IDs are referenced in recipes below, so keep them stable
const INGREDIENTS = [
  { id: 'coffee-beans',   name: 'Hạt cà phê', unit: 'g',  currentStock: 2500, minThreshold: 500 },
  { id: 'fresh-milk',     name: 'Sữa tươi',   unit: 'ml', currentStock: 3000, minThreshold: 800 },
  { id: 'sugar',          name: 'Đường',       unit: 'g',  currentStock: 2000, minThreshold: 300 },
  { id: 'tapioca-pearls', name: 'Trân châu',  unit: 'g',  currentStock: 500,  minThreshold: 200 },
  { id: 'cocoa-powder',   name: 'Bột cacao',  unit: 'g',  currentStock: 300,  minThreshold: 100 },
  { id: 'mango',          name: 'Xoài chín',  unit: 'g',  currentStock: 1200, minThreshold: 400 },
] as const;

// 10 menu items across 4 categories
// recipe quantityUsed = amount of that ingredient consumed per 1 serving
const MENU_ITEMS = [
  // ── Cà phê ────────────────────────────────────────────────────────────────
  {
    id: 'ca-phe-den',
    name: 'Cà phê đen', price: 25000, category: 'coffee', available: true,
    recipe: [
      { ingredientId: 'coffee-beans', quantityUsed: 18 },
    ],
  },
  {
    id: 'ca-phe-sua',
    name: 'Cà phê sữa', price: 29000, category: 'coffee', available: true,
    recipe: [
      { ingredientId: 'coffee-beans', quantityUsed: 18 },
      { ingredientId: 'fresh-milk',   quantityUsed: 100 },
      { ingredientId: 'sugar',        quantityUsed: 5   },
    ],
  },
  {
    id: 'bac-xiu',
    name: 'Bạc xỉu', price: 32000, category: 'coffee', available: true,
    recipe: [
      { ingredientId: 'coffee-beans', quantityUsed: 10 },
      { ingredientId: 'fresh-milk',   quantityUsed: 150 },
      { ingredientId: 'sugar',        quantityUsed: 8   },
    ],
  },
  {
    id: 'ca-phe-cacao',
    name: 'Cà phê cacao', price: 35000, category: 'coffee', available: true,
    recipe: [
      { ingredientId: 'coffee-beans', quantityUsed: 18 },
      { ingredientId: 'cocoa-powder', quantityUsed: 10 },
      { ingredientId: 'sugar',        quantityUsed: 5  },
    ],
  },
  // ── Trà ───────────────────────────────────────────────────────────────────
  {
    id: 'tra-sua-tran-chau',
    name: 'Trà sữa trân châu', price: 39000, category: 'tea', available: true,
    recipe: [
      { ingredientId: 'fresh-milk',     quantityUsed: 150 },
      { ingredientId: 'tapioca-pearls', quantityUsed: 50  },
      { ingredientId: 'sugar',          quantityUsed: 10  },
    ],
  },
  {
    id: 'tra-dao-cam-sa',
    name: 'Trà đào cam sả', price: 35000, category: 'tea', available: true,
    recipe: [
      { ingredientId: 'sugar', quantityUsed: 10 },
    ],
  },
  // ── Sinh tố ───────────────────────────────────────────────────────────────
  {
    id: 'sinh-to-xoai',
    name: 'Sinh tố xoài', price: 42000, category: 'smoothie', available: true,
    recipe: [
      { ingredientId: 'mango', quantityUsed: 200 },
      { ingredientId: 'sugar', quantityUsed: 10  },
    ],
  },
  {
    id: 'sinh-to-cacao',
    name: 'Sinh tố cacao', price: 38000, category: 'smoothie', available: true,
    recipe: [
      { ingredientId: 'fresh-milk',   quantityUsed: 200 },
      { ingredientId: 'cocoa-powder', quantityUsed: 15  },
      { ingredientId: 'sugar',        quantityUsed: 10  },
    ],
  },
  // ── Đồ ăn nhẹ (pre-made — no ingredient tracking needed) ─────────────────
  {
    id: 'croissant',
    name: 'Bánh croissant', price: 35000, category: 'snack', available: true,
    recipe: [],
  },
  {
    id: 'pho-mai-que',
    name: 'Phô mai que', price: 25000, category: 'snack', available: true,
    recipe: [],
  },
] as const;

// ── Runner ────────────────────────────────────────────────────────────────────

async function seed() {
  const now = Timestamp.now();

  // Ingredients
  console.log('\nSeeding ingredients…');
  for (const { id, ...data } of INGREDIENTS) {
    await setDoc(doc(db, 'ingredients', id), {
      ...data,
      lastRestockedAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ ingredients/${id}  (${data.name})`);
  }

  // Menu items
  console.log('\nSeeding menu_items…');
  for (const { id, ...data } of MENU_ITEMS) {
    await setDoc(doc(db, 'menu_items', id), {
      ...data,
      createdAt: now,
    });
    console.log(`  ✓ menu_items/${id}  (${data.name})`);
  }

  console.log('\n✅ Seed complete — check your Firebase Console.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
