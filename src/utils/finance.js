/**
 * Financial Calculation Engine
 * Guarantees precision, decimal accuracy, and strict financial invariants.
 *
 * Invariants:
 * 1. Money is tracked with 2 decimal places precision (minor units rounding).
 * 2. Discounts reduce the payable invoice total; they are NEVER counted as received cash.
 * 3. Adjustments are signed values (+ for fee increase, - for fee decrease/credit).
 * 4. Pending, void, or cancelled payments NEVER count towards cleared cash.
 * 5. Outstanding receivables = Invoiced Total - Net Cleared Cash.
 * 6. An invoice is marked paid only when Cleared Cash >= Invoice Total.
 */

export const ROUND_FACTOR = 100;

export function roundMoney(amount) {
  const num = Number(amount) || 0;
  return Math.round((num + Number.EPSILON) * ROUND_FACTOR) / ROUND_FACTOR;
}

export function toMinorUnits(amount) {
  return Math.round((Number(amount) || 0) * ROUND_FACTOR);
}

export function fromMinorUnits(cents) {
  return (Number(cents) || 0) / ROUND_FACTOR;
}

/**
 * Calculate invoice subtotal, discount, tax, and final total
 */
export function calculateInvoiceTotals({
  lineItems,
  items,
  discountType = 'fixed', // 'fixed' | 'percent' | 'percentage'
  discountValue = 0,
  taxRate,
  taxPercent,
} = {}) {
  const allItems = Array.isArray(lineItems) ? lineItems : (Array.isArray(items) ? items : []);
  let subtotal = 0;
  for (const item of allItems) {
    const qty = Math.max(0, Number(item.quantity ?? item.qty) || 1);
    const rate = Math.max(0, Number(item.rate ?? item.unitPrice ?? item.price ?? item.unitCost) || 0);
    subtotal += qty * rate;
  }
  subtotal = roundMoney(subtotal);

  // Calculate discount
  let discountAmount = 0;
  const rawDisc = Number(discountValue) || 0;
  const isPercent = discountType === 'percent' || discountType === 'percentage';
  if (isPercent) {
    discountAmount = roundMoney(subtotal * (Math.min(100, Math.max(0, rawDisc)) / 100));
  } else {
    discountAmount = roundMoney(Math.min(subtotal, Math.max(0, rawDisc)));
  }

  const taxableAmount = Math.max(0, roundMoney(subtotal - discountAmount));

  // Calculate tax
  const rawTaxRate = Math.max(0, Number(taxRate ?? taxPercent) || 0);
  const taxAmount = roundMoney(taxableAmount * (rawTaxRate / 100));

  const total = roundMoney(taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    taxRate: rawTaxRate,
    total,
  };
}

/**
 * Calculate invoice status based on cleared payments and due date
 */
export function evaluateInvoiceStatus({
  total = 0,
  paidAmount = 0,
  dueDate = null,
  currentStatus,
  status,
} = {}) {
  const activeStatus = currentStatus || status;
  if (activeStatus === 'void') return 'void';
  if (activeStatus === 'draft') return 'draft';

  const roundedTotal = roundMoney(total);
  const roundedPaid = roundMoney(paidAmount);

  if (roundedPaid >= roundedTotal && roundedTotal > 0) {
    return 'paid';
  }

  const isOverdue = dueDate && new Date(dueDate).setHours(23, 59, 59, 999) < Date.now();

  if (roundedPaid > 0) {
    return isOverdue ? 'overdue' : 'partially_paid';
  }

  return isOverdue ? 'overdue' : 'unpaid';
}

/**
 * Calculates financial balances across payments
 */
export function calculatePaymentBalances(payments = []) {
  let clearedPayments = 0;
  let clearedRefunds = 0;
  let clearedAdjustments = 0;
  let pendingAmount = 0;
  let voidedAmount = 0;

  for (const p of payments) {
    const rawAmt = Number(p.amount) || 0;
    const amt = roundMoney(rawAmt);

    if (p.status === 'void' || p.status === 'cancelled') {
      voidedAmount = roundMoney(voidedAmount + Math.abs(amt));
      continue;
    }

    if (p.status === 'pending') {
      pendingAmount = roundMoney(pendingAmount + Math.abs(amt));
      continue;
    }

    if (p.status === 'recorded' || p.status === 'cleared') {
      if (p.type === 'payment') {
        clearedPayments = roundMoney(clearedPayments + Math.abs(amt));
      } else if (p.type === 'refund') {
        clearedRefunds = roundMoney(clearedRefunds + Math.abs(amt));
      } else if (p.type === 'adjustment') {
        // Adjustments are signed: positive increases net received, negative reduces
        clearedAdjustments = roundMoney(clearedAdjustments + amt);
      }
    }
  }

  const netClearedCash = roundMoney(clearedPayments - clearedRefunds + clearedAdjustments);

  return {
    clearedPayments,
    clearedRefunds,
    clearedAdjustments,
    pendingAmount,
    voidedAmount,
    netClearedCash,
  };
}
