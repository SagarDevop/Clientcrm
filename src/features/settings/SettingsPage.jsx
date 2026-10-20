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
} from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Storage info
  const [storageEstimate, setStorageEstimate] = useState({ usage: 0, quota: 0 });

  // Notifications
  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermissionStatus());
  const [notificationMessage, setNotificationMessage] = useState('');

  // Integrity
  const [integrityReport, setIntegrityReport] = useState(null);
  const [isValidatingIntegrity, setIsValidatingIntegrity] = useState(false);

  // Backup Import preview modal
  const [importPreview, setImportPreview] = useState(null);
  const [importStrategy, setImportStrategy] = useState('merge'); // 'merge' | 'replace'
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState('');

  // Reset confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check storage estimate
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageEstimate({
          usage: Math.round((est.usage || 0) / 1024), // in KB
          quota: Math.round((est.quota || 0) / (1024 * 1024)), // in MB
        });
      });
    }
  }, []);

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
    e.target.value = ''; // reset file input
  };

  const handleExecuteRestore = async () => {
    if (!importPreview?.parsedBackup) return;
    try {
      setIsImporting(true);
      const res = await restoreBackup(importPreview.parsedBackup, importStrategy);
      setImportFeedback(`Successfully restored ${res.restoredCounts.clients} clients, ${res.restoredCounts.leads} leads, and ${res.restoredCounts.projects} projects.`);
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Settings, Storage & Privacy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage local backups, appearance themes, and device storage
        </p>
      </div>

      {/* 1. Appearance / Theme */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Display Appearance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose your preferred theme across mobile and desktop.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all min-touch-target ${
              theme === 'light'
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Laptop className="w-5 h-5 text-slate-500" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* 2. Backup & Restore */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Database Backup & Restore
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export a full JSON copy of your CRM or restore from a previous backup file.
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
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center shadow-xs min-touch-target"
          >
            <Download className="w-4 h-4 mr-2" /> Export JSON Backup
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center min-touch-target"
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

        {/* Warning about local storage durability */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="leading-relaxed">
            <b>Backup Frequency Recommendation: </b>
            All business data is saved solely in this browser profile's IndexedDB. If browser cookies/storage are cleared or device access is lost, local data could be erased. We strongly recommend exporting a JSON backup weekly.
          </div>
        </div>
      </div>

      {/* 3. Database Integrity & Storage Info */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Database Health & Local Storage
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify cross-entity relationships and inspect IndexedDB usage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-brand-600" />
            <span>IndexedDB Estimated Usage: <b>{storageEstimate.usage} KB</b></span>
          </div>

          <button
            type="button"
            onClick={handleCheckIntegrity}
            disabled={isValidatingIntegrity}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
          >
            {isValidatingIntegrity ? 'Validating...' : 'Validate Database Integrity'}
          </button>
        </div>

        {integrityReport && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {integrityReport.isValid ? '✅ All relationships are healthy and consistent!' : '⚠️ Detected broken relationships:'}
            </div>
            {integrityReport.brokenRelationships.map((b, idx) => (
              <div key={idx} className="text-rose-600">
                • {b.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Device Notifications & Limitations */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Notification Permissions & Operating Constraints
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current permission status: <b className="capitalize">{notificationStatus}</b>
          </p>
        </div>

        {notificationMessage && (
          <p className="text-xs text-slate-600 dark:text-slate-300">{notificationMessage}</p>
        )}

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleRequestNotifications}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            Re-check Notification Permission
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-950/40 text-xs text-slate-500 leading-relaxed space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Technical Transparency Regarding Background Push:
          </div>
          <p>
            Scheduled browser notifications operate reliably on a best-effort basis while the app is active in memory or backgrounded. Modern mobile operating systems (especially iOS Safari and Android Chrome) suspend service workers when apps are closed, meaning local timers cannot guarantee closed-app delivery without a dedicated push subscription service.
          </p>
        </div>
      </div>

      {/* 5. Privacy, Security & Data Safety Disclaimer */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
          <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
          Privacy & Security Guidelines
        </h2>
        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-1.5">
          <p>
            • <b>Local-First:</b> All business records, customer phone numbers, quotations, and financial balances remain exclusively inside your device's browser IndexedDB. No external servers or third-party cloud sync services are used.
          </p>
          <p>
            • <b>Device Access:</b> Anyone with physical access to your unlocked device and browser profile can access these local records. For confidential records, ensure your phone or laptop has a lock screen passcode or biometrics enabled.
          </p>
          <p>
            • <b>No Sensitive Financial Data:</b> Do not enter credit card numbers, passwords, or banking credentials into notes or description fields.
          </p>
        </div>
      </div>

      {/* 6. Danger Zone: Reset Data */}
      <div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xs space-y-3">
        <div>
          <h2 className="text-sm font-bold text-rose-900 dark:text-rose-300">Danger Zone</h2>
          <p className="text-xs text-rose-700 dark:text-rose-400">
            Wipe all local client, pipeline, and transaction data from IndexedDB.
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
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Backup created: <b>{new Date(importPreview.exportedAt).toLocaleString()}</b>
            </div>

            {/* Counts Preview */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>Clients: <b>{importPreview.previewCounts.clients}</b></div>
              <div>Leads: <b>{importPreview.previewCounts.leads}</b></div>
              <div>Projects: <b>{importPreview.previewCounts.projects}</b></div>
              <div>Tasks: <b>{importPreview.previewCounts.tasks}</b></div>
              <div>Payments: <b>{importPreview.previewCounts.payments}</b></div>
              <div>Interactions: <b>{importPreview.previewCounts.interactions}</b></div>
            </div>

            {/* Strategy Choice */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Restore Strategy
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="merge"
                    checked={importStrategy === 'merge'}
                    onChange={() => setImportStrategy('merge')}
                    className="text-brand-600"
                  />
                  <span><b>Merge:</b> Add new records and update existing records by ID</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="replace"
                    checked={importStrategy === 'replace'}
                    onChange={() => setImportStrategy('replace')}
                    className="text-brand-600"
                  />
                  <span><b>Replace:</b> Completely clear current database and replace with backup</span>
                </label>
              </div>
            </div>

            {/* Warning if warnings exist */}
            {importPreview.warnings.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                {importPreview.warnings.join('\n')}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs"
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
        message="This will completely clear all clients, leads, tasks, projects, payments, and interactions stored on this device. Default service categories will be restored. This action cannot be undone."
        confirmText="Yes, Wipe Database"
        isDestructive={true}
      />
    </div>
  );
}
