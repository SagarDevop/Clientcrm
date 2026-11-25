import {
  parseISO,
  isValid,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  getDaysInMonth,
  setDate,
  addMonths,
} from 'date-fns';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Calculates the next recurring date while preserving the original anchor day of the month.
 *
 * Example:
 * If anchorDay is 31:
 * - Starting from Jan 31 + 1 month -> Feb 28 (or 29 in leap year)
 * - Next cycle from Feb + 1 month -> March 31 (anchor day preserved, NO drift to March 28!)
 */
export function getNextAnchorDate(arg1, arg2, arg3 = 1) {
  let anchorDay = 31;
  let fromDate = new Date();
  let monthsToAdd = 1;

  if (typeof arg1 === 'number' && arg1 >= 1 && arg1 <= 31 && !(arg2 instanceof Date) && typeof arg2 === 'number') {
    // getNextAnchorDate(anchorDay, monthsToAdd)
    anchorDay = arg1;
    monthsToAdd = arg2;
  } else if (typeof arg1 === 'number' && arg1 >= 1 && arg1 <= 31) {
    // getNextAnchorDate(anchorDay, fromDate, monthsToAdd)
    anchorDay = arg1;
    fromDate = arg2 || new Date();
    monthsToAdd = typeof arg3 === 'number' ? arg3 : 1;
  } else {
    // getNextAnchorDate(fromDate, monthsToAdd, anchorDay)
    fromDate = arg1 || new Date();
    monthsToAdd = typeof arg2 === 'number' ? arg2 : 1;
    anchorDay = typeof arg3 === 'number' ? arg3 : (fromDate instanceof Date ? fromDate.getDate() : 31);
  }

  const base = typeof fromDate === 'string' ? parseISO(fromDate) : new Date(fromDate);
  if (!isValid(base)) return new Date();

  const clampedAnchor = Math.min(31, Math.max(1, Number(anchorDay) || base.getDate()));

  // Target year and month
  let targetYear = base.getFullYear();
  let targetMonth = base.getMonth() + monthsToAdd;

  // Handle year rollover
  targetYear += Math.floor(targetMonth / 12);
  targetMonth = ((targetMonth % 12) + 12) % 12;

  // Days in target month
  const daysInTargetMonth = getDaysInMonth(new Date(targetYear, targetMonth, 1));
  const finalDay = Math.min(clampedAnchor, daysInTargetMonth);

  // Use noon (12:00) so UTC conversions (.toISOString) never roll back to the previous day in any timezone
  return new Date(targetYear, targetMonth, finalDay, 12, 0, 0);
}

/**
 * Returns ISO string for next billing date
 */
export function getNextBillingDateISO(anchorDay, fromDate = new Date(), monthsToAdd = 1) {
  return getNextAnchorDate(anchorDay, fromDate, monthsToAdd).toISOString();
}

/**
 * Returns whether a date is overdue (passed end of day)
 */
export function isDateOverdue(dateVal) {
  if (!dateVal) return false;
  const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
  if (!isValid(d)) return false;
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

/**
 * Format date in specified timezone (default Asia/Kolkata)
 */
export function formatInAppDate(dateVal, formatStr = 'MMM d, yyyy') {
  if (!dateVal) return '—';
  const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
  if (!isValid(d)) return '—';
  return format(d, formatStr);
}

export function formatInAppDateTime(dateVal) {
  if (!dateVal) return '—';
  const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
  if (!isValid(d)) return '—';
  return format(d, 'MMM d, yyyy h:mm a');
}
