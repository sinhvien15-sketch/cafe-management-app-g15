# Project: Coffee Shop Management System (POS + Inventory + Analytics)

## Goal
Build MVP 3 modules (POS, Inventory, Analytics) according to CAFE_APP_SPEC.md, deploy Vercel.

## Current Status
Phase 1 — Theme & design tokens (section 1.1 complete)

## Completed
- Set up Next.js + TypeScript + Tailwind project
- CAFE_APP_SPEC.md and MASTER_PLAN.md created at project root
- Phase 1.1: Theme applied
  - globals.css: Tailwind v4 @theme tokens (brand colours, surface colours, shadows,
    typography scale helpers, CSS variables for card-padding / section-gap / radii)
  - layout.tsx: switched to Inter font (latin + vietnamese subsets), CaféOS metadata,
    lang="vi"

## Next Steps
- Phase 1.2: App shell layout (Header + Sidebar + Container in layout.tsx)

## Known Issues / Blockers
- None

## Key Decisions
- Tailwind v4 installed — no tailwind.config.ts; all design tokens live in globals.css
  using the @theme directive (Tailwind v4 convention, not v3)
- Inter font with vietnamese subset chosen to support Vietnamese diacritics (Level 5 test)
- Use Firestore runTransaction for inventory deduction logic to avoid race conditions
- Auth: single Firebase Auth system, permissions via role field in users collection
