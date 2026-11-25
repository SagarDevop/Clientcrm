import { describe, it, expect, beforeEach } from 'vitest';
import { BizCRMDatabase } from '../db/database.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { paymentsRepo } from '../db/repositories/paymentsRepo.js';
import { projectsRepo } from '../db/repositories/projectsRepo.js';
import {
  roundMoney,
  calculateInvoiceTotals,
  evaluateInvoiceStatus,
  calculatePaymentBalances,
} from '../utils/finance.js';
import { getNextAnchorDate, getNextBillingDateISO } from '../utils/dates.js';
import { generateSalt, hashPin, verifyPin } from '../utils/security.js';

describe('Financial Invariants & Calculation Engine', () => {
  it('correctly rounds floating point numbers to avoid 0.1 + 0.2 IEEE 754 precision issues', () => {
    const sum = 0.1 + 0.2;
    expect(sum).not.toBe(0.3); // Standard JS float inaccuracy
    expect(roundMoney(sum)).toBe(0.3);
    expect(roundMoney(1234.567)).toBe(1234.57);
    expect(roundMoney(1234.564)).toBe(1234.56);
  });

  it('calculates invoice totals with discounts and tax without inflating cash', () => {
    const lineItems = [
      { description: 'Website Redesign', quantity: 1, unitPrice: 2000 },
      { description: 'SEO Audit', quantity: 2, unitPrice: 500 },
    ];
    // Subtotal: 2000 + 1000 = 3000
    // Discount: 10% = 300 => Net: 2700
    // Tax: 18% GST on 2700 = 486
    // Total: 3186
    const totals = calculateInvoiceTotals({
      items: lineItems,
      discountType: 'percentage',
      discountValue: 10,
      taxPercent: 18,
    });

    expect(totals.subtotal).toBe(3000);
    expect(totals.discountAmount).toBe(300);
    expect(totals.taxAmount).toBe(486);
    expect(totals.total).toBe(3186);
  });

  it('evaluates invoice statuses accurately across partial, full, overdue, and draft states', () => {
    const today = new Date().toISOString().slice(0, 10);
    const pastDate = '2020-01-01';
    const futureDate = '2035-01-01';

    // Draft
    expect(evaluateInvoiceStatus({ status: 'draft', total: 1000, paidAmount: 0, dueDate: pastDate })).toBe('draft');

    // Void
    expect(evaluateInvoiceStatus({ status: 'void', total: 1000, paidAmount: 500, dueDate: pastDate })).toBe('void');

    // Fully paid
    expect(evaluateInvoiceStatus({ total: 1000, paidAmount: 1000, dueDate: pastDate })).toBe('paid');
    expect(evaluateInvoiceStatus({ total: 1000, paidAmount: 1200, dueDate: pastDate })).toBe('paid'); // Overpaid is paid

    // Partially paid
    expect(evaluateInvoiceStatus({ total: 1000, paidAmount: 500, dueDate: futureDate })).toBe('partially_paid');

    // Overdue
    expect(evaluateInvoiceStatus({ total: 1000, paidAmount: 500, dueDate: pastDate })).toBe('overdue');
    expect(evaluateInvoiceStatus({ total: 1000, paidAmount: 0, dueDate: pastDate })).toBe('overdue');

    // Unpaid (not yet due)
    expect(evaluateInvoiceStatus({ total: 1000, paidAmount: 0, dueDate: futureDate })).toBe('unpaid');
  });

  it('preserves signed negative adjustments and does not inflate cleared cash', () => {
    const transactions = [
      { type: 'payment', amount: 5000, status: 'recorded' },
      { type: 'payment', amount: 2000, status: 'pending' }, // Pending is not cleared cash
      { type: 'adjustment', amount: -500, status: 'recorded' }, // Negative discount/write-off adjustment
      { type: 'refund', amount: 300, status: 'recorded' }, // Customer refund
      { type: 'payment', amount: 1500, status: 'void' }, // Voided payment
    ];

    const balances = calculatePaymentBalances(transactions);

    expect(balances.clearedPayments).toBe(5000);
    expect(balances.clearedRefunds).toBe(300);
    expect(balances.clearedAdjustments).toBe(-500);
    // Net cleared cash = 5000 - 300 + (-500) = 4200
    expect(balances.netClearedCash).toBe(4200);
    expect(balances.pendingAmount).toBe(2000);
    expect(balances.voidedAmount).toBe(1500);
  });
});

describe('Date & Month-End Anchor Math', () => {
  it('preserves 31st anchor across 28-day February and returns to 31st in March', () => {
    // Starting Jan 31 in a non-leap year (e.g. 2025)
    const jan31 = new Date(2025, 0, 31);
    const febNext = getNextAnchorDate(jan31, 1, 31);
    expect(febNext.getFullYear()).toBe(2025);
    expect(febNext.getMonth()).toBe(1); // February
    expect(febNext.getDate()).toBe(28); // Capped at 28

    // Next from February must restore back to March 31, NOT March 28!
    const marNext = getNextAnchorDate(jan31, 2, 31);
    expect(marNext.getFullYear()).toBe(2025);
    expect(marNext.getMonth()).toBe(2); // March
    expect(marNext.getDate()).toBe(31); // Restored to 31st!
  });

  it('handles leap years correctly for 31st anchor', () => {
    // 2024 was a leap year
    const jan31_2024 = new Date(2024, 0, 31);
    const feb2024 = getNextAnchorDate(jan31_2024, 1, 31);
    expect(feb2024.getDate()).toBe(29);
  });
});

describe('Data Protection & Referential Integrity', () => {
  let testDb;

  beforeEach(async () => {
    testDb = new BizCRMDatabase(`TestInvariantsDB_${Math.random().toString(36).substring(7)}`);
    await testDb.open();
  });

  it('prevents accidental deletion of clients with linked projects', async () => {
    const client = await clientsRepo.create({ name: 'Acme Corp', phone: '9876543210' }, testDb);
    await projectsRepo.create({ clientId: client.id, title: 'Acme Website', agreedAmount: 50000 }, testDb);

    await expect(clientsRepo.delete(client.id, testDb)).rejects.toThrow(
      /Cannot delete client because it has linked records/
    );

    // Archiving client works safely without breaking relations
    const archived = await clientsRepo.archive(client.id, testDb);
    expect(archived.status).toBe('archived');
  });

  it('detects duplicate payments on same client with matching amount and date', async () => {
    const client = await clientsRepo.create({ name: 'Duplicate Test Client' }, testDb);
    const today = new Date().toISOString();

    await paymentsRepo.create(
      {
        clientId: client.id,
        amount: 2500,
        paidAt: today,
        reference: 'TXN-001',
      },
      testDb
    );

    // Attempting same transaction again should be flagged
    await expect(
      paymentsRepo.create(
        {
          clientId: client.id,
          amount: 2500,
          paidAt: today,
          reference: 'TXN-001',
        },
        testDb
      )
    ).rejects.toThrow(/Potential duplicate payment detected/);
  });
});

describe('Security & Local Hash Verification', () => {
  it('hashes and securely verifies PIN with cryptographic salt', async () => {
    const pin = '4829';
    const salt = generateSalt();
    expect(salt).toBeDefined();
    expect(salt.length).toBeGreaterThan(10);

    const hash = await hashPin(pin, salt);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');

    // Correct PIN verifies
    const isValid = await verifyPin('4829', hash, salt);
    expect(isValid).toBe(true);

    // Incorrect PIN rejected
    const isInvalid = await verifyPin('1111', hash, salt);
    expect(isInvalid).toBe(false);
  });
});
