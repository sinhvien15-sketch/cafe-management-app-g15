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

**Post-Phase 3 additions — ALL COMPLETE (as of 2026-06-19)**
- `/menu` full CRUD with recipe management, owner-only
- Supplier information feature in `/inventory`
- Full VI/EN bilingual support across all 5 pages

**PROJECT IS PAUSED — no unfinished work, safe to resume later.**

> **Note:** The restaurant domain has NOT changed. This remains a **coffee shop** management
> system throughout. No migration to noodle/pho or any other F&B domain has occurred.

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

## Post-Phase 3 Additions — Completed
> These features were built after the original 3-phase plan was fully complete and deployed.
> They are not part of MASTER_PLAN.md but were added as enhancement sessions.

### Menu Management page (`/menu`)
- Full CRUD — add, edit, delete menu items; owner-only (staff redirected to `/pos`)
- Table: dish name, category, price, availability badge, recipe ingredient count, Edit + Delete buttons
- Add/Edit modal: VI name, EN name (with auto-translate), category dropdown, price, available toggle, recipe section
  - Recipe section: `getDocs` loads ingredients for dropdowns; multi-line `{ ingredientId, quantityUsed }` with per-line delete
  - Availability check on save: if `available=true` but any recipe ingredient has `currentStock ≤ 0`, auto-sets `available=false` and shows amber warning in modal
- Delete flow: confirmation dialog before `deleteDoc`; existing orders unaffected (they store name snapshots, not references)
- All 6 test scenarios passed: add with/without recipe, availability warning on low stock, edit recipe, delete without affecting orders, staff blocked via nav and direct URL

### Supplier feature (`/inventory`)
- Edit modal extended with optional supplier section: name, phone, Zalo, address
- Supplier detail modal: click a supplier name in the table to view full contact info
- Supplier names and addresses are intentionally NOT translated (they are proper nouns / identifiers, not UI labels)

### Full bilingual support — Vietnamese / English (VI/EN)
- All 5 pages fully translated: `/login`, `/pos`, `/inventory`, `/analytics`, `/menu`
- Language toggle in AppShell header; preference persisted in `localStorage`
- **`LocalizedText = { vi: string; en: string }`** — bilingual field type stored in Firestore for `MenuItem.name`, `Ingredient.name`, `OrderItem.name`
- **`getLocalized(text, lang)`** — read helper; handles legacy plain-string docs gracefully
- **`useLanguage()` → `{ lang, setLang, t }`** — hook providing `t(key)` dictionary lookup
- **`app/lib/i18n.tsx`** — full bilingual dictionary (~200 keys), covers all pages
- **Auto-translate** via MyMemory Translation API, called through a secure Next.js API route (`/api/translate`) — no API key required; falls back gracefully (toast shown, field left empty, save not blocked)
- `withTimeout(fetch(...), 6000)` on the API route, `AbortSignal.timeout(6000)` for the upstream call
- Supplier names/addresses are intentionally NOT auto-translated (proper names/identifiers)

---

## Known Issues / Blockers
- None. All pages functional on both localhost and the live Vercel deployment.
- Project is paused in a clean, complete state.

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
- **All user-facing Firestore writes must be wrapped with `withTimeout(promise, ms)`** — a `Promise.race` against a rejection timer defined in `app/lib/utils.ts`. The Firebase JS SDK retries writes indefinitely when the network is lost (silent backoff with no upper bound), causing the "Saving…" button to freeze for minutes with no feedback.
- **Timeout values in use**: 9 s for primary critical writes (`runTransaction` in POS, `updateDoc` in inventory edit, `addDoc`/`updateDoc` in menu save/delete, `updateDoc` in restock); 5 s for secondary side-effect writes (`Promise.all` for marking menu items unavailable, audit-log `addDoc` in restock).
- **Error distinction in catch blocks**: `err instanceof Error && err.message === 'timeout'` → show network-specific toast (`err_save_timeout`); other errors → show generic retry toast. This matters because a timeout implies a connectivity problem, while a Firestore error may indicate a permissions or data issue — the user needs different guidance for each.
- **Applied to**: `pos/handleConfirm`, `inventory/handleEdit`, `inventory/handleRestock`, `menu/handleSave`, `menu/handleDelete`.
- **Lesson**: This is a Firebase-specific gotcha not documented prominently in Firebase docs. Any production app using the Firebase JS SDK in a browser needs this pattern for all write paths.

