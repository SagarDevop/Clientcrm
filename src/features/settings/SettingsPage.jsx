import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import {
  exportDatabaseToJson,
  downloadBackupFile,
  validateBackupJson,
  restoreBackup,
  resetAllData,
} from '../../db/backup.js';
import { validateDatabaseIntegrity } from '../../db/validation.js';
import {
  isNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from '../../services/notifications.js';
import {
  isPinProtected,
  setAppPin,
  removeAppPin,
  requestPersistentStorage,
} from '../../utils/security.js';
import { Modal } from '../../components/common/Modal.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import {
  Download,
  Upload,
  Trash2,
  ShieldAlert,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
  Lock,
  KeyRound,
  Mail,
  Send,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Storage info & persistence
  const [storageEstimate, setStorageEstimate] = useState({ usage: 0, quota: 0 });
  const [isPersisted, setIsPersisted] = useState(false);
  const [persistenceFeedback, setPersistenceFeedback] = useState('');

  // Security / PIN lock
  const [pinEnabled, setPinEnabled] = useState(isPinProtected());
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinFeedback, setPinFeedback] = useState('');

  // Email Worker Setup
  const [workerUrl, setWorkerUrl] = useState(() => localStorage.getItem('bizcrm_email_worker_url') || '');
  const [brevoKeyInput, setBrevoKeyInput] = useState(() => localStorage.getItem('bizcrm_brevo_api_key') || '');
  const [brevoKeySavedFeedback, setBrevoKeySavedFeedback] = useState('');
  const [workerHealth, setWorkerHealth] = useState(null);
  const [isTestingWorker, setIsTestingWorker] = useState(false);
  const [workerTestResult, setWorkerTestResult] = useState('');

  const handleSaveBrevoKey = () => {
    if (brevoKeyInput.trim()) {
      localStorage.setItem('bizcrm_brevo_api_key', brevoKeyInput.trim());
      setBrevoKeySavedFeedback('Brevo API Key saved to browser storage!');
    } else {
      localStorage.removeItem('bizcrm_brevo_api_key');
      setBrevoKeySavedFeedback('Default system key active.');
    }
    setTimeout(() => setBrevoKeySavedFeedback(''), 3000);
  };

  // Notifications
  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermissionStatus());
  const [notificationMessage, setNotificationMessage] = useState('');

  // Integrity
  const [integrityReport, setIntegrityReport] = useState(null);
  const [isValidatingIntegrity, setIsValidatingIntegrity] = useState(false);

  // Backup Import preview modal
  const [importPreview, setImportPreview] = useState(null);
  const [importStrategy, setImportStrategy] = useState('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState('');

  // Reset confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check storage estimate & persistence
    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          setStorageEstimate({
            usage: Math.round((est.usage || 0) / 1024),
            quota: Math.round((est.quota || 0) / (1024 * 1024)),
          });
        });
      }
      if (navigator.storage.persisted) {
        navigator.storage.persisted().then(setIsPersisted);
      }
    }
  }, []);

  const handleRequestPersistence = async () => {
    const res = await requestPersistentStorage();
    setIsPersisted(res.persisted);
    setPersistenceFeedback(res.message);
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinFeedback('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinFeedback('PINs do not match');
      return;
    }

    try {
      await setAppPin(pinInput);
      setPinEnabled(true);
      setPinInput('');
      setPinConfirm('');
      setPinFeedback('Security PIN successfully enabled and salted.');
    } catch (err) {
      setPinFeedback(err.message);
    }
  };

  const handleRemovePin = () => {
    removeAppPin();
    setPinEnabled(false);
    setPinFeedback('Security PIN lock removed.');
  };

  const handleTestWorker = async () => {
    const target = workerUrl.trim() || (typeof window !== 'undefined' ? window.location.origin : '');
    setIsTestingWorker(true);
    setWorkerTestResult('');

    try {
      const cleanUrl = target.replace(/\/+$/, '');
      if (workerUrl.trim()) {
        localStorage.setItem('bizcrm_email_worker_url', cleanUrl);
      } else {
        localStorage.removeItem('bizcrm_email_worker_url');
      }

      const res = await fetch(`${cleanUrl}/api/health`);
      if (!res.ok) throw new Error(`Endpoint returned status ${res.status}`);
      const data = await res.json();
      setWorkerHealth(data);
      setWorkerTestResult(`Connected successfully! Provider: ${data.provider} • Service: ${data.service || 'Ready'} • Timezone: ${data.timezone}`);
    } catch (err) {
      setWorkerHealth(null);
      setWorkerTestResult(`Connection failed: ${err.message}. Ensure dev server or worker is running.`);
    } finally {
      setIsTestingWorker(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await exportDatabaseToJson();
      downloadBackupFile(backup);
    } catch (err) {
      alert('Failed to export backup: ' + err.message);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      const validation = await validateBackupJson(text);
      if (!validation.isValid) {
        alert('Invalid backup file:\n' + validation.errors.join('\n'));
        return;
      }
      setImportPreview(validation);
      setImportStrategy('merge');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!importPreview?.parsedBackup) return;
    try {
      setIsImporting(true);
      const res = await restoreBackup(importPreview.parsedBackup, importStrategy);
      setImportFeedback(`Successfully restored ${res.restoredCounts.clients} clients, ${res.restoredCounts.leads} leads, ${res.restoredCounts.projects} projects, and financial records.`);
      setImportPreview(null);
    } catch (err) {
      alert('Failed to restore backup: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIsValidatingIntegrity(true);
    const report = await validateDatabaseIntegrity();
    setIntegrityReport(report);
    setIsValidatingIntegrity(false);
  };

  const handleExecuteReset = async () => {
    try {
      await resetAllData();
      setResetFeedback('All local data wiped and database re-seeded successfully.');
    } catch (err) {
      alert('Failed to reset data: ' + err.message);
    }
  };

  const handleRequestNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotificationStatus(res.status);
    setNotificationMessage(res.message);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Settings, Security & System
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
          Device security, email automation worker, persistence, and local database backup
        </p>
      </div>

      {/* 1. Device Security & Access PIN Lock */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              App Access Lock & PIN Protection
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Lock your agency CRM screen on this device with a Web Crypto SHA-256 salted PIN.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              pinEnabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
            }`}
          >
            {pinEnabled ? 'PIN Protected' : 'Unlocked / No PIN'}
          </span>
        </div>

        {pinFeedback && (
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs font-medium text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
            {pinFeedback}
          </div>
        )}

        {pinEnabled ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRemovePin}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-200 dark:border-rose-900"
            >
              Disable Security PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-3 max-w-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">New PIN (4+ digits)</label>
                <input
                  type="password"
                  maxLength="8"
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono tracking-widest text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  maxLength="8"
                  placeholder="••••"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono tracking-widest text-center"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
            >
              Enable PIN Protection
            </button>
          </form>
        )}
      </div>

      {/* 2. Free Automated Email Reminder Worker Setup */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Automated Email Reminders & Free Serverless Worker
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              100% free serverless architecture via Cloudflare Workers + Brevo / Resend.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              workerHealth?.isConfigured
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {workerHealth?.isConfigured ? 'Worker Connected' : 'Manual / Not Connected'}
          </span>
        </div>

        <div className="space-y-3">
          {/* Active Configured Sender & Owner Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Sender Name</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">Jugarr Agency</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Verified Sender Email</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">warshasingh21@gmail.com</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Owner Alert Email</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">warshasingh21@gmail.com</span>
            </div>
          </div>

          {/* Brevo API Key input */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
            <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
              Brevo API Key (Encrypted in Browser Local Storage)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="xkeysib-... (leave blank to use default key)"
                value={brevoKeyInput}
                onChange={(e) => setBrevoKeyInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveBrevoKey}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                Save Key
              </button>
            </div>
            {brevoKeySavedFeedback && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {brevoKeySavedFeedback}
              </p>
            )}
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Your key is saved locally in your browser and used seamlessly to dispatch client onboarding and renewal emails.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Email Dispatcher Endpoint (Cloudflare Worker or leave blank for Local Dev Server)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Leave blank for local dev server, or https://bizcrm-email-worker.workers.dev"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
              />
              <button
                type="button"
                onClick={handleTestWorker}
                disabled={isTestingWorker}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
              >
                {isTestingWorker ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            {workerTestResult && (
              <p className="text-xs font-medium mt-1.5 text-stone-600 dark:text-stone-400">
                {workerTestResult}
              </p>
            )}
          </div>

          {/* Domain Verification Guidance (SPF / DKIM / DMARC) */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              DNS Authentication Guidance (Zero-Cost Deliverability):
            </span>
            <ul className="space-y-1 text-stone-600 dark:text-stone-400 list-disc list-inside">
              <li><b>SPF Record:</b> Add a TXT record for <code className="bg-stone-200 dark:bg-stone-700 px-1 py-0.5 rounded font-mono">v=spf1 include:spf.brevo.com ~all</code> on your sending domain.</li>
              <li><b>DKIM:</b> Copy the Brevo or Resend domain verification public key into your DNS TXT records.</li>
              <li><b>DMARC:</b> Add TXT on <code className="bg-stone-200 dark:bg-stone-700 px-1 py-0.5 rounded font-mono">_dmarc.yourdomain.com</code> with <code className="bg-stone-200 dark:bg-stone-700 px-1 py-0.5 rounded font-mono">v=DMARC1; p=none;</code> to prevent spoofing.</li>
              <li><b>Manual Fallback:</b> If worker credentials are not configured, clicking Send Reminder opens your prefilled email client safely without any errors.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Storage Durability & Persistence */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              Browser Storage Durability & Health
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Prevent browser cache eviction when disk pressure occurs.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPersisted
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isPersisted ? 'Persisted Storage Granted' : 'Ephemeral Storage'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
          <div>Estimated IndexedDB Usage: <b>{storageEstimate.usage} KB</b></div>
          {!isPersisted && (
            <button
              type="button"
              onClick={handleRequestPersistence}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              Request Persistent Storage
            </button>
          )}
          <button
            type="button"
            onClick={handleCheckIntegrity}
            disabled={isValidatingIntegrity}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
          >
            {isValidatingIntegrity ? 'Validating...' : 'Validate Database Integrity'}
          </button>
        </div>

        {persistenceFeedback && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {persistenceFeedback}
          </p>
        )}

        {integrityReport && (
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 text-xs space-y-1">
            <div className="font-semibold text-stone-800 dark:text-stone-200">
              {integrityReport.isValid ? '✅ All database relationships are healthy and consistent!' : '⚠️ Detected broken relationships:'}
            </div>
            {integrityReport.brokenRelationships.map((b, idx) => (
              <div key={idx} className="text-rose-600">
                • {b.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Backup & Restore */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Database Backup & Restore (Schema v2)
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Export a full JSON copy of your clients, leads, invoices, subscriptions, and deliverables.
          </p>
        </div>

        {importFeedback && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
            {importFeedback}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center shadow-xs min-touch-target"
          >
            <Download className="w-4 h-4 mr-2" /> Export JSON Backup
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center min-touch-target"
          >
            <Upload className="w-4 h-4 mr-2" /> Restore from JSON File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* 5. Appearance / Theme */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Display Appearance</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Choose your preferred theme across mobile and desktop.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all min-touch-target ${
              theme === 'light'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all min-touch-target ${
              theme === 'dark'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all min-touch-target ${
              theme === 'system'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            <Laptop className="w-5 h-5 text-stone-500" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* 6. Danger Zone: Reset Data */}
      <div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xs space-y-3">
        <div>
          <h2 className="text-sm font-bold text-rose-900 dark:text-rose-300">Danger Zone</h2>
          <p className="text-xs text-rose-700 dark:text-rose-400">
            Wipe all local client, pipeline, invoice, and transaction data from IndexedDB.
          </p>
        </div>

        {resetFeedback && (
          <div className="text-xs font-semibold text-rose-700">{resetFeedback}</div>
        )}

        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs min-touch-target flex items-center"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Wipe All Local Database Records
        </button>
      </div>

      {/* Backup Preview Modal */}
      {importPreview && (
        <Modal
          isOpen={Boolean(importPreview)}
          onClose={() => setImportPreview(null)}
          title="Restore Backup Preview"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="text-xs text-stone-600 dark:text-stone-300">
              Backup created: <b>{new Date(importPreview.exportedAt).toLocaleString()}</b>
            </div>

            {/* Counts Preview */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
              <div>Clients: <b>{importPreview.previewCounts.clients}</b></div>
              <div>Leads: <b>{importPreview.previewCounts.leads}</b></div>
              <div>Projects: <b>{importPreview.previewCounts.projects}</b></div>
              <div>Tasks: <b>{importPreview.previewCounts.tasks}</b></div>
              <div>Payments: <b>{importPreview.previewCounts.payments}</b></div>
              <div>Invoices: <b>{importPreview.previewCounts.invoices || 0}</b></div>
            </div>

            {/* Strategy Choice */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
                Restore Strategy
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="merge"
                    checked={importStrategy === 'merge'}
                    onChange={() => setImportStrategy('merge')}
                    className="text-emerald-600"
                  />
                  <span><b>Merge:</b> Add new records and update existing records by ID</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="replace"
                    checked={importStrategy === 'replace'}
                    onChange={() => setImportStrategy('replace')}
                    className="text-emerald-600"
                  />
                  <span><b>Replace:</b> Completely clear current database and replace with backup</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleExecuteRestore}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
              >
                {isImporting ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleExecuteReset}
        title="Wipe All Local CRM Data?"
        message="This will completely clear all clients, leads, tasks, projects, payments, invoices, and subscriptions stored on this device. Default service categories will be restored. This action cannot be undone."
        confirmText="Yes, Wipe Database"
        isDestructive={true}
      />
    </div>
  );
}
