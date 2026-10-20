# BizCRM — Personal Business CRM PWA

A complete, production-quality, mobile-first Personal Business CRM Progressive Web App built for solo operators managing clients, prospects, projects, services, daily tasks, follow-ups, payments, and business performance.

Built strictly with a **local-first architecture**: all business records, client contacts, quotations, and financial transactions are stored locally on your device in **IndexedDB** using **Dexie.js**. No cloud databases, server accounts, third-party sync, or paid APIs required.

---

## 🌟 Key Features

1. **Dashboard Overview**
   - Live real-time statistics calculated directly from IndexedDB without hardcoding or mock counters.
   - Active client roster count, open pipeline deals, follow-ups due today, overdue items, today's pending tasks, project deadlines, and net revenue.
   - Direct click-through navigation to filtered lists from every metric card.

2. **Client Management**
   - Full CRUD: Create, view, edit, archive, and restore clients.
   - Multi-service association per client (retaining historical associations if services are deactivated).
   - Instant search by client name, business name, phone, or email.
   - Direct Call and WhatsApp action triggers with outcome confirmation prompt.
   - Client-specific deliverable checklist, project timeline, and payment ledger.
   - Duplicate record warnings without blocking legitimate shared numbers.

3. **Leads & Sales Pipeline**
   - 9-stage pipeline: *Fresh Lead, Contacted, Follow-up 1, Follow-up 2+, Demo Sent, Negotiation, Won, Lost, On Hold*.
   - Lead quotation amount, estimated deal value, and demo tracking (*not sent, sent, viewed, feedback received*).
   - Atomic **Convert to Client** workflow: converts won leads into active clients, automatically migrates and preserves all chronological interaction history, and initializes the first project with milestone checklist tasks.

4. **Fast Interaction Logging**
   - Single-tap logging for Phone Calls, WhatsApp messages, In-person Meetings, Emails, and Demos.
   - Captures outcome, summary, duration, detailed notes, and scheduled next follow-up.
   - Updates `lastContactAt` timestamp and automatically synchronizes reminder alarms.

5. **Tasks & Milestone Deliverables**
   - Task priorities (*urgent, high, medium, low*), categories, due dates, and client/project linkages.
   - Recurring tasks (*daily, weekly, monthly*): completing a recurring task generates the next occurrence without overwriting the completed record, preserving historical velocity.
   - Project checklist starter templates for *Content Production, Social Media Management, Meta Ads, AI Ad Production, Website Development, Web App Development, and SEO*.

6. **Financial Ledger & Balances**
   - Tracks agreed project amounts, partial installment payments, refunds, and adjustments.
   - Explicit transaction statuses: *Recorded / Cleared, Pending Clearance, and Voided*.
   - Excludes voided transactions from net calculations.
   - Ledger calculations: Contract Value, Net Collected Funds, and Outstanding Receivables.

7. **In-App Reminders & Browser Notifications**
   - In-app reminder engine reconciles upcoming deadlines and follow-ups on app launch and window visibility changes.
   - Actions to Complete, Snooze (30m, 2h, 1d), or Dismiss alerts.
   - Integration with Browser Notification API and Service Worker for local alerts.

8. **JSON Backup & Safe Restore**
   - Versioned JSON export containing all database tables and timestamps.
   - Schema validation, preview of imported record counts, and broken relationship detection.
   - Transactional safety: choose between **Merge** (upsert records) and **Replace** (clean slate restore) with atomic rollback if validation fails.
   - Database integrity diagnostic tool.

---

## 🛠️ Technology Stack

