# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) per CAFE_APP_SPEC.md, deploy to Vercel.
Academic project for the F&B Digital Transformation course — Hanoi School of Business and Management.

---

## Current Status
**Phase 1 — COMPLETE** (UI with mock data, tested at 375px / 768px / 1440px)
**Phase 2 — COMPLETE** (Firebase backend fully integrated, all 8 sections done and tested)
**Phase 3 — NOT STARTED** (next step when returning to the project)

---

## Phase 1 — Completed
- 1.1: Theme tokens in `globals.css` `@theme` block, Inter font (latin + vietnamese subsets)
- 1.2: AppShell — header, responsive sidebar (collapse to icons on tablet, hamburger on mobile), route group `(app)/`
- 1.3: `/pos` — item grid, category tabs, cart, payment modal, order toast
- 1.4: `/inventory` — sortable table, status badges, restock modal, alert banner
- 1.5: `/analytics` — 4 KPI cards, 3 recharts charts (hourly bar, top-5 horizontal bar, payment pie), empty state, `mounted` SSR guard
- 1.6: `/login` — email + password validation, loading state
- 1.7: Full responsiveness checklist passed (Level 1, 4, 5) at all 3 breakpoints

## Phase 2 — Completed
- 2.1: Firebase project created manually (Firestore + Auth + `.env.local`)
- 2.2: `app/lib/firebase.ts` (singleton init), `app/lib/types.ts` (all Firestore interfaces)
- 2.3: `scripts/seed.ts` — 6 ingredients + 10 menu items pushed to Firestore (`npm run seed`)
- 2.4: `/pos` rewritten — `onSnapshot` for realtime menu, `runTransaction` for atomic order creation + stock deduction
- 2.5: `/inventory` rewritten — `onSnapshot` for realtime stock, restock flow, auto-restores item availability
- 2.6: `/analytics` rewritten — `getDocs` one-time fetch, computes all KPIs + chart data from real Firestore, Refresh button
- 2.7: Real Firebase Auth — `signInWithEmailAndPassword`, reads `users/{uid}` for name + role, AuthContext, AuthGuard, role-based nav, real logout
- 2.8: Full testing checklist passed (Level 1, 2, 3) — including concurrent-order race condition test

---

## Next Steps — Phase 3

Start with **3.1**, then do 3.2 → 3.3 → 3.4 → 3.5 in order:

- **3.1 Firestore Security Rules** — lock down per role and collection (this is the most involved step; requires `get()` inside rules to look up user role)
- **3.2 Security review** — audit for hardcoded keys, confirm `.gitignore`, review client-side validation, remove any `console.log` with sensitive data
- **3.3 Optimization** — verify `onSnapshot` unsubscribes on unmount, audit loading/error states across all pages, Lighthouse score on `/pos`
- **3.4 Testing checklist** — browser testing (Chrome / Safari / Firefox), performance, security scenarios
- **3.5 Deploy to Vercel** — push to GitHub, import to Vercel, set all `NEXT_PUBLIC_FIREBASE_*` env vars, deploy, re-test live URL

---

## Known Issues / Blockers
- None. All pages functional with real data.

---

## Key Technical Decisions

### Architecture
- **Next.js 16.2.9 App Router** with route group `(app)/` — all authenticated pages live here, `/login` is outside the group (no AppShell)
- **Tailwind v4** — all design tokens defined in `globals.css` `@theme {}` block; there is NO `tailwind.config.ts`
- **`@/*` path alias** maps to the project root (configured in `tsconfig.json`)
- **`WithId<T>` utility type** in `types.ts` — attaches Firestore document ID to typed data: `type WithId<T> = T & { id: string }`

