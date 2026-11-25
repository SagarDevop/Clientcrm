import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, parseISO, isValid } from 'date-fns';

/**
 * Format currency amount with symbol and thousands separators
 */
export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Safe date parsing
 */
export function safeDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isValid(dateVal) ? dateVal : null;
  const parsed = parseISO(dateVal);
  return isValid(parsed) ? parsed : null;
}

/**
 * Friendly relative or short date format
 */
export function formatDate(dateVal, formatStr = 'MMM d, yyyy') {
  const d = safeDate(dateVal);
  if (!d) return '—';
  return format(d, formatStr);
}

export function formatDateTime(dateVal) {
  const d = safeDate(dateVal);
  if (!d) return '—';
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelativeDate(dateVal) {
  const d = safeDate(dateVal);
  if (!d) return '—';
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy');
}

export function formatRelativeTimeAgo(dateVal) {
  const d = safeDate(dateVal);
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Human-readable labels and colors
 */
export const LEAD_STAGES = [
  { value: 'fresh', label: 'Fresh Lead', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'contacted', label: 'Contacted', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300' },
  { value: 'follow_up', label: 'Follow-up 1', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  { value: 'follow_up_2', label: 'Follow-up 2+', color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'demo_sent', label: 'Demo Sent', color: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-brand-200 text-brand-900 dark:bg-brand-800/60 dark:text-brand-100' },
  { value: 'won', label: 'Won', color: 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200' },
  { value: 'lost', label: 'Lost', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
];

export function getLeadStageLabel(stage) {
  const found = LEAD_STAGES.find((s) => s.value === stage);
  return found ? found.label : stage || 'Unknown';
}

export function getLeadStageBadgeColor(stage) {
  const found = LEAD_STAGES.find((s) => s.value === stage);
  return found ? found.color : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
}

export const CLIENT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300' },
  { value: 'paused', label: 'Paused', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
];

export const PROJECT_STATUSES = [
  { value: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'active', label: 'Active', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300' },
  { value: 'waiting_for_client', label: 'Waiting for Client', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  { value: 'paused', label: 'Paused', color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'completed', label: 'Completed', color: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300' },
  { value: 'high', label: 'High', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
];

export const INTERACTION_TYPES = [
  { value: 'call', label: 'Phone Call', icon: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { value: 'meeting', label: 'Meeting', icon: 'Users' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'demo', label: 'Product Demo', icon: 'PlaySquare' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
];
