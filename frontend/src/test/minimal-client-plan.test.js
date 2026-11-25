import { describe, it, expect, beforeEach } from 'vitest';
import { BizCRMDatabase } from '../db/database.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { paymentsRepo } from '../db/repositories/paymentsRepo.js';
import { getNextAnchorDate, getNextBillingDateISO } from '../utils/dates.js';
import { roundMoney } from '../utils/finance.js';
import {
  buildOnboardingEmailHtml,
  buildOnboardingOwnerEmailHtml,
  buildCompletionEmailHtml,
  sendClientCompletionEmails,
} from '../utils/email.js';

describe('Minimal Active Client & Monthly Plan Tracker', () => {
  let testDb;

  beforeEach(async () => {
    testDb = new BizCRMDatabase(`test_minimal_${Date.now()}_${Math.random()}`);
    await testDb.open();
  });

  it('1 & 2. Adds client, computes remaining amount, and validates token constraints', async () => {
    // Valid client creation
    const client = await clientsRepo.createWithPlan(
      {
        name: 'Amit Sharma',
        businessName: 'Sharma Digital',
        email: 'amit@sharmadigital.com',
        phone: '9876543210',
        startDate: '2026-10-28',
        monthlyPlanAmount: 10000,
        tokenPaid: 3000,
        packageDescription: '15 Instagram Reels\nDaily Stories\nMonthly Performance Report',
      },
      testDb
    );

    expect(client.id).toBeDefined();
    expect(client.monthlyPlanAmount).toBe(10000);
    expect(client.tokenPaid).toBe(3000);
    expect(client.remainingAmount).toBe(7000);
    expect(client.paymentStatus).toBe('partially_paid');
    expect(client.completionDate).toBe('2026-11-28');
    expect(client.billingAnchorDay).toBe(28);

    // Initial token recorded in payments table
    const payments = await paymentsRepo.getAll({ clientId: client.id }, testDb);
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(3000);
    expect(payments[0].type).toBe('token');

    // Reject negative token
    await expect(
      clientsRepo.createWithPlan(
        {
          name: 'Invalid Negative',
          monthlyPlanAmount: 5000,
          tokenPaid: -500,
        },
        testDb
      )
    ).rejects.toThrow('Token payment cannot be negative');

    // Reject token exceeding plan amount
    await expect(
      clientsRepo.createWithPlan(
        {
          name: 'Invalid Excess',
          monthlyPlanAmount: 5000,
          tokenPaid: 7000,
        },
        testDb
      )
    ).rejects.toThrow('Token payment cannot exceed monthly plan amount');
  });

  it('3 & 4. Builds onboarding email with preserved line breaks and exact figures', () => {
    const client = {
      name: 'Pooja Mehta',
      businessName: 'Mehta Creations',
      email: 'pooja@mehta.in',
      startDate: '2026-11-01',
      completionDate: '2026-12-01',
      monthlyPlanAmount: 25000,
      tokenPaid: 10000,
      remainingAmount: 15000,
      packageDescription: 'Deliverables:\n- 12 High-res Carousels\n- Weekly Analytics\n\nContact us on WhatsApp for fast edits.',
    };

    const clientHtml = buildOnboardingEmailHtml({
      client,
      tokenAmount: 10000,
      remainingAmount: 15000,
    });

    expect(clientHtml).toContain('Pooja Mehta');
    expect(clientHtml).toContain('Mehta Creations');
    expect(clientHtml).toContain('25,000');
    expect(clientHtml).toContain('10,000');
    expect(clientHtml).toContain('15,000');
    expect(clientHtml).toContain('2026-11-01');
    expect(clientHtml).toContain('2026-12-01');
    // Preserves line breaks in HTML
    expect(clientHtml).toContain('<br/>');

    const ownerHtml = buildOnboardingOwnerEmailHtml({
      client,
      tokenAmount: 10000,
      remainingAmount: 15000,
    });
    expect(ownerHtml).toContain('New Client Onboarded');
    expect(ownerHtml).toContain('Pooja Mehta');
  });

  it('5 & 6. Preserves anchor-day math across months and February', () => {
    // 31 January -> 28 February
    const jan31 = '2026-01-31';
    const febNext = getNextBillingDateISO(31, jan31, 1).slice(0, 10);
    expect(febNext).toBe('2026-02-28');

    // 28 February with anchor 31 -> 31 March (no month-end drift!)
    const marNext = getNextBillingDateISO(31, febNext, 1).slice(0, 10);
    expect(marNext).toBe('2026-03-31');
  });

  it('7. Recording additional payment updates balance correctly and prevents duplicate counting', async () => {
    const client = await clientsRepo.createWithPlan(
      {
        name: 'Vikram Singh',
        businessName: 'Vikram Logistics',
        monthlyPlanAmount: 10000,
        tokenPaid: 3000,
        startDate: '2026-10-28',
        packageDescription: 'Monthly Fleet Tracking',
      },
      testDb
    );

    expect(client.remainingAmount).toBe(7000);

    // Record additional payment of 2000
    const updated = await clientsRepo.recordPayment(
      client.id,
      {
        amount: 2000,
        paymentMethod: 'upi',
        notes: 'Part payment via GPay',
      },
      testDb
    );

    expect(updated.additionalPaid).toBe(2000);
    expect(updated.totalPaid).toBe(5000);
    expect(updated.remainingAmount).toBe(5000);
    expect(updated.paymentStatus).toBe('partially_paid');

    // Pay off remaining 5000
    const finalClient = await clientsRepo.recordPayment(
      client.id,
      {
        amount: 5000,
        paymentMethod: 'bank_transfer',
      },
      testDb
    );

    expect(finalClient.totalPaid).toBe(10000);
    expect(finalClient.remainingAmount).toBe(0);
    expect(finalClient.paymentStatus).toBe('paid');

    // Verify payments store history
    const allPayments = await paymentsRepo.getAll({ clientId: client.id }, testDb);
    expect(allPayments.length).toBe(3); // 1 token + 2 additional
    const sum = allPayments.reduce((acc, p) => acc + p.amount, 0);
    expect(sum).toBe(10000);
  });

  it('8. Fully paid client does not receive payment request for zero balance in completion email', () => {
    const paidClient = {
      name: 'Kavita Roy',
      businessName: 'Roy Designs',
      monthlyPlanAmount: 8000,
      tokenPaid: 8000,
      remainingAmount: 0,
      packageDescription: 'UI Design Pack',
      startDate: '2026-10-01',
      completionDate: '2026-11-01',
    };

    const emailHtml = buildCompletionEmailHtml({ client: paidClient, remainingAmount: 0 });
    expect(emailHtml).toContain('Paid in Full');
    expect(emailHtml).toContain('We have received full payment');
    expect(emailHtml).not.toContain('Please arrange payment of the remaining amount');
  });

  it('9. Inactive or cancelled clients do not receive completion reminder', async () => {
    const inactiveClient = await clientsRepo.createWithPlan(
      {
        name: 'Inactive Client',
        businessName: 'Old Business',
        monthlyPlanAmount: 5000,
        tokenPaid: 2000,
        status: 'inactive',
      },
      testDb
    );

    const result = await sendClientCompletionEmails({ client: inactiveClient, database: testDb });
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('inactive or cancelled');
  });

  it('10. Starting next month preserves previous period history and computes next anchor date', async () => {
    const client = await clientsRepo.createWithPlan(
      {
        name: 'Sneha Patel',
        businessName: 'Patel Studios',
        monthlyPlanAmount: 12000,
        tokenPaid: 5000,
        startDate: '2026-10-31',
        billingAnchorDay: 31,
        packageDescription: 'Social Media Management',
      },
      testDb
    );

    // Record rest of month 1
    await clientsRepo.recordPayment(client.id, { amount: 7000 }, testDb);

    // Start Next Month
    const month2 = await clientsRepo.startNextMonth(
      client.id,
      {
        startDate: client.completionDate, // 2026-11-30
        monthlyPlanAmount: 12000,
        tokenPaid: 4000, // new token for month 2
      },
      testDb
    );

    expect(month2.periods.length).toBe(1);
    expect(month2.periods[0].periodNumber).toBe(1);
    expect(month2.periods[0].totalPaid).toBe(12000);
    expect(month2.periods[0].remainingAmount).toBe(0);

    // Month 2 active figures
    expect(month2.currentPeriod.periodNumber).toBe(2);
    expect(month2.tokenPaid).toBe(4000);
    expect(month2.remainingAmount).toBe(8000);
    expect(month2.paymentStatus).toBe('partially_paid');
    // Next completion date preserves original anchor day 31
    expect(month2.completionDate).toBe('2026-12-31');
  });
});
