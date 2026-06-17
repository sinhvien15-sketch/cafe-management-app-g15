# Master Plan — Coffee Shop Management System (POS + Inventory + Analytics)
 
> This file is the guiding compass for the entire vibe coding process with Claude Code in
> VS Code. It applies the required 3-phase structure: Phase 1 (layout + interactive elements
> + theme) → Phase 2 (backend integration) → Phase 3 (security + optimization).
> Used alongside CAFE_APP_SPEC.md (detailed schema and business logic spec).
 
---
 
## MVP Canvas (fill out before starting to code)
 
```
1. PROBLEM
A multi-floor coffee shop manages inventory by intuition, with no link to orders,
leading to ingredients running out mid-shift without timely detection.
 
2. TARGET USER
Baristas (use the POS daily) and the shop owner (views Analytics to make decisions).
 
3. CORE FEATURE
Creating an order at the POS automatically deducts stock according to the item's
recipe, alerts when stock is running low, and automatically hides out-of-stock
items from the POS.
 
4. SUCCESS METRIC
- Orders created deduct stock correctly 100% of test runs
- Alerts display correctly when stock falls below the threshold
- The dashboard correctly shows top-selling items and revenue by hour
 
5. SCOPE LIMIT (not built in this version)
- Staff Scheduling, Loyalty/CRM (placed in the report's Roadmap section)
- Real payment gateway processing (only records the method, doesn't process transactions)
- Multi-branch (single shop only)
```
 
---
 
## Working Rules Throughout All 3 Phases (from the Golden Rules)
 
1. **Start simple, iterate gradually** — don't ask Claude Code to build an entire page in
   one prompt; break it down feature by feature.
2. **Be specific about what matters** (stock deduction logic, transactions), flexible about
   what matters less (exact colors, spacing).
3. **Provide sample data** in every prompt related to displaying data (see the item/ingredient
   samples in Phase 1).
4. **Test after every change** — don't accumulate multiple changes before testing.
5. **Save working versions** before requesting major changes — use `git commit` after every
   complete feature, not just at the end of the day.
6. When stuck on a feature after 3-4 attempts, ask: is this feature actually a must-have? If
   not, skip it and note it in the roadmap.

---
 
## The `continuity.md` File — create it right away, update after every coding session
 
Create this file at the repo root, and update it at the end of every Claude Code session:
 
```markdown
# Project: Coffee Shop Management System (POS + Inventory + Analytics)
 
## Goal
Build a 3-module MVP (POS, Inventory, Analytics) per CAFE_APP_SPEC.md, deploy to Vercel,
solving the "inventory frequently runs out" pain point for the F&B Digital Transformation
project.
 
## Current Status
Phase [1/2/3] - [name of the page/feature currently in progress]
 
## Completed
- [List the pages/features that are done and demoable]
 
## Next Steps
- [The next feature to work on]
 
## Known Issues / Blockers
- [Unfixed bugs, or decisions that need to be made]
 
## Key Decisions
- Using Firestore runTransaction for the stock deduction logic to avoid race conditions
- Auth: a single Firebase Auth system, permissions handled via a role field in the
  users collection
- [Add other decisions as they come up]
```
 
**How to use it:** at the start of every new Claude Code session, paste the content of
`continuity.md` first, then state the specific request for that session (similar to the
`daily.md` file described in the reference material).
 
---
 
# PHASE 1 — HTML Layout, Interactive Elements & Theme
 
> Goal: complete the entire UI with mock data (hardcoded in the code, not yet connected to
> real Firebase), with full client-side interactivity. This is where the layout/interactive/
> data-display/form terminology from your reference material gets applied heavily.
 
## 1.1 Set Up the Theme First
 
Sample prompt for Claude Code (following the "Dashboard" Description Template structure from
the reference material):
 
```
Create the theme and design tokens for the coffee shop management system.
 
COLOUR PALETTE:
- Primary: #92400E (deep coffee brown)
- Secondary: #D97706 (warm orange)
- Accent: #059669 (green - used for "good"/sufficient stock status)
- Warning: #F59E0B (yellow - low stock)
- Error: #DC2626 (red - out of stock/error)
- Background: #FFFBEB (light cream)
- Surface (card): #FFFFFF
- Text primary: #1C1917
- Text secondary: #78716C
 
TYPOGRAPHY:
- Font: Inter or system-ui
- H1: 28px weight 600, H2: 22px weight 600, H3: 18px weight 500
- Body: 16px weight 400, Small: 14px
 
SPACING:
- Base unit 8px, card padding 24px, gap between sections 48px
 
BORDER & SHADOW:
- Border radius: 8px (button/input), 12px (card)
- Light shadow for cards: 0 2px 8px rgba(0,0,0,0.08)
 
Save everything into a Tailwind config file (tailwind.config.ts) and a globals.css
file with CSS variables, to be used consistently across all pages going forward.
```
 
