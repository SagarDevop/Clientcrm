import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bizcrm.db');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL Mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Tenants / Organizations table
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subdomain TEXT UNIQUE,
      plan TEXT DEFAULT 'pro',
      status TEXT DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Users Table (Multi-tenant)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT DEFAULT 'owner',
      avatarUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Clients Table
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      normalizedPhone TEXT,
      businessName TEXT,
      email TEXT,
      status TEXT DEFAULT 'active',
      category TEXT DEFAULT 'both',
      clientType TEXT DEFAULT 'web_development',
      monthlyPlanAmount REAL DEFAULT 0,
      tokenPaid REAL DEFAULT 0,
      remainingAmount REAL DEFAULT 0,
      totalProjectCost REAL DEFAULT 0,
      startDate TEXT,
      completionDate TEXT,
      packageDescription TEXT,
      documents TEXT,
      quotationNumber TEXT,
      paymentTerms TEXT,
      serviceIds TEXT,
      onboardingEmailStatus TEXT,
      completionEmailStatus TEXT,
      completionEmailDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      archivedAt TEXT,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Leads Table
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      normalizedPhone TEXT,
      businessName TEXT,
      email TEXT,
      stage TEXT DEFAULT 'fresh',
      serviceIds TEXT,
      estimatedValue REAL DEFAULT 0,
      nextFollowUpAt TEXT,
      lastContactAt TEXT,
      wonClientId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      archivedAt TEXT,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Interactions Table
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      leadId TEXT,
      clientId TEXT,
      type TEXT NOT NULL,
      occurredAt TEXT NOT NULL,
      nextFollowUpAt TEXT,
      summary TEXT,
      notes TEXT,
      durationMinutes INTEGER,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Projects Table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      name TEXT,
      description TEXT,
      status TEXT DEFAULT 'in_progress',
      serviceIds TEXT,
      startDate TEXT,
      deadline TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      completedAt TEXT,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Tasks Table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      clientId TEXT,
      projectId TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      dueAt TEXT,
      completedAt TEXT,
      recurrence TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      clientId TEXT,
      projectId TEXT,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'credit',
      method TEXT DEFAULT 'upi',
      status TEXT DEFAULT 'cleared',
      paidAt TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Invoices Table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      invoiceNumber TEXT NOT NULL,
      clientId TEXT NOT NULL,
      projectId TEXT,
      amount REAL NOT NULL,
      issueDate TEXT NOT NULL,
      dueDate TEXT,
      status TEXT DEFAULT 'sent',
      items TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Settings Table
    CREATE TABLE IF NOT EXISTS settings (
      tenantId TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (tenantId, key),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Expenses Table (Agency Growth & Finance Tracking)
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'software',
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      vendor TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Email Jobs Table (Audit & Serverless Scheduler)
    CREATE TABLE IF NOT EXISTS email_jobs (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      recipientEmail TEXT NOT NULL,
      templateType TEXT NOT NULL,
      entityType TEXT,
      entityId TEXT,
      status TEXT DEFAULT 'pending',
      idempotencyKey TEXT UNIQUE,
      error TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    );
  `);

  console.log('✅ SQLite SaaS multi-tenant database initialized successfully at:', dbPath);

  // Auto-seed default Super Admin if no users exist
  const userCount = db.prepare('SELECT count(*) as cnt FROM users').get();
  if (!userCount || userCount.cnt === 0) {
    const now = new Date().toISOString();
    // Default password hash for 'admin123'
    const defaultHash = '$2a$10$wE0v2m4q.0m8V5W6Gqf9xOvyu5eGz2/z.x4uYI6w1K4z5y1rY8e1a';
    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, plan, status, createdAt, updatedAt)
      VALUES ('org_default', 'Jugarr Agency', 'pro', 'active', ?, ?)
    `).run(now, now);

    db.prepare(`
      INSERT OR IGNORE INTO users (id, tenantId, name, email, passwordHash, role, createdAt, updatedAt)
      VALUES ('usr_admin', 'org_default', 'Admin User', 'warshasingh21@gmail.com', ?, 'owner', ?, ?)
    `).run(defaultHash, now, now);
  }
}

export default db;
