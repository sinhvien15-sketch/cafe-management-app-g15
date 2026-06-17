# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — HOÀN THÀNH. Đã pass toàn bộ checklist 1.7 (Level 1, 4, 5) ở 375px / 768px / 1440px.
Sẵn sàng bắt đầu Phase 2.

## Completed
- Phase 1.1: Theme tokens in globals.css, Inter font (latin + vietnamese)
- Phase 1.2: App shell — AppShell.tsx (header + responsive sidebar), route group (app)/
- Phase 1.3: /pos page — item grid, category tabs, cart, modal, toast
- Phase 1.4: /inventory page — sortable table, badges, alert banner, restock modal
- Phase 1.5: /analytics page — 4 KPI cards, 3 recharts charts, empty state, mounted guard
- Phase 1.6: /login page — email/password validation, loading state, mock redirect to /pos
- Phase 1.7: Testing checklist passed (375px, 768px, 1440px — no overflow/overlap)

## Next Steps
- Phase 2.1: Set up Firebase project (done outside Claude Code by user)
- Phase 2.2: lib/firebase.ts + lib/types.ts
- Phase 2.3: scripts/seed.ts (push sample data to Firestore)
- Phase 2.4: Stock-deduction transaction (most critical — use runTransaction)
- Phase 2.5: Inventory Firestore + restock + auto-restore availability
- Phase 2.6: Analytics from real Firestore data
- Phase 2.7: Real Firebase Auth at /login

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4: all tokens in globals.css @theme (no tailwind.config.ts)
- @/* alias maps to project root (tsconfig paths)
- Route group (app) for shell; login is app/login/page.tsx (no shell)
- recharts: always use mounted guard (SSR outputs skeleton, client swap to real chart)
- Mock data in app/lib/constants.ts; replaced by Firestore in Phase 2
- CRITICAL: Use Firestore runTransaction for stock deduction (Phase 2.4) — race condition
- Auth: single Firebase Auth, role field in users collection (Phase 2.7)
- KPI card icon uses absolute positioning (pr-11 container) to prevent overlap on narrow cards
- /pos layout: flex-col on mobile, md:flex-row on tablet+ — cart stacks below grid on mobile
