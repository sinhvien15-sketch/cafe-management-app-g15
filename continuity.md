# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — POS page (section 1.3 complete)

## Completed
- Phase 1.1: Theme tokens in globals.css, Inter font (latin + vietnamese)
- Phase 1.2: App shell — AppShell.tsx (header + responsive sidebar), route group (app)/,
  root page redirects to /pos
- Phase 1.3: /pos page with mock data
  - app/lib/constants.ts: MenuItem, CartItem types, CATEGORIES, MOCK_MENU_ITEMS (12 items)
  - 2-column layout: item grid (flex-1) + sticky cart panel (w-[320px])
  - Category filter tabs with active underline
  - Item cards: hover lift, out-of-stock badge + opacity + disabled, green ring pulse on add
  - Cart: qty +/- controls, delete, total, payment method select
  - Order confirmation modal (summary → Hoàn thành / Hủy)
  - Success toast (auto-dismiss 3s), cart resets, order counter ORD-0001 etc.

## Next Steps
- Phase 1.4: /inventory page — sortable/filterable table, status badges, restock modal

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4: all tokens in globals.css @theme (no tailwind.config.ts)
- @/* alias maps to project root (tsconfig paths)
- Route group (app) for shell pages; login will be app/login/page.tsx (Phase 1.6)
- AppShell single 'use client' component; page children stay as Server Components
- Mock data in app/lib/constants.ts; will be replaced by Firestore in Phase 2
- Use Firestore runTransaction for inventory deduction (Phase 2)
- Auth: single Firebase Auth, role field in users collection (Phase 2)
