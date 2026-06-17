# Instructions for Claude Code in this project

This is a project to build a coffee shop management system (POS + Inventory + Analytics),

an academic project for the F&B Digital Transformation course at Hanoi School of Business

and Management.

## Required documents to read before coding

- `CAFE_APP_SPEC.md` — detailed specification: Firestore schema, business flow, business logic
- `MASTER_PLAN.md` — 3-phase deployment plan, sample prompts for each feature
- `continuity.md` — current project status, updated after each session

Always read these 3 files before starting any coding tasks in a new session.

## Working Rules

- Follow the 3 phases in MASTER_PLAN.md in the correct order, do not skip any phases.

- Phase 1: Use mock data only, do not connect to Firebase yet.

- Phase 2: Begin integrating real Firebase.
- The most important technical focus: Use Firestore runTransaction when subtracting inventory

when creating orders, to avoid race conditions.

- After completing a feature, ask me for confirmation before moving on to the next feature.

- Update the continuity.md file when I request "update continuity".