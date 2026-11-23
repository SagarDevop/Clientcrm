# Complete Feature Inventory

| Module | Feature Name | Current Location | Collections / Models | API Endpoints | Target Architecture |
|---|---|---|---|---|---|
| **Auth** | Owner / Partner Login | `src/features/auth/` | `users`, `tenants` | `/api/v1/auth/login`, `/api/v1/auth/me` | JWT + HTTP-only Cookies |
| **Auth** | Dynamic Role & Permission Engine | New | `roles`, `permissions`, `memberships` | `/api/v1/roles`, `/api/v1/users` | Granular Action Matrix (View, Create, Edit, Delete, Assign, Approve) |
| **Dashboard** | Admin Executive Overview | `src/features/dashboard/` | `clients`, `payments`, `expenses` | `/api/v1/revenue/summary` | Real-time aggregated cards & Recharts |
| **Dashboard** | Individual Partner Dashboard | New | `leads`, `clients`, `activities` | `/api/v1/partners/dashboard` | My Leads, My Clients, Today's Follow-ups, Target vs Achieved |
| **Clients** | Content Management Client Onboarding | `src/components/forms/ClientFormModal.jsx` | `clients`, `payments` | `/api/v1/clients` | 1-month service plan, token payment, Resend email |
| **Clients** | Web Development Client & Quotations | `src/components/forms/ClientFormModal.jsx` | `clients`, `projects`, `quotations` | `/api/v1/clients`, `/api/v1/projects` | Deliverables, milestones, advance & completion dates |
| **Clients** | Period Renewal & Payment Tracking | `src/features/clients/ClientDetailPage.jsx` | `clients`, `payments` | `/api/v1/clients/:id/renew`, `/api/v1/payments` | Preserves rolling period history |
| **Leads** | Lead Pipeline & Conversions | `src/features/leads/` | `leads`, `clients` | `/api/v1/leads`, `/api/v1/leads/:id/convert` | Partner attribution & conversion timeline |
| **Finance** | Inflow, MRR, Costs & Profit Center | `src/features/finance/` | `payments`, `expenses` | `/api/v1/revenue`, `/api/v1/expenses` | Financial privacy permissions (Founder only or authorized) |
| **Finance** | Partner Commission & Attribution | New | `commissions`, `payments` | `/api/v1/revenue/commissions` | Commission calculation, Founder approval workflow |
| **Knowledge** | Company Knowledge Center | New | `knowledge_articles`, `sales_scripts` | `/api/v1/knowledge` | Pitch decks, objection handling, pricing packages |
| **Activity** | Live Real-Time Audit Feed | New | `activities`, `audit_logs` | `/api/v1/activities`, Socket.IO | Partner action stream with entity relations |
| **Real-Time** | Instant Socket Synchronization | `src/db/saasSync.js` | All | Socket.IO (`lead:*`, `client:*`, `payment:*`) | Multi-tab / Multi-user live updates |
| **Settings** | Organization Branding & Config | `src/features/settings/` | `settings`, `tenants` | `/api/v1/settings` | Company details, logo, currency, notification preferences |
