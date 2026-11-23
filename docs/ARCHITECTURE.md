# Multi-User Partner CRM Architecture & Migration Plan

## 1. Monolithic Modular Architecture
```
Cleinthandleapp/
├── apps/
│   ├── backend/               # Dedicated Node.js + Express + Socket.IO Server
│   │   ├── src/
│   │   │   ├── config/        # Environment, Database & Socket configuration
│   │   │   ├── constants/     # Role definitions, permission maps, HTTP codes
│   │   │   ├── controllers/   # Request/response handlers
│   │   │   ├── events/        # Socket.IO emitter events & outbox
│   │   │   ├── middleware/    # Auth, dynamic RBAC, rate-limiting, error handler
│   │   │   ├── models/        # Mongoose / Mongo Schemas with tenant isolation
│   │   │   ├── repositories/  # Database access layer
│   │   │   ├── routes/        # Versioned routes (/api/v1/*)
│   │   │   ├── services/      # Core business logic & financial formulas
│   │   │   ├── sockets/       # Authenticated room dispatchers
│   │   │   └── utils/         # Token generation, logging, date helpers
│   │   └── server.js          # App entrypoint (Express + HTTP Server + Socket.IO)
│   └── frontend/              # (Or root React + Vite existing application mapped cleanly)
│       └── src/
│           ├── features/
│           │   ├── partners/  # Partner management & partner dashboards
│           │   ├── knowledge/ # Company Knowledge Center
│           │   ├── activity/  # Live Activity Feed
│           │   └── ...        # Preserved Admin modules
├── docs/                      # Architectural documentation & migration maps
├── api/                       # Serverless backwards-compatible endpoints
└── vercel.json
```

## 2. Dynamic RBAC Engine Design
- **Roles**:
  - `founder` (Super Admin - unrestricted access)
  - `business_partner` (Dashboard, assigned clients, leads, commission view)
  - `sales_partner` (Lead pipeline, follow-ups, pitch materials, performance target)
  - `client_manager` (Assigned clients, deliverables, tasks, client communication)
  - `custom` (Database configurable actions)
- **Permissions Structure**:
  ```json
  {
    "leads": ["view", "create", "edit", "assign", "delete"],
    "clients": ["view", "create", "edit"],
    "revenue": ["view_assigned"],
    "expenses": [],
    "knowledge": ["view"],
    "partners": []
  }
  ```

## 3. Real-Time Engine (Socket.IO + Persistent Database Fallback)
- Socket connections authenticate via JWT handshake.
- Clients join rooms:
  - `tenant_${tenantId}` (company wide broadcasts)
  - `user_${userId}` (targeted notifications and private updates)
- Events emitted on transactional completion:
  - `client:created`, `client:updated`, `client:deleted`
  - `lead:created`, `lead:updated`, `lead:status-changed`
  - `payment:created`, `revenue:updated`
  - `activity:new`, `notification:new`
