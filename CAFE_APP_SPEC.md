# Coffee Shop Management App Spec
 
> This document serves as the initial prompt when vibe coding with Claude Code in VS Code.
> Copy the entire content and paste it into Claude Code, then refine through follow-up
> shop management system covering POS, Inventory, Staff Scheduling, Loyalty/CRM, and
> Analytics. The MVP scope only builds POS + Inventory + Analytics to stay feasible within 1 week; the other two modules are deferred to the report's roadmap section.
 
## 1. Context & Pain Points Addressed
 
The coffee shop has a multi-floor layout and currently operates with customers ordering at
the counter while staff use a standalone POS machine (no data integration, no analytics).
The app shifts from an "ordering tool" to an "operations management system" addressing the
following pain points:
 
1. Staff record orders on a standalone POS with no link to inventory → the shop has no
   accurate visibility into remaining ingredient stock
2. Ingredients run out mid-shift without timely detection → customers order items that are
   already out of stock, creating a poor experience
3. The owner has no data to know which items sell well or which hours are busiest → decisions
   are made based on intuition rather than data
4. No visibility into performance by floor/time slot → staffing cannot be optimized, and it's
   unclear which floor needs additional staff
5. No centralized transaction history → revenue is hard to control, and end-of-day
   reconciliation is error-prone

## 2. MVP Scope (1 Week) and Roadmap
 
### Actually built within 1 week (3 core modules, tightly linked)
- **POS**: create orders, select items, calculate totals, record payment
- **Inventory**: manage ingredients, automatically deduct stock based on item recipes when
  an order is placed, alert when stock is running low
- **Analytics Dashboard**: revenue charts by hour/day, best-selling items, low stock items

### Placed in the report's "Future Development Roadmap" (not built, direction only)
- **Staff Scheduling**: shift planning, shift swaps, time tracking
- **Loyalty/CRM**: customer points, purchase history by phone number

## 3. Tech Stack
 
- Frontend: Next.js (App Router) + React + TypeScript
- Styling: Tailwind CSS
- Database & Realtime: Firebase Firestore (realtime listeners for the dashboard)
- Auth: Firebase Auth email/password (staff log in to use the POS, the owner logs in to view
  Analytics - can share a single Auth system with role-based permissions via `role: "staff" |
  "owner"`)
- Deploy: Vercel
- Charts: `recharts` (npm) for the Analytics Dashboard

## 4. Firestore Structure (Database Schema)
 
### Collection: `users` (staff/owner)
```
users/{uid}
{
  name: string,
  role: "staff" | "owner",
  email: string,
  createdAt: timestamp
}
```
 
### Collection: `menu_items`
```
menu_items/{itemId}
{
  name: string,
  price: number,             // VND
  category: string,          // "coffee" | "tea" | "smoothie" | "snack"
  recipe: [                  // recipe - used for automatic stock deduction
    { ingredientId: string, quantityUsed: number }   // e.g. coffee uses 18g of coffee beans
  ],
  available: boolean,        // automatically set to false if a recipe ingredient runs out
  createdAt: timestamp
}
```
 
### Collection: `ingredients` (ingredients - the core of the Inventory module)
```
ingredients/{ingredientId}
{
  name: string,              // "Coffee beans", "Fresh milk", "Sugar", "Tapioca pearls"
  unit: string,              // "g" | "ml" | "kg" | "l" | "piece"
  currentStock: number,      // quantity currently on hand
  minThreshold: number,      // low-stock alert threshold (e.g. 500g)
  lastRestockedAt: timestamp,
  updatedAt: timestamp
}
```
 
### Collection: `orders`
```
orders/{orderId}
{
  orderCode: string,         // "ORD-0001"
  items: [
    {
      menuItemId: string,
      name: string,          // item name snapshot
      quantity: number,
      unitPrice: number,
      subtotal: number
    }
  ],
  totalAmount: number,
  paymentMethod: "cash" | "bank_transfer",   // simple demo, no real payment gateway needed
  staffId: string,           // who created the order
  createdAt: timestamp
}
```
 
### Collection: `stock_transactions` (stock movement history - for Analytics + audit)
```
stock_transactions/{transactionId}
{
  ingredientId: string,
  type: "deduction" | "restock",      // deducted from a sale / added via restock
  quantity: number,                   // amount changed
  relatedOrderId: string | null,      // null if it's a restock
  createdAt: timestamp
}
```
 
## 5. Business Logic Flow
 
### POS → Inventory Flow (the most important one, the "heart" of the MVP)
1. Staff logs in (`role: staff`), goes to the `/pos` page
2. Selects items from the menu (only items with `available: true` are shown)
3. Adds items to the order, confirms order creation (`orders` collection)
4. Immediately after the order is created, the system automatically:
   - For each item in the order, reads the `recipe` of the corresponding `menu_items`
   - Deducts `currentStock` of each `ingredient` by `quantityUsed × quantity` sold
   - Writes a record into `stock_transactions` with `type: "deduction"`
   - If `currentStock` after deduction is below `minThreshold` → mark this ingredient as
     "low stock" (shown as an alert badge on the Inventory page)
   - If any ingredient in the `recipe` reaches `currentStock` = 0 → automatically set
     `menu_items.available = false` for that item (the item disappears from the POS until
     restocked)