### Security (Phase 3)
- **Firestore Security Rules** in `firestore.rules`: role checked via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`. `orders` and `stock_transactions` are append-only (create allowed, update/delete denied). `ingredients`/`menu_items` allow update by any logged-in user (needed for stock ops) but create/delete only by owner. `users` documents are read-only from the client.
- **Analytics route guard**: `/analytics/page.tsx` contains a `useEffect` that redirects non-owner users to `/pos`, complementing the nav-level hide in `AppShell.tsx`. Double-layer: UI hides the link + route rejects direct access.
- **`console.error` removal**: raw Firebase error objects can expose Firestore document paths in DevTools; all production error handlers use anonymous `catch {}` and show only a generic toast.
- **recharts `Tooltip` formatter type fix**: production TypeScript build requires `ValueType` (which includes `readonly (string | number)[]`); removed explicit `number | string` annotations, used `typeof v === 'number'` guards instead.

### UI Patterns
- **recharts SSR guard**: `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`. Render `<ChartSkeleton>` on server, swap to real chart after mount. Without this, recharts throws hydration errors.
- **KPI card icon positioning**: icon uses `absolute right-0 top-0` inside a `relative pr-11 min-h-[2.5rem]` container — prevents the icon from overlapping long label text on narrow (2-col) grid cards.
- **VND formatting**: `new Intl.NumberFormat('vi-VN').format(n) + 'đ'` — produces `25.000đ` format.
- **`submitting` state on POS confirm**: disables both the confirm button AND the modal close button during the transaction to prevent double-submission.
- **`onSnapshot` reconnect fix**: both `/pos` and `/inventory` success callbacks call `setMenuError(false)` / `setLoadError(false)` to clear the error banner when the network recovers after a drop.

---

## Important Technical Lessons Learned
*(For use in academic reports and future projects)*

### 1. TypeScript type assertions (`as Type`) do not verify runtime data
When reading Firestore documents with `doc.data() as MenuItem`, TypeScript trusts the assertion completely — it does not check whether the actual data matches the type. If a document was created before a schema migration (e.g., before `name` changed from `string` to `{ vi, en }`), the runtime value is still a plain string even though TypeScript sees `LocalizedText`.

**Pattern applied:** `getLocalized(text, lang)` checks `typeof text === 'string'` at runtime and handles both old and new formats. `ensureLocalized(name)` is used at write boundaries to coerce legacy strings into `{ vi, en }` objects. Never assume Firestore data matches your TypeScript type — always handle the legacy format explicitly at the boundary where data enters the system.

### 2. Stored data snapshots must be fully multilingual, not UI-language-dependent
When an order is created, `OrderItem.name` is saved as a snapshot of the menu item name at that moment. If only the currently-displayed language is saved (e.g., `name: getLocalized(item.name, lang)`), all historical orders are locked into whatever language was active at creation time — switching the UI language later will show the wrong language or a missing name in order history and analytics.

**Pattern applied:** Always write `{ vi: ..., en: ... }` to Firestore for any field that will be displayed to users. Resolve to a display string only at render time using `getLocalized(storedName, lang)`. The stored object carries both languages permanently; the UI picks the right one on demand.

### 3. Bilingual data entry forms need two simultaneous fields, not one switching field
An initial design approach was to show one name field that changes label/placeholder based on the current UI language (VI mode → "Tên món", EN mode → "Item name"). This is dangerous: if the owner edits a name in VI mode and saves, the write path only has the VI value — the EN value is silently overwritten with the same string (or lost entirely).

**Pattern applied:** Always show both `name (Vietnamese)` and `name (English)` fields simultaneously in the same modal, regardless of the current UI language. `fromItem()` reads each language independently: `getLocalized(item.name, 'vi')` and `getLocalized(item.name, 'en')` into separate form fields. The save path writes `{ vi: form.name.trim(), en: form.nameEn.trim() }` explicitly. This makes the two-language nature visible and prevents any implicit overwrite.

### 4. Firebase SDK does not time out writes when the network is lost
The Firebase JS SDK's default behavior for Firestore writes (`addDoc`, `updateDoc`, `deleteDoc`, `runTransaction`) when offline is to queue the operation and retry silently with exponential backoff — indefinitely, with no upper bound and no user-facing feedback. The Promise returned by these calls never rejects; it simply never resolves. This causes any "Saving…" loading state to freeze forever from the user's perspective.

**Pattern applied:** Wrap every user-facing write in `withTimeout(promise, ms)` — a `Promise.race` between the Firestore call and a timeout rejection:
```typescript
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}
```
Catch blocks check `err instanceof Error && err.message === 'timeout'` to distinguish network timeouts from permission/data errors and show appropriate messages. Applied to all 5 write paths in this project. This is a necessary pattern for any production Firebase web app.

### 5. Analytics grouping must use stable IDs, not display strings
When grouping orders by menu item to compute "best-selling items," grouping by `item.name` (a display string) fails silently if the same dish appears under two different name formats (e.g., after a bilingual migration where some orders have `name: "Cà phê"` as a string and others have `name: { vi: "Cà phê", en: "Coffee" }`). Two rows appear in the chart for what is actually the same item.

**Pattern applied:** Group by `menuItemId` (the stable Firestore document ID), not by name. Resolve the display name separately at render time via `getLocalized(item.name, lang)`. IDs never change; display strings can be migrated, corrected, or translated without breaking aggregations.

### 6. Functions outside the React component tree cannot call hooks
`loadAnalytics()` is defined outside the React component to keep the component body clean. It cannot call `useLanguage()` or `t()` because React hooks can only be called from within a component or another hook.

**Pattern applied:** Store raw primitive keys (e.g., `'cash'` and `'bank_transfer'`) in the data returned by `loadAnalytics()`, and resolve them to translated display strings inside the component using a `displayPaymentData` mapping. Similarly, `STATUS_CONFIG` in `/inventory` uses a `labelKey` string field (a dict key) instead of a pre-translated label; JSX calls `t(cfg.labelKey)` at render time.

### 7. TypeScript loses literal types through `.filter()` without `as const`
```typescript
// BUG — TypeScript infers name as `string`, not `'cash' | 'bank_transfer'`
const data = [
  { name: 'cash',         value: 100 },
  { name: 'bank_transfer', value: 200 },
].filter((d) => d.value > 0);

