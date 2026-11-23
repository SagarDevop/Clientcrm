# Existing System Audit & Architecture Review

## 1. System Overview
The application is a comprehensive Business CRM built for agency and client management (including content management, retainers, and web development project workflows).

### Current Tech Stack:
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion, Dexie.js (IndexedDB local cache), Dexie React Hooks.
- **Backend & Cloud Database**:
  - Cloud Database: **MongoDB Atlas** (`CRMJugarr` database).
  - Vercel Serverless Functions (`api/auth.js`, `api/data.js`, `api/send-email.js`, `api/_db.js`).
  - Standalone local Node server in `server/` (SQLite + Express initial prototype).
- **Authentication**: JWT token with Bearer authentication and localStorage / cookie session.
- **Sync Engine**: `src/db/saasSync.js` provides bi-directional real-time cloud synchronization between Dexie (local cache for offline/instant speed) and MongoDB.

---

## 2. Existing Frontend Architecture
- **Router**: `src/app/router.jsx` (React Router DOM v6).
- **Layout**: `AppLayout.jsx` with persistent responsive Sidebar, Header (quick add, search Ctrl+K), and mobile BottomNav.
- **Core Modules**:
  1. `dashboard/`: KPI Cards, Monthly Revenue, MRR, Profit Center, interactive area/bar charts, and filterable timeframes.
  2. `clients/`: Content Management & Web Development clients, 1-month service plans, billing anchor days, token payments, period renewals, deliverables tracking, document attachments.
  3. `leads/`: Lead capture, stage management (new, contacted, interested, follow_up, converted, lost), notes, conversion to active clients.
  4. `finance/`: Inflows, Expenses, Net Profit calculations, recurring monthly breakdown, expense logging.
  5. `payments/`: Invoices, receipts, tokens, remaining balances, installments, payment methods.
  6. `projects/`: Client milestones, deliverables, delivery dates, web development quotations.
  7. `content/`: Reel/Post delivery tracker, scheduling, review statuses.
  8. `tasks/`: Task assignments, priorities, due dates, linked client/project relations.
  9. `reminders/`: Follow-up reminders, snoozing, notifications.
  10. `settings/`: Business branding, services configuration, theme, security lock PIN.

---

## 3. Existing Database Schema (MongoDB Atlas `CRMJugarr`)
1. **`users`**: `id`, `tenantId`, `name`, `email`, `passwordHash`, `role` (owner/admin/partner), `createdAt`.
2. **`tenants`**: `id`, `name`, `plan`, `settings`, `createdAt`.
3. **`clients`**: `id`, `tenantId`, `name`, `businessName`, `email`, `phone`, `normalizedPhone`, `clientType`, `monthlyPlanAmount`, `tokenPaid`, `totalPaid`, `remainingAmount`, `paymentStatus`, `startDate`, `completionDate`, `billingAnchorDay`, `subscriptionTitle`, `packageDescription`, `periods`, `currentPeriod`, `status`, `createdAt`, `updatedAt`.
4. **`payments`**: `id`, `tenantId`, `clientId`, `projectId`, `amount`, `type`, `status`, `paymentMethod`, `paidAt`, `notes`, `createdAt`.
5. **`expenses`**: `id`, `tenantId`, `category`, `vendor`, `amount`, `date`, `notes`, `createdAt`.
6. **`projects`**: `id`, `tenantId`, `clientId`, `projectName`, `status`, `budget`, `advancePaid`, `deliveryDate`, `deliverables`, `documents`, `createdAt`.
7. **`leads`**: `id`, `tenantId`, `name`, `phone`, `businessName`, `email`, `stage`, `notes`, `assignedTo`, `createdAt`.
8. **`email_jobs`**: `id`, `tenantId`, `recipientEmail`, `templateType`, `status`, `createdAt`.

---

## 4. Key Business Logic to Preserve (Non-Negotiable)
- **1-Month Rolling Period Calculations**: Billing anchor day calculation (`getNextBillingDateISO`), automatic period incrementing, and period history preservation.
- **Client Financial Formulae**: `remainingAmount = monthlyPlanAmount - tokenPaid`, cumulative revenue aggregation.
- **Onboarding Automation**: Client onboarding email triggering via Resend API.
- **Zero Data Loss**: Existing records (e.g. `Mr. Dinesh Gurjar` / `Shreedev Paint Service` and associated payments) must remain fully intact.