- **Frontend Core**: React 19 + JavaScript (No TypeScript)
- **Bundler & Tooling**: Vite 8 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS (custom restrained business palette, dark/light/system theme, safe-area mobile utilities)
- **Routing**: React Router v7
- **Database**: Dexie.js (IndexedDB wrapper with versioned schema and migrations)
- **State & Live Queries**: `dexie-react-hooks` (`useLiveQuery`)
- **PWA & Offline**: `vite-plugin-pwa` with Workbox service worker caching
- **Icons**: Lucide React
- **Date Management**: `date-fns`
- **Unit & Integration Testing**: Vitest, `@testing-library/react`, `fake-indexeddb`
- **End-to-End Testing**: Playwright (Mobile & Desktop Viewports)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended, tested on Node v22)
- npm (v9 or higher)

### 1. Installation

Clone or open the project folder in your terminal and install dependencies:

```bash
npm install
```

### 2. Run Locally in Development

Start the Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Preview

To create an optimized production bundle with offline PWA service worker precaching:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 🧪 Testing

### Unit & Integration Tests (Vitest)

The project includes 21 comprehensive unit and integration tests covering IndexedDB CRUD, recurring task scheduling, financial ledgers, backup validation, integrity checks, and notification permissions:

```bash
npm test
```

### End-to-End Tests (Playwright)

Run Playwright critical workflow tests across both mobile and desktop viewports:

```bash
npm run test:e2e
```

The E2E test validates:
1. Creating a prospect lead with multiple service selections
2. Logging a call interaction with an upcoming follow-up date
3. Converting the lead into an active client
4. Linking a new project with starter checklist tasks
5. Completing deliverable tasks
6. Recording a partial invoice payment and verifying balance calculation
7. Exporting database state
8. Reloading the browser and confirming data persistence in IndexedDB

---

## 📱 PWA Installation & Offline Usage

- **Android (Chrome / Edge)**: Tap the "Install" button in the top banner or select **Install App** from the browser menu.
- **iOS (Safari)**: Tap the **Share** button in Safari, scroll down, and tap **"Add to Home Screen"**.
- **Offline Behavior**: Once installed or visited, the Workbox service worker precaches all application assets (HTML, CSS, JS, icons). You can launch and use the app completely offline—all client queries and updates persist immediately to your device's IndexedDB.

---

## 💾 Backup and Restore Guidelines

All your business data is saved exclusively inside your local browser's IndexedDB storage.

> [!WARNING]
> If your browser history/storage is cleared, or if your device is reset, local data may be lost. **Export a JSON backup regularly (e.g. weekly).**

### How to Export:
1. Navigate to **Settings** (`/settings`).
2. Click **Export JSON Backup**. A file named `bizcrm-backup-[timestamp].json` will be saved to your device.

### How to Restore:
1. Navigate to **Settings** (`/settings`).
2. Click **Restore from JSON File** and select your backup file.
3. Review the preview summary of records.
4. Select your restore strategy:
   - **Merge**: Adds new records and updates existing matching records.
   - **Replace**: Clears the current local database and restores exactly from the backup file.
5. Click **Confirm Restore**.

---

## 🔔 Transparency on Notification Capabilities

- **In-App Reminders**: 100% reliable whenever the app is opened or foregrounded. Overdue indicators and badges alert you to any overdue follow-ups or deliverables.
- **Local Browser Notifications**: Operates while the app is open or active in a browser tab.
- **Closed-App Notifications Limitation**: Standard browsers (especially iOS Safari and Android Chrome) suspend service workers when apps are closed, meaning scheduled local timers cannot guarantee delivery when the app is completely shut down. True closed-app push notifications require an external Web Push server and push subscription, which is intentionally excluded to keep this version 100% private, free, and local-only.

---

## 🔒 Security & Privacy Notice

- **No Cloud Exposure**: Your customer data, phone numbers, deal values, and notes never leave your device.
- **Device Security**: Anyone with physical access to your unlocked phone or computer profile could view local records. Always protect your device with a PIN, password, or biometrics.
- **Sensitive Data**: Avoid storing sensitive data such as payment card details, passwords, or banking PINs in note fields.

---

## 📄 License

MIT License. Designed for personal and solo business operations.
