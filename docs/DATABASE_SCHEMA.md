# Database Schema & Model Specification

## 1. Database Connection
- **Engine**: MongoDB Atlas
- **Database**: `CRMJugarr`
- **Tenancy**: Multi-tenant architecture keyed on `tenantId` (default `org_default` for Jugarr Agency).

---

## 2. Collections & Schemas

### 2.1 `users`
Represents both Founder and Partners.
```typescript
interface User {
  _id: ObjectId;
  id: string; // e.g. "usr_12345"
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'founder' | 'business_partner' | 'sales_partner' | 'client_manager' | 'custom';
  customRoleId?: string;
  permissions?: Record<string, string[]>; // Optional user-specific permission overrides
  status: 'active' | 'inactive';
  phone?: string;
  avatarUrl?: string;
  monthlyTarget?: number;
  commissionPercentage?: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 `roles`
Dynamic Role and Permissions Engine collection.
```typescript
interface Role {
  _id: ObjectId;
  id: string; // e.g. "role_sales_partner"
  tenantId: string;
  name: string;
  description: string;
  isSystem: boolean; // System roles cannot be deleted
  permissions: {
    dashboard: string[];  // ['view', 'view_all']
    leads: string[];      // ['view', 'create', 'edit', 'delete', 'assign', 'convert']
    clients: string[];    // ['view', 'create', 'edit', 'delete', 'assign']
    finance: string[];    // ['view_assigned', 'view_all', 'manage']
    payments: string[];   // ['view', 'create', 'refund']
    partners: string[];   // ['view', 'manage']
    knowledge: string[];  // ['view', 'manage']
    activities: string[]; // ['view']
  };
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 `clients` (Preserved & Extended)
Preserves all existing Dinesh Gurjar & retainer client fields.
```typescript
interface Client {
  _id: ObjectId;
  id: string;
  tenantId: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  normalizedPhone: string;
  whatsapp?: string;
  clientType: 'content_management' | 'web_development';
  status: 'active' | 'completed' | 'archived';
  assignedPartnerId?: string; // Multi-user partner ownership

  // Content Plan & 1-Month Retainer
  monthlyPlanAmount: number;
  tokenPaid: number;
  additionalPaid: number;
  totalPaid: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  startDate: string;
  completionDate: string;
  billingAnchorDay: number;
  subscriptionTitle: string;
  category: string;
  emailHeading: string;
  emailSubject: string;
  packageDescription: string;
  periods: ClientPeriod[];
  currentPeriod: ClientPeriod;

  // Web Dev Specific
  projectName?: string;
  deliveryDate?: string;
  documents?: { id: string; title: string; url: string; type: string }[];
  deliverables?: { id: string; title: string; isCompleted: boolean }[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 `leads`
```typescript
interface Lead {
  _id: ObjectId;
  id: string;
  tenantId: string;
  name: string;
  businessName?: string;
  email?: string;
  phone: string;
  normalizedPhone?: string;
  stage: 'new' | 'contacted' | 'interested' | 'follow_up' | 'negotiation' | 'converted' | 'lost';
  assignedPartnerId: string; // Partner who owns this lead
  source?: string;
  estimatedValue?: number;
  nextFollowUpDate?: string;
  notes?: string;
  lostReason?: string;
  convertedClientId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.5 `payments` (Preserved & Extended)
```typescript
interface Payment {
  _id: ObjectId;
  id: string;
  tenantId: string;
  clientId: string;
  projectId?: string;
  assignedPartnerId?: string;
  amount: number;
  type: 'token' | 'installment' | 'full' | 'advance';
  status: 'completed' | 'pending' | 'refunded' | 'voided';
  paymentMethod: 'bank_transfer' | 'upi' | 'cash' | 'stripe';
  paidAt: string;
  notes?: string;
  createdAt: string;
}
```

### 2.6 `knowledge_base`
```typescript
interface KnowledgeArticle {
  _id: ObjectId;
  id: string;
  tenantId: string;
  title: string;
  category: 'pitch_deck' | 'service_catalog' | 'pricing' | 'objection_handling' | 'sales_script' | 'announcement';
  content: string;
  tags: string[];
  attachments?: { title: string; url: string }[];
  authorId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.7 `activities` (Audit Feed)
```typescript
interface Activity {
  _id: ObjectId;
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'create' | 'update' | 'delete' | 'convert' | 'payment_received' | 'login';
  entityType: 'client' | 'lead' | 'payment' | 'user' | 'role' | 'knowledge';
  entityId: string;
  entityName: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
```
