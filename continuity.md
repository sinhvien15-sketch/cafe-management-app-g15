# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) per CAFE_APP_SPEC.md, deploy to Vercel.
Academic project for the F&B Digital Transformation course — Hanoi School of Business and Management.

---

## Current Status
**Phase 1 — COMPLETE** (UI with mock data, tested at 375px / 768px / 1440px)
**Phase 2 — COMPLETE** (Firebase backend fully integrated, all 8 sections done and tested)
**Phase 3 — COMPLETE** (Security rules, optimization, deployed to Vercel)

**PROJECT COMPLETE — Live URL: https://cafe-management-app-g15.vercel.app**

**Post-Phase 3 addition — COMPLETE** (`/menu` full CRUD, owner-only, tested 2026-06-19)

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

## Phase 3 — Completed
- 3.1: `firestore.rules` — role-based Security Rules using `get()` to look up `users/{uid}`; `firebase.json` + `firestore.indexes.json` created
- 3.2: Security audit — no hardcoded keys confirmed, `.env.local` never committed, all forms validated, 3 `console.error(err)` calls removed from production pages (exposed Firebase internals)
- 3.3: Optimization — fixed `onSnapshot` error-flag not clearing on reconnect (bug in `/pos` and `/inventory`); all pages have loading skeletons and friendly error states; Lighthouse `/pos`: Performance 88, FCP 0.2s, LCP 2.2s, TBT 20ms
- 3.4: Testing checklist — Firefox full flow passed; logout → direct URL redirect confirmed on all 3 routes; staff blocked from `/analytics` via nav AND direct URL (route-level `useEffect` redirect added); all 14 Firestore Rules Playground tests passed
- 3.5: Deployed to Vercel — full smoke-test on live URL passed (login, order creation, stock deduction, role access, security)

## Post-Phase 3 Addition — Completed
> This feature was built after the original 3-phase plan was fully complete and deployed.
> It is not part of MASTER_PLAN.md but was added as an enhancement session on 2026-06-19.

- `/menu` full CRUD page — owner-only (staff redirected to `/pos` via `useEffect` guard + nav hidden in AppShell)
- Table layout: dish name, category, price, availability badge, recipe ingredient count, Edit + Delete buttons
- Add/Edit modal: name, category dropdown (from `CATEGORIES` constant), price, available toggle, recipe section
  - Recipe section: `getDocs` loads ingredients for dropdowns; multi-line `{ ingredientId, quantityUsed }` with per-line delete
  - Availability check on save: if `available=true` but any recipe ingredient has `currentStock ≤ 0`, auto-sets `available=false` and shows amber warning banner inside modal (modal stays open; owner must close manually after reading)
- Delete flow: confirmation dialog before `deleteDoc`; existing `orders` unaffected (they store name snapshots, not references)
- `AppShell.tsx` updated: `/menu` nav item changed to `ownerOnly: true`
- `npm run build` passed with zero TypeScript errors
- All 6 test scenarios passed: add with/without recipe, availability warning on low stock, edit recipe, delete without affecting orders, staff blocked via nav and direct URL

---

## Known Issues / Blockers
- None. All pages functional on both localhost and the live Vercel deployment.

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

### Firestore Write Timeouts
- **All user-facing Firestore writes must be wrapped with `withTimeout(promise, ms)`** — a `Promise.race` against a rejection timer defined in `app/lib/utils.ts`. The Firebase JS SDK retries writes indefinitely when the network is lost (silent backoff with no upper bound), which causes the "Saving…" button to freeze for minutes rather than seconds. Lesson learned from offline testing: without an explicit timeout, `runTransaction`, `updateDoc`, `addDoc`, and `deleteDoc` all hang silently.
- **Timeout values in use**: 9 s for primary critical writes (`runTransaction` in POS, `updateDoc` in inventory edit, `addDoc`/`updateDoc` in menu save/delete, `updateDoc` in restock); 5 s for secondary side-effect writes (`Promise.all` for marking menu items unavailable, audit-log `addDoc` in restock).
- **Error distinction in catch blocks**: `err instanceof Error && err.message === 'timeout'` → show network-specific toast (`err_save_timeout` i18n key: "Save failed — check your network connection and try again"); other errors → show the existing generic retry toast. This distinction is important because a timeout implies a network problem, while a Firestore error may indicate a permissions or data issue.
- **Applied to**: `pos/handleConfirm`, `inventory/handleEdit`, `inventory/handleRestock`, `menu/handleSave`, `menu/handleDelete`.

### Security (Phase 3)
- **Firestore Security Rules** in `firestore.rules`: role checked via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`. `orders` and `stock_transactions` are append-only (create allowed, update/delete denied). `ingredients`/`menu_items` allow update by any logged-in user (needed for stock ops) but create/delete only by owner. `users` documents are read-only from the client.
- **Analytics route guard**: `/analytics/page.tsx` contains a `useEffect` that redirects non-owner users to `/pos`, complementing the nav-level hide in `AppShell.tsx`. Double-layer: UI hides the link + route rejects direct access.
- **`console.error` removal**: raw Firebase error objects can expose Firestore document paths in DevTools; all three production error handlers use anonymous `catch {}` and show only a generic Vietnamese toast.
- **recharts `Tooltip` formatter type fix**: production TypeScript build requires `ValueType` (which includes `readonly (string | number)[]`); removed explicit `number | string` annotations, used `typeof v === 'number'` guards instead.

### UI Patterns
- **recharts SSR guard**: `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`. Render `<ChartSkeleton>` on server, swap to real chart after mount. Without this, recharts throws hydration errors.
- **KPI card icon positioning**: icon uses `absolute right-0 top-0` inside a `relative pr-11 min-h-[2.5rem]` container — prevents the icon from overlapping long label text on narrow (2-col) grid cards.
- **VND formatting**: `new Intl.NumberFormat('vi-VN').format(n) + 'đ'` — produces `25.000đ` format.
- **`submitting` state on POS confirm**: disables both the "Xác nhận thanh toán" button AND the modal "Hoàn thành" button during the transaction to prevent double-submission.
- **`onSnapshot` reconnect fix**: both `/pos` and `/inventory` success callbacks call `setMenuError(false)` / `setLoadError(false)` to clear the error banner when the network recovers after a drop.

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
    pos/page.tsx         — POS with runTransaction, onSnapshot error-reset on reconnect
    inventory/page.tsx   — Inventory with onSnapshot + restock, error-reset on reconnect
    analytics/page.tsx   — Analytics with getDocs + recharts, owner-only route guard
    menu/page.tsx        — Menu management — full CRUD with Firestore, owner-only (post-Phase 3)
  login/
    page.tsx             — Real Firebase Auth login
  layout.tsx             — Root layout: AuthProvider wraps everything
scripts/
  seed.ts                — Idempotent Firestore seed (setDoc with explicit IDs)
firestore.rules          — Firestore Security Rules (role-based, get() for role lookup)
firebase.json            — Firebase CLI config (points to firestore.rules)
firestore.indexes.json   — Firestore indexes (empty, required by firebase.json)
```