## 1.2 Frame Layout (Header, Sidebar, Container)
 
```
Create the main app shell layout using Next.js App Router (layout.tsx).
 
HEADER:
- Logo text "☕ CaféOS" on the left
- Logged-in user's name + logout button on the right
- Sticky, white background, subtle shadow when scrolling
 
SIDEBAR:
- Width 240px, white background, right border
- Menu: Sales (cart icon), Inventory (box icon),
  Analytics (chart icon), Menu Management (menu book icon)
- The active item has a light primary-color background and bold text
- Collapsible to icon-only on tablet, fully hidden + hamburger on mobile
 
CONTAINER:
- Max-width 1400px, padding 24px, using the background color defined in the theme
```
 
## 1.3 The `/pos` Page — Interactive Elements
 
Apply the following terminology: Grid, Card, Hover state, Badge, Click event, Modal.
 
```
Create the POS (sales) page with mock data, NOT yet connected to Firebase.
 
LAYOUT: 2 columns
- Left column (70%): a grid of menu items by category
- Right column (30%): the current cart, sticky while scrolling
 
SAMPLE DATA (mock, place in a constants.ts file):
const mockMenuItems = [
  { id: "m1", name: "Black coffee", price: 25000, category: "coffee", available: true },
  { id: "m2", name: "Milk coffee", price: 29000, category: "coffee", available: true },
  { id: "m3", name: "Bubble milk tea", price: 39000, category: "tea", available: false },
  { id: "m4", name: "Avocado smoothie", price: 45000, category: "smoothie", available: true },
  { id: "m5", name: "Croissant", price: 35000, category: "snack", available: true },
  // add 5-8 more items to cover every category
]
 
CATEGORY FILTER TABS: All, Coffee, Tea, Smoothie, Pastry
- The active tab has an underline and bold text
 
MENU ITEM CARD (grid: 4 columns desktop, 2 columns tablet, responsive):
- Item name, price (VND format: 25.000đ)
- Red "Out of stock" badge if available = false, card appears dimmed, not clickable
- Hover: card lifts slightly (translateY -2px) with a deeper shadow
- Clicking a card where available = true → adds it to the cart (right column), with a
  small effect confirming the addition (e.g. a quantity badge that pulses briefly)
 
CART (right column):
- List of selected items: name, quantity (+/- buttons to adjust), price per item,
  delete button (trash icon)
- Total amount displayed prominently and clearly at the bottom
- Payment method dropdown: "Cash", "Bank transfer"
- "Confirm payment" button (disabled if the cart is empty)
- On clicking confirm: show an order confirmation Modal (summary + "Complete" /
  "Cancel" buttons)
- After completion: show a toast Success message "✓ Order created successfully -
  ORD-0001", auto-dismiss after 3 seconds, cart resets
```
 
## 1.4 The `/inventory` Page — Table, Sortable, Filterable, Badge
 
```
Create the Inventory page with mock data.
 
SAMPLE DATA:
const mockIngredients = [
  { id: "i1", name: "Coffee beans", unit: "g", currentStock: 2500, minThreshold: 500 },
  { id: "i2", name: "Fresh milk", unit: "ml", currentStock: 800, minThreshold: 1000 },
  { id: "i3", name: "Sugar", unit: "g", currentStock: 3000, minThreshold: 500 },
  { id: "i4", name: "Tapioca pearls", unit: "g", currentStock: 0, minThreshold: 300 },
  { id: "i5", name: "Cocoa powder", unit: "g", currentStock: 150, minThreshold: 200 },
]
 
TABLE:
- Columns: Ingredient name (sortable), Unit, Current stock (sortable),
  Alert threshold, Status (badge), Action
- Status badge: green "In stock" if currentStock >= minThreshold,
  yellow "Low stock" if currentStock < minThreshold and > 0,
  red "Out of stock" if currentStock = 0
- A row with "Out of stock" status has a light red background across the whole row
- Search box above: search by ingredient name
- "Action" column: a "Restock" button that opens a Modal to enter the added quantity
 
RESTOCK MODAL:
- Ingredient name (not editable)
- Input for the quantity being added
- "Confirm" / "Cancel" buttons
- After confirming: update currentStock in state, show a Success message
```
 