5. Staff enters the payment method (`cash` or `bank_transfer` - demo only, no real
   transaction processing)

### Restock Flow
1. Staff/owner goes to the `/inventory` page, selects an ingredient, enters the quantity
   being added
2. Adds to `currentStock`, writes a `stock_transactions` record with `type: "restock"`
3. If the ingredient is sufficiently restocked, automatically set `available: true` again for
   related items (check whether that item's entire recipe now has enough stock)

### Analytics Dashboard Flow
1. Owner logs in (`role: owner`), goes to the `/analytics` page
2. Displays aggregated metrics computed directly from `orders` and `stock_transactions`:
   - Total revenue today / over a custom date range
   - Revenue chart by hour of day (group `orders.createdAt` by hour)
   - Top 5 best-selling items (group `orders.items` by `menuItemId`, sorted by total
     `quantity`)
   - List of low-stock ingredients (`ingredients` where `currentStock < minThreshold`)
   - Order count by payment method (cash vs. bank_transfer ratio)

## 6. Page Structure (Pages)
 
| Route | Role | Content |
|---|---|---|
| `/login` | Everyone | Firebase Auth login |
| `/pos` | Staff | Ordering interface: select items, cart, confirm payment |
| `/inventory` | Staff + Owner | List of ingredients, stock levels, restock button, low-stock alert badge |
| `/analytics` | Owner | Dashboard: summary KPI cards + revenue chart + top-selling items |
| `/menu` (management) | Owner | CRUD for menu items, assign recipe to each item |
 
## 7. UI/UX Requirements
 
- Tablet/desktop-first interface (POS is used at the counter, no need for mobile-first as in
  the earlier direction)
- `/pos` page: 2-column layout — left side is a grid of items by category, right side is the
  current cart
- `/inventory` page: table format, any row below `minThreshold` is highlighted with a warning
  color (yellow/red)
- `/analytics` page: use `recharts` for a bar chart (revenue by hour) and a pie chart
  (payment method ratio)
- Warm brown/orange theme (keeping the coffee shop spirit), minimal and clear so staff can
  use it quickly during peak hours

## 8. Important Notes for Building
 
- This is an academic demo app and does NOT need a real payment gateway integration. The
  `paymentMethod` field is just a recorded choice, not an actual processed transaction.
- The hardest technical focus is the **POS → Inventory transaction logic** (section 5) -
  build and test this part first, since it is the core differentiator compared to a regular
  ordering app.
- Use a Firestore transaction (`runTransaction`) when deducting stock to avoid race
  conditions when multiple orders are created nearly simultaneously (important for a
  convincing demo of data correctness)
- Pre-create sample seed data for `menu_items` and `ingredients` before building the UI, so
  there's test data available right away
- Suggested 1-week build order:
  1. Days 1-2: Set up Firebase, schema, `/login` page, seed data, `/menu` page (basic CRUD)
  2. Days 3-4: `/pos` page + automatic stock deduction logic (the hardest part, allocate the
     most time here)
  3. Day 5: `/inventory` page + restock + alerts
  4. Day 6: `/analytics` page + charts
  5. Day 7: Test the entire flow, fix bugs, deploy to Vercel, take screenshots/record a demo
     video for the report

## 9. "Future Development Roadmap" Section (for the report, not built)
 
Present this in Part 5 of the report (Recommendations & Reflection) to demonstrate a complete
product vision in the spirit of BrewOS:
 
- **Staff Scheduling**: weekly shift planning, handling shift swap requests, time tracking via
  the app - addressing the staff-coordination-by-floor problem studied in Part 1
- **Loyalty/CRM**: collecting customer phone numbers at the POS, automatic point accumulation,
  purchase history for personalized offers
- **Multi-branch support**: if the shop expands to more locations, extend the schema with a
  `branchId` field across all collections to compare performance between branches
- Link to the Rainer (2021) framework: the current MVP achieves the **More integration**
  strategy (POS + Inventory + Analytics in one system); the future roadmap moves toward
  **More individualization** (Loyalty/CRM) and **More automation** (auto-scheduling based on
  predicted customer volume)

## 10. Suggested First Prompt for Claude Code
 
```
I want to build a coffee shop management system (inspired by BrewOS) with 3 modules:
POS, Inventory, and an Analytics Dashboard - according to the spec in this
CAFE_APP_SPEC.md file. The most important focus is the logic: when an order is created
at the POS, the system must automatically deduct ingredients from Inventory based on
the item's recipe, and alert when ingredients are running low.
 
Please start by:
1. Setting up the Next.js App Router project structure + Firebase config
2. Creating a seed script to add sample data for menu_items and ingredients
3. Building the /pos page with order creation logic + automatic stock deduction using
   a Firestore transaction
Once this part is done, I'll ask you to continue with the remaining parts (Inventory
page, Analytics).
```
