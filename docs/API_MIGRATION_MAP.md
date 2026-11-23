# API Migration Map (/api/v1/*)

| Resource | HTTP Method | Endpoint | Description | Permission Required |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Email & password login, returns JWT & sets secure cookie | Public |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch active session, user profile, role & permissions | Authenticated |
| **Auth** | `POST` | `/api/v1/auth/logout` | Clears cookie and session | Authenticated |
| **Users / Partners** | `GET` | `/api/v1/users` | List all team partners and permissions | `partners:view` |
| **Users / Partners** | `POST` | `/api/v1/users` | Create new partner account with assigned role | `partners:create` |
| **Users / Partners** | `PUT` | `/api/v1/users/:id` | Update partner role, permissions, or status | `partners:edit` |
| **Roles** | `GET` | `/api/v1/roles` | List available system and custom roles | `roles:view` |
| **Roles** | `POST` | `/api/v1/roles` | Create custom role with permission action matrix | `roles:create` |
| **Clients** | `GET` | `/api/v1/clients` | List clients (filtered by assignment if partner) | `clients:view` |
| **Clients** | `POST` | `/api/v1/clients` | Create client with 1-month plan or web dev specs | `clients:create` |
| **Clients** | `PUT` | `/api/v1/clients/:id` | Update client details / deliverables | `clients:edit` |
| **Clients** | `DELETE` | `/api/v1/clients/:id` | Archive or delete client | `clients:delete` |
| **Leads** | `GET` | `/api/v1/leads` | Lead pipeline | `leads:view` |
| **Leads** | `POST` | `/api/v1/leads` | Add new lead | `leads:create` |
| **Leads** | `POST` | `/api/v1/leads/:id/convert` | Convert lead into client with starter plan | `leads:edit` |
| **Payments** | `GET` | `/api/v1/payments` | Payments list (filtered by permission) | `payments:view` |
| **Payments** | `POST` | `/api/v1/payments` | Record new installment / token payment | `payments:create` |
| **Expenses** | `GET` | `/api/v1/expenses` | Company expense records | `expenses:view` |
| **Expenses** | `POST` | `/api/v1/expenses` | Add new expense | `expenses:create` |
| **Knowledge** | `GET` | `/api/v1/knowledge` | Access sales scripts, objection docs, packages | `knowledge:view` |
| **Knowledge** | `POST` | `/api/v1/knowledge` | Publish new sales / company resource | `knowledge:manage` |
| **Activity** | `GET` | `/api/v1/activities` | Audit trail stream | `activities:view` |
| **Notifications** | `GET` | `/api/v1/notifications` | User's notification inbox | Authenticated |
