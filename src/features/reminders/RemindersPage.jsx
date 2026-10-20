import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReminders } from '../../hooks/useReminders.js';
import { formatDate, formatRelativeDate } from '../../utils/formatters.js';
import {
  isNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendLocalNotification,
} from '../../services/notifications.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  Bell,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';

export function RemindersPage() {
  const [filter, setFilter] = useState('scheduled'); // 'scheduled' | 'completed' | 'dismissed'
  const { reminders, isLoading, completeReminder, dismissReminder, snoozeReminder } =
    useReminders({ status: filter });

  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermissionStatus());
  const [permissionMsg, setPermissionMsg] = useState('');
  const navigate = useNavigate();

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotificationStatus(res.status);
    setPermissionMsg(res.message);
  };

  const handleTestNotification = async () => {
    const sent = await sendLocalNotification('BizCRM Test Alert', {
      body: 'Local notifications are active and working on this device!',
    });
    if (!sent) {
      setPermissionMsg('Could not send notification. Ensure notifications are allowed in browser settings.');
    }
  };

  const handleOpenEntity = (rem) => {
    if (rem.entityType === 'lead') {
      navigate(`/leads/${rem.entityId}`);
    } else if (rem.entityType === 'client') {
      navigate(`/clients/${rem.entityId}`);
    } else if (rem.entityType === 'project') {
      navigate(`/projects/${rem.entityId}`);
    } else if (rem.entityType === 'task') {
      navigate('/tasks');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Reminders & In-App Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automated alerts for follow-ups, scheduled milestones and tasks
          </p>
        </div>

        {/* Browser notification permission button */}
        {isNotificationSupported() && (
          <div className="flex items-center space-x-2">
            {notificationStatus === 'granted' ? (
              <button
                type="button"
                onClick={handleTestNotification}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center min-touch-target"
              >
                <Send className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                Test Browser Notification
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center shadow-xs min-touch-target"
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                Enable Device Notifications
              </button>
            )}
          </div>
        )}
      </div>

      {permissionMsg && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs flex items-center">
          <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0" />
          {permissionMsg}
        </div>
      )}

      {/* Local Notification limitations notice */}
      <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start space-x-2.5">
        <Clock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <b className="text-slate-900 dark:text-slate-100">Local-First Notification Engine: </b>
          In-app alerts reconcile reliably whenever this PWA is open or foregrounded. Device notifications will trigger while the browser is running. Overdue badges highlight any follow-ups that passed.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setFilter('scheduled')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-touch-target ${
            filter === 'scheduled'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Scheduled Alerts
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-touch-target ${
            filter === 'completed'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Completed
        </button>
        <button
          type="button"
          onClick={() => setFilter('dismissed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-touch-target ${
            filter === 'dismissed'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Dismissed
        </button>
      </div>

      {/* Reminders List */}
      {isLoading ? (
        <LoadingSpinner text="Checking reminders..." />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'scheduled' ? 'No pending reminders' : 'No reminders in this view'}
          description="Reminders are automatically scheduled when setting next follow-ups or deliverable deadlines."
        />
      ) : (
        <div className="space-y-2.5">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400 flex-shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {rem.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                    <span className="capitalize">{rem.entityType}</span>
                    <span>• Scheduled: {formatDate(rem.scheduledAt)}</span>
                    {rem.snoozedUntil && (
                      <span className="text-amber-600 font-medium">
                        Snoozed until: {formatRelativeDate(rem.snoozedUntil)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1.5 justify-end">
                {rem.status === 'scheduled' && (
                  <>
                    <button
                      type="button"
                      onClick={() => snoozeReminder(rem.id, 30)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium min-touch-target"
                    >
                      Snooze 30m
                    </button>
                    <button
                      type="button"
                      onClick={() => completeReminder(rem.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-medium min-touch-target"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissReminder(rem.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 text-xs font-medium min-touch-target"
                    >
                      Dismiss
                    </button>
                  </>
                )}

                {rem.entityId && (
                  <button
                    type="button"
                    onClick={() => handleOpenEntity(rem)}
                    className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 min-touch-target"
                    title="Open linked record"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