// FIX — `as const` preserves the literal type through the filter
const data = [
  { name: 'cash' as const,          value: 100 },
  { name: 'bank_transfer' as const, value: 200 },
].filter((d) => d.value > 0);
```
This caused a TypeScript build error in production when the filtered array was assigned to a typed variable expecting `'cash' | 'bank_transfer'`. The fix is `as const` on the string literal, not a type annotation on the variable.

### 8. Sub-components inside the React tree can call hooks independently
When a sub-component like `<EmptyState>` is defined outside the main component function but still rendered inside the provider tree (inside `<LanguageProvider>`), it can and should call `useLanguage()` itself — not receive `t` as a prop. This keeps the API clean and avoids prop-drilling. The hook works because the component is rendered inside the provider tree at runtime, even though it is defined outside the main function.

### 9. When aggregating historical records, resolve labels from the live source — not the first snapshot found
When computing aggregated data from multiple historical records (e.g., grouping today's orders by `menuItemId` to find the top 5 best-selling items), the name/label for each group should come from the **current live data source** (`menu_items`), not from whichever order snapshot happened to be processed first.

The bug: `loadAnalytics()` iterated over orders and, on the first encounter of a `menuItemId`, locked in `item.name` from that order snapshot. If that order was created before the bilingual migration, `item.name` was a plain Vietnamese string — and `getLocalized()` on a plain string correctly returns it unchanged regardless of language. Every subsequent order for the same item only accumulated qty; the name was never updated. The result: even though `menu_items/sinh-to-xoai` had `{ vi: "Sinh tố xoài", en: "Mango Smoothie" }`, analytics always showed "Sinh tố xoài" in EN mode.

**Pattern applied:** `loadAnalytics()` now fetches `menu_items` in the same `Promise.all` call and builds a `menuItemId → name` lookup map. The item map uses `menuNameMap.get(item.menuItemId) ?? item.name` — the live record is always preferred; the order snapshot is only the fallback for items deleted from the menu since the order was placed.

**General rule:** Order/transaction records are append-only immutable history. Their embedded name snapshots capture what existed at the time of creation and should not be trusted as the display label for aggregation views. For aggregation, always join back to the live master record (menu items, products, users) and use the snapshot only as a last resort when the master record no longer exists.

---

## File Map (key files)
```
app/
  lib/
    firebase.ts          — Firebase singleton (db, auth exports)
    types.ts             — All Firestore TypeScript interfaces (LocalizedText, MenuItem, Ingredient, etc.)
    auth-context.tsx     — AuthProvider + useAuth hook
    constants.ts         — CATEGORIES constant (Phase 1 remnant, still used for dropdowns)
    i18n.tsx             — LanguageProvider, useLanguage hook, t() dictionary (~200 keys, VI+EN)
    utils.ts             — withTimeout<T>() utility (Promise.race timeout wrapper)
  components/
    AppShell.tsx         — Sidebar + header, role-based nav, language toggle, real logout
    AuthGuard.tsx        — Route protection wrapper
  (app)/
    layout.tsx           — AuthGuard > AppShell > {children}
    pos/page.tsx         — POS with runTransaction, onSnapshot, withTimeout
    inventory/page.tsx   — Inventory with onSnapshot + restock + supplier, withTimeout
    analytics/page.tsx   — Analytics with getDocs + recharts, owner-only route guard
    menu/page.tsx        — Menu CRUD with recipe, bilingual names, auto-translate, withTimeout
  api/
    translate/route.ts   — Next.js API route proxying MyMemory Translation API (no key required)
  login/
    page.tsx             — Real Firebase Auth login
  layout.tsx             — Root layout: AuthProvider + LanguageProvider wrap everything
scripts/
  seed.ts                — Idempotent Firestore seed (setDoc with explicit IDs)
firestore.rules          — Firestore Security Rules (role-based, get() for role lookup)
firebase.json            — Firebase CLI config (points to firestore.rules)
firestore.indexes.json   — Firestore indexes (empty, required by firebase.json)
```