## 1.5 The `/analytics` Page — KPI Card, Chart, Empty State
 
```
Create the Analytics page with mock data.
 
KPI CARDS (4 cards in a row):
1. "Today's revenue" - 2.450.000đ, ▲ +12% vs yesterday
2. "Order count" - 38, ▲ +5
3. "Best-selling item" - Milk coffee (15 orders)
4. "Low-stock ingredients" - 2 items (link to the Inventory page)
 
CHARTS (using recharts, mock data):
1. Bar chart "Revenue by hour" - X axis is hour (8am-10pm), Y axis is VND
2. Pie chart "Payment method ratio" - Cash vs. Bank transfer
3. Horizontal bar "Top 5 best-selling items" - item name, quantity sold
 
EMPTY STATE: if there are no orders yet today, show a dimmed chart icon +
text "No data for today yet" + subtext "Data will appear once the first order is placed"
```
 
## 1.6 The `/login` Page — Form, Validation
 
```
Create a simple login page.
 
FORM:
- Email input (required, validate email format)
- Password input (required, type password, min 6 characters)
- Error message displayed below each input when invalid
- "Log in" button - disabled when the form isn't valid, loading state on submit
- No need to connect to real Firebase Auth in Phase 1 - just UI + client-side
  validation, submission is assumed to always succeed and redirects to /pos
```
 
## 1.7 Phase 1 Testing Checklist (per Levels 1, 4, 5 in the reference material)
 
```
LEVEL 1 - BASIC FUNCTIONALITY:
[ ] Clicking an in-stock item → correctly adds it to the cart
[ ] Clicking an out-of-stock item → cannot be added, badge displays correctly
[ ] The +/- buttons in the cart work correctly, no negative quantities allowed
[ ] The delete button for an item in the cart works
[ ] The order confirmation modal opens/closes correctly
[ ] Sorting columns in the Inventory table works correctly (ascending/descending/no sort)
[ ] Searching ingredients filters results correctly
 
LEVEL 4 - RESPONSIVE TESTING:
[ ] /pos: the item grid is responsive correctly (4 → 2 → 1 columns)
[ ] The sidebar collapses correctly on tablet/mobile
[ ] The Inventory table scrolls horizontally on mobile without breaking the layout
[ ] The Analytics charts resize correctly for screen size
 
LEVEL 5 - VIETNAMESE LOCALISATION:
[ ] All labels, buttons, and messages display in Vietnamese
[ ] Currency is formatted correctly in Vietnamese style (25.000đ, not 25,000 VND)
[ ] Entering an ingredient name with Vietnamese diacritics displays correctly,
    no font issues
```
 
**Phase 1 is complete when:** all 4 pages run smoothly with mock data, the UI is complete,
and the checklist above has been fully passed. Commit to Git with a clear message, e.g.
`git commit -m "Phase 1 complete: full UI with mock data"`.
 
---
 
# PHASE 2 — Backend Integration
 
> Goal: replace all mock data with real Firebase Firestore, implementing the exact business
> logic described in CAFE_APP_SPEC.md section 5 (especially the stock deduction transaction).
> This is the most important phase for meeting the "Be functional — working prototype"
> requirement.
 
## 2.1 Set Up Firebase (do this first, outside of Claude Code)
 
1. Create a project at https://console.firebase.google.com
2. Enable Firestore Database (test mode first, write Security Rules in Phase 3)
3. Enable Authentication → Email/Password
4. Get the config, create a `.env.local` file:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```
5. `npm install firebase`

## 2.2 Prompt to Initialize the Firebase Connection
 
```
Create a lib/firebase.ts file that initializes the Firebase app and exports the
Firestore (db) and Auth (auth) instances, reading the config from the
NEXT_PUBLIC_FIREBASE_* environment variables.
 
Then create a lib/types.ts file defining TypeScript interfaces for:
- MenuItem (name, price, category, recipe[], available)
- Ingredient (name, unit, currentStock, minThreshold)
- Order (orderCode, items[], totalAmount, paymentMethod, staffId, createdAt)
- StockTransaction (ingredientId, type, quantity, relatedOrderId, createdAt)
- User (name, role, email)
 
Follow the exact schema in CAFE_APP_SPEC.md section 4.
```
 
## 2.3 Seed Script — Push Phase 1's Sample Data into Real Firestore
 
```
Create a scripts/seed.ts script to push sample data into Firestore:
- 8-10 menu_items with recipes referencing ingredients
- 5-6 ingredients with reasonable currentStock and minThreshold values
- Make sure each menu_item's recipe matches a real ingredientId in ingredients
 