### Firebase / Firestore
- **Singleton init pattern** in `firebase.ts`: `getApps().length ? getApp() : initializeApp(config)` — prevents "app already initialized" error on Next.js hot reload
- **`runTransaction` for order creation** (Phase 2.4, the most critical decision): two staff members placing orders simultaneously would both read the same `currentStock` and silently lose each other's deduction. The transaction makes the read→write atomic. Pattern: **all reads first** (inside a `for` loop collecting ingredient snapshots), **then all writes** — Firestore throws if you read after writing in the same transaction.
- **Ingredient IDs are explicit strings** (`coffee-beans`, `fresh-milk`, etc.) set via `setDoc` in the seed script — they are referenced by name in `menu_items[].recipe[].ingredientId`, so they must be stable and human-readable.
- **`onSnapshot` vs `getDocs` choice**: `/pos` and `/inventory` use `onSnapshot` (realtime — staff need to see instant stock changes across tabs). `/analytics` uses `getDocs` + Refresh button (a dashboard is a snapshot; live chart updates mid-viewing would be confusing).
- **Low-stock filter is client-side**: Firestore cannot compare two fields in a single `where()` clause (`currentStock < minThreshold`), so ingredients are fetched in full and filtered in JS.
- **Post-transaction writes** for `stock_transactions` (type `deduction`) and menu item `available = false` are done *after* the transaction resolves — they don't need to be inside it because they're audit/display data, not the critical atomic update.
- **Stale state in restock** (Phase 2.5): after `updateDoc`, `onSnapshot` hasn't fired yet. The availability-restore check uses the locally computed `newStock` for the restocked ingredient, not `ingredients` state which is still stale at that point.

### Authentication & Authorization
- **Firebase Auth + Firestore users collection**: Auth handles identity (email/password), Firestore `users/{uid}` stores `{ name, role, email, createdAt }`. Role is NOT stored in the Auth token — it requires a Firestore read after sign-in.
- **`AuthProvider`** in `app/lib/auth-context.tsx`: wraps the root layout, listens to `onAuthStateChanged`, reads `users/{uid}`, exposes `{ user, loading, logout }` via Context.
- **`AuthGuard`** in `app/components/AuthGuard.tsx`: Client Component wrapping the `(app)` layout. Shows a ☕ loading screen while Firebase resolves the persisted session; redirects to `/login` if no user. This prevents the flash of protected content before redirect.
- **Role-based nav**: `staff` sees /pos, /inventory, /menu (3 items). `owner` sees all 4 including /analytics. Enforced in `AppShell.tsx` by filtering `ALL_NAV` on `ownerOnly` flag.
- **Test accounts**: `owner@cafe.com` (role: owner), `staff@cafe.com` (role: staff) — created in Firebase Console.
- **`staffId` in orders**: uses `auth.currentUser?.uid` (real UID since Phase 2.7).

### UI Patterns
- **recharts SSR guard**: `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`. Render `<ChartSkeleton>` on server, swap to real chart after mount. Without this, recharts throws hydration errors.
- **KPI card icon positioning**: icon uses `absolute right-0 top-0` inside a `relative pr-11 min-h-[2.5rem]` container — prevents the icon from overlapping long label text on narrow (2-col) grid cards.
- **VND formatting**: `new Intl.NumberFormat('vi-VN').format(n) + 'đ'` — produces `25.000đ` format.
- **`submitting` state on POS confirm**: disables both the "Xác nhận thanh toán" button AND the modal "Hoàn thành" button during the transaction to prevent double-submission.

### File Map (key files)
```
app/
  lib/
    firebase.ts          — Firebase singleton (db, auth exports)
    types.ts             — All Firestore TypeScript interfaces
    auth-context.tsx     — AuthProvider + useAuth hook
    constants.ts         — CATEGORIES, CartItem, mock data (Phase 1 remnant, still used for CATEGORIES)
  components/
    AppShell.tsx         — Sidebar + header, role-based nav, real logout
    AuthGuard.tsx        — Route protection wrapper
  (app)/
    layout.tsx           — AuthGuard > AppShell > {children}
    pos/page.tsx         — POS with runTransaction
    inventory/page.tsx   — Inventory with onSnapshot + restock
    analytics/page.tsx   — Analytics with getDocs + recharts
    menu/page.tsx        — Menu management (Phase 1 UI)
  login/
    page.tsx             — Real Firebase Auth login
  layout.tsx             — Root layout: AuthProvider wraps everything
scripts/
  seed.ts                — Idempotent Firestore seed (setDoc with explicit IDs)
```
