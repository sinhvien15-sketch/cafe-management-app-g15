# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — Inventory page (section 1.4 complete)

## Completed
- Phase 1.1: Theme tokens in globals.css, Inter font (latin + vietnamese)
- Phase 1.2: App shell — AppShell.tsx (header + responsive sidebar), route group (app)/
- Phase 1.3: /pos page — item grid, category tabs, cart, modal, toast
- Phase 1.4: /inventory page with mock data
  - constants.ts: added Ingredient type + MOCK_INGREDIENTS (8 items)
  - Sortable table: name + currentStock columns (3-state: asc → desc → reset)
  - Search input filters by ingredient name
  - Status badges: Còn hàng (green) / Sắp hết (amber) / Hết hàng (red)
  - Row highlighting: amber-50 for low stock, red-50 for out of stock
  - Alert banner at top: counts out/low stock items
  - "Nhập hàng" button → restock modal (qty input, validation, Enter key support)
  - Toast confirms successful restock, updates state in-place

## Next Steps
- Phase 1.5: /analytics page — KPI cards + recharts bar/pie/horizontal-bar + empty state

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4: all tokens in globals.css @theme (no tailwind.config.ts)
- @/* alias maps to project root (tsconfig paths)
- Route group (app) for shell pages; login at app/login/ (Phase 1.6)
- Mock data in app/lib/constants.ts; Firestore in Phase 2
- Use Firestore runTransaction for inventory deduction (Phase 2)
- Auth: single Firebase Auth, role field in users collection (Phase 2)