Example recipe for "Black coffee":
[{ ingredientId: "coffee-beans", quantityUsed: 18 }]
 
Show me how to run this script (ts-node, or add it to the package.json scripts).
```
 
## 2.4 The Most Important Logic: The Stock-Deduction Transaction
 
```
Implement the order-creation logic on /pos connected to real Firestore, replacing the
mock data with data read from Firestore (menu_items, ingredients).
 
MANDATORY REQUIREMENT - use Firestore's runTransaction():
1. When staff confirms payment, create a new document in the orders collection
2. Within the SAME transaction, for each item in the order:
   a. Read the corresponding ingredient document according to that menu_item's recipe
   b. Calculate the new currentStock = current currentStock - (quantityUsed × quantity sold)
   c. Update the ingredient's currentStock
   d. If the new currentStock < minThreshold, no further action is needed at this step
      (the UI will display the alert automatically by comparing these two fields when
      reading the data)
   e. If the new currentStock <= 0, set currentStock = 0 and flag it so that
      available = false can subsequently be set for any menu_item that uses this
      ingredient in its recipe
3. After the transaction is confirmed, write an additional document into
   stock_transactions with type = "deduction" for each deducted ingredient (writing this
   after the transaction is fine — it doesn't need to be inside the main transaction since
   it's just a history log)
 
Explain to me why a transaction is needed here (race condition) before writing the code.
```
 
## 2.5 Inventory Logic — Restock and Automatically Restoring Availability
 
```
Implement the /inventory page connected to real Firestore:
1. Read the ingredients list in realtime using onSnapshot, automatically updating the UI
   when the data changes (no page refresh needed)
2. The "Restock" button → adds to currentStock, writes a stock_transaction with
   type "restock"
3. After restocking, check ALL menu_items whose recipe uses this ingredient: if every
   ingredient in that item's recipe is now sufficient (currentStock > 0), set
   available = true for that item again
```
 
## 2.6 Analytics Logic — Querying and Computing from Real Data
 
```
Implement the /analytics page reading real data from Firestore:
1. Query orders for today (createdAt >= today at 00:00)
2. Compute total revenue and order count from the query results
3. Group orders by hour (extract the hour from createdAt) to draw the bar chart
4. Group items across all orders by menuItemId, sorted by total quantity, to get the
   top 5 best-selling items
5. Query ingredients where currentStock < minThreshold to show alerts
6. Group orders by paymentMethod to draw the payment-ratio pie chart
 
Use either a Server Component or a Client Component with useEffect - explain to me
which choice fits better in this case (whether the data needs to be realtime or not).
```
 
## 2.7 Real Authentication
 
```
Implement Firebase Auth login at /login:
1. Use signInWithEmailAndPassword from Firebase Auth
2. After logging in, read the user document in the users collection to get the role
3. Store the user info (uid, role) in Context or global state, used to:
   - Navigation: role "staff" sees the full menu except /analytics,
     role "owner" sees the entire menu
   - Display the user's name in the header
4. Protect routes: if not logged in, redirect to /login when accessing any other page
5. Create 2 sample users in the Firebase Console (Authentication tab) for testing:
   - owner@cafe.com (role: owner)
   - staff@cafe.com (role: staff)
```
 
## 2.8 Phase 2 Testing Checklist (per Levels 1, 2, 3 in the reference material)
 
```
LEVEL 1 - BASIC FUNCTIONALITY:
[ ] Logging in with the correct account → can access /pos
[ ] Creating an order → a new document appears in Firestore (check the Console)
[ ] Creating an order → the related ingredient's currentStock decreases by the
    correct amount
[ ] An ingredient runs out (currentStock = 0) → the related item automatically
    disappears from /pos
[ ] Restocking → currentStock increases correctly, the item reappears automatically
    if conditions are met
[ ] Analytics displays figures that match the real data in Firestore
 
LEVEL 2 - INPUT TESTING:
[ ] Creating 2 orders nearly simultaneously (open 2 tabs) → stock is deducted
    correctly for both, with no errors from a race condition (this is the reason
    for using a transaction)
[ ] Restocking with a quantity of 0 or a negative number → validation blocks it
[ ] Logging in with the wrong password → shows a clear error, no crash
 
LEVEL 3 - CALCULATION TESTING:
[ ] Creating an order of 3 black coffees (recipe 18g/cup) → check that coffee beans
    are deducted by exactly 54g in Firestore
[ ] The order total = the sum of (price × quantity) for each item, matching the
    displayed figure
```
 
**Phase 2 is complete when:** all 3 modules work with real data on Firestore, and the
checklist above has been fully passed. Git commit:
`git commit -m "Phase 2 complete: Firebase integration with working transaction logic"`.
 
> Note: the original "backend integration" section in the reference material you provided
> (Google Form, Facebook/Instagram comments) doesn't apply to this project since it's
> unrelated to a coffee shop — this project's real backend is Firebase, fully implemented in
> sections 2.1-2.7 above.
 
---
 
# PHASE 3 — Security Check & Optimization
 
## 3.1 Firestore Security Rules
 
```
Write Firestore Security Rules for the project, requiring:
1. Only logged-in users (request.auth != null) can read/write any collection
2. orders collection: can only be created (create), no editing/deleting after creation
   (preserving the integrity of the transaction history)
3. ingredients, menu_items collections: users with role "staff" can only read,
   only role "owner" can edit/delete (managing the menu, updating recipes)
4. stock_transactions collection: can only be created, no editing/deleting
   (preserving the audit history)
5. users collection: a user can only read their own document
 
Explain how to check the role inside Security Rules (need to read the users document
within the rules using get()).
```
 
## 3.2 Basic Security Review
 
```
Review the entire codebase and check:
1. No API key or secret is hardcoded anywhere in the code (must live in .env.local,
   and .env.local must be in .gitignore)
2. The .env.local file is NOT committed to GitHub - check .gitignore
3. Client-side input validation for every form (restock quantity can't be negative,
   email must be properly formatted) AND remind me that client-side validation alone
   isn't enough — Firestore Security Rules are the real layer of protection
4. No sensitive information is exposed via console.log in production code
```
 
## 3.3 Optimization
 
```
Optimize the app's performance before deploying:
1. Check that pages using onSnapshot (realtime) unsubscribe correctly when the
   component unmounts, to avoid memory leaks
2. Add a loading state (skeleton or spinner) for every page while waiting for the
   first Firestore data load
3. Add an error boundary or try-catch around every Firestore call, showing a
   friendly error message if the network connection is lost
4. Check the Lighthouse score (Chrome DevTools) for the /pos page, optimize if the
   Performance score is below 80
5. Make sure images (if any) are properly sized/optimized, using next/image
```
 
## 3.4 Phase 3 Testing Checklist (per Levels 6, 7 in the reference material)
 
```
LEVEL 6 - BROWSER TESTING:
[ ] Chrome: fully functional
[ ] Safari (if a Mac/iPhone is available for testing): fully functional
[ ] Firefox: fully functional
 
LEVEL 7 - PERFORMANCE TESTING:
[ ] The /pos page loads in under 3 seconds
[ ] Creating an order responds in the UI in under 1 second
[ ] The Analytics charts render in under 2 seconds
 
SECURITY:
[ ] Logging out and then trying to access the /pos URL directly → redirected to /login
[ ] Logging in as role "staff" and trying to access /analytics → blocked or the menu
    item isn't shown
[ ] Check the Firestore Console → Rules tab, test the rules using the Rules Playground
```
 
## 3.5 Deploy to Vercel
 
```
1. Push the code to a GitHub repository
2. Go to vercel.com → New Project → Import from the GitHub repo
3. Add Environment Variables (all the NEXT_PUBLIC_FIREBASE_* ones) in
   Vercel Project Settings → Environment Variables
4. Deploy
5. Re-test the entire Phase 1-3 checklist against the real Vercel URL (not just
   localhost)
```
 
**Phase 3 is complete when:** the app is deployed live on Vercel, Security Rules work
correctly, and the entire checklist has been passed. Final commit:
`git commit -m "Phase 3 complete: security rules, optimization, deployed to Vercel"`.
 
---
 
## Summary: Mapping to the Development Process Documentation (Assignment Sections 3.6 + 4)
 
When writing the report, use this exact 3-phase structure as the "Iteration history":
 
| Report Section | Source |
|---|---|
| Initial prompt | The Phase 1.1 prompt (setting up the theme) |
| Iteration history (3-5 examples) | Pick one prompt per phase: 1.3 (POS UI), 2.4 (transaction logic - the most important one), 3.1 (security rules) |
| Challenges encountered | The race-condition issue when deducting stock (sections 2.4, 2.8), and how it was solved using a Firestore transaction |
| Reflection on vibe coding | Based on continuity.md updated across sessions — showing a genuine iterative process, not something reconstructed afterward |
