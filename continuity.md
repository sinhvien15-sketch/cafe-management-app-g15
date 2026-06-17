# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — App shell layout (section 1.2 complete)

## Completed
- Set up Next.js + TypeScript + Tailwind project
- Phase 1.1: Theme tokens in globals.css (@theme, typography helpers, CSS variables)
  Inter font (latin + vietnamese), CaféOS metadata, lang="vi"
- Phase 1.2: App shell layout
  - app/components/AppShell.tsx — Client Component: sticky header, responsive sidebar
    (full 240px on desktop, icon-only 64px on tablet, hidden+hamburger on mobile),
    mock user "Nguyễn Văn A", logout button, active nav highlight
  - app/(app)/layout.tsx — wraps all app pages with AppShell
  - Route group app/(app)/ with placeholder pages for pos, inventory, analytics, menu
  - app/page.tsx redirects to /pos

## Next Steps
- Phase 1.3: /pos page — 2-column layout (item grid + cart) with mock data

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4: all tokens in globals.css @theme (no tailwind.config.ts)
- Inter font with vietnamese subset for Vietnamese diacritics support
- Route group (app) separates shell pages from future (auth)/login page (Phase 1.6)
- AppShell is a single 'use client' component; children (page content) remain Server Components
- Sidebar responsive: CSS-only for tablet (md:w-16 / lg:w-60); JS useState for mobile overlay
- Use Firestore runTransaction for inventory deduction logic (Phase 2)
- Auth: single Firebase Auth, role field in users collection (Phase 2)
