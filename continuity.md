# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — Section 1.6 complete. All UI pages done. Ready for Phase 1.7 testing checklist.

## Completed
- Phase 1.1: Theme tokens in globals.css, Inter font (latin + vietnamese)
- Phase 1.2: App shell — AppShell.tsx (header + responsive sidebar), route group (app)/
- Phase 1.3: /pos page — item grid, category tabs, cart, modal, toast
- Phase 1.4: /inventory page — sortable table, badges, alert banner, restock modal
- Phase 1.5: /analytics page with mock data
  - 4 KPI cards, bar/pie/horizontal-bar charts (recharts), empty state, mounted guard
- Phase 1.6: /login page
  - Email + password inputs with icons (Mail, Lock, Eye/EyeOff)
  - Client-side validation: email regex + min 6-char password
  - Errors shown on blur (or all on submit attempt)
  - Button: disabled (grey) when invalid, loading spinner (brown/75%) on submit
  - Mock: 1s delay → always succeeds → router.push('/pos')
  - Lives at app/login/page.tsx (outside (app) route group → no AppShell)

## Next Steps
- Phase 1.7: run through the testing checklist (Levels 1, 4, 5 from MASTER_PLAN.md)
- After testing passes: git commit "Phase 1 complete: full UI with mock data"
- Then Phase 2: Firebase integration

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4: all tokens in globals.css @theme (no tailwind.config.ts)
- @/* alias maps to project root (tsconfig paths)
- Route group (app) for shell; login is app/login/page.tsx (no shell)
- recharts: always use mounted guard (SSR outputs skeleton, client swap to real chart)
- Mock data in app/lib/constants.ts; Firestore in Phase 2
- Use Firestore runTransaction for inventory deduction (Phase 2)
- Auth: single Firebase Auth, role field in users collection (Phase 2)
- KPI card icon uses absolute positioning (pr-11 container) to prevent overlap on narrow cards
