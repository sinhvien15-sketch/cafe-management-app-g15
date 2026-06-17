# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — Analytics page (section 1.5 complete)

## Completed
- Phase 1.1: Theme tokens in globals.css, Inter font (latin + vietnamese)
- Phase 1.2: App shell — AppShell.tsx (header + responsive sidebar), route group (app)/
- Phase 1.3: /pos page — item grid, category tabs, cart, modal, toast
- Phase 1.4: /inventory page — sortable table, badges, alert banner, restock modal
- Phase 1.5: /analytics page with mock data
  - 4 KPI cards: doanh thu, đơn hàng, món bán chạy, nguyên liệu sắp hết (links to /inventory)
  - Bar chart: doanh thu theo giờ (8h–22h, VND axis, hover tooltip)
  - Horizontal bar: top 5 món bán chạy (layout="vertical")
  - Pie chart: tỷ lệ hình thức thanh toán (2 slices: tiền mặt/chuyển khoản)
  - Empty state component (shown when hasData=false; Phase 2 wires real check)
  - mounted guard (useState+useEffect) prevents recharts SSR hydration errors

## Next Steps
- Phase 1.6: /login page — email/password form, client-side validation, mock redirect to /pos

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4: all tokens in globals.css @theme (no tailwind.config.ts)
- @/* alias maps to project root (tsconfig paths)
- Route group (app) for shell; login will be app/login/page.tsx (no shell, Phase 1.6)
- recharts: always use mounted guard (SSR outputs skeleton, client swap to real chart)
- Mock data in app/lib/constants.ts; Firestore in Phase 2
- Use Firestore runTransaction for inventory deduction (Phase 2)
- Auth: single Firebase Auth, role field in users collection (Phase 2)
