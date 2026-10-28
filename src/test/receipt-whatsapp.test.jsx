import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientReceiptModal } from '../components/common/ClientReceiptModal.jsx';
import { WhatsAppModal } from '../components/common/WhatsAppModal.jsx';
import { getClientWhatsAppMessage, WHATSAPP_TEMPLATES, cleanWhatsAppNumber } from '../utils/whatsapp.js';

describe('1-Click Receipt / Invoice & 3-in-1 WhatsApp Features', () => {
  const mockClient = {
    id: 'cli-test-999',
    name: 'Rahul Verma',
    businessName: 'Verma Electronics',
    email: 'rahul@verma.com',
    phone: '9876543210',
    startDate: '2026-11-01',
    completionDate: '2026-12-01',
    monthlyPlanAmount: 25000,
    tokenPaid: 10000,
    additionalPaid: 5000,
    totalPaid: 15000,
    remainingAmount: 10000,
    packageDescription: 'Full SEO & Meta Ads Management\nWeekly Performance Reporting',
    status: 'active',
  };

  const mockPayments = [
    { id: 'pmt-1', amount: 5000, paymentMethod: 'UPI', paidAt: '2026-11-15', notes: 'Part 2' },
  ];

  describe('ClientReceiptModal', () => {
    it('renders Jugarr Agency branding and client details', () => {
      render(
        <ClientReceiptModal
          isOpen={true}
          onClose={vi.fn()}
          client={mockClient}
          payments={mockPayments}
        />
      );

      expect(screen.getByText('Jugarr Agency')).toBeInTheDocument();
      expect(screen.getByText('Rahul Verma')).toBeInTheDocument();
      expect(screen.getByText('Verma Electronics')).toBeInTheDocument();
      expect(screen.getAllByText(/warshasingh21@gmail.com/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('₹25,000')).toBeInTheDocument();
      expect(screen.getByText('₹10,000')).toBeInTheDocument(); // Remaining due
    });

    it('triggers window.print when print button is clicked', () => {
      const originalPrint = window.print;
      window.print = vi.fn();

      render(
        <ClientReceiptModal
          isOpen={true}
          onClose={vi.fn()}
          client={mockClient}
          payments={mockPayments}
        />
      );

      const printBtn = screen.getByText('Print / Save PDF');
      fireEvent.click(printBtn);
      expect(window.print).toHaveBeenCalledTimes(1);

      window.print = originalPrint;
    });
  });

  describe('3-in-1 WhatsApp Smart Templates & Modal', () => {
    it('generates proper template messages for all 3 scenarios', () => {
      const onboardingMsg = getClientWhatsAppMessage('onboarding', mockClient);
      expect(onboardingMsg).toContain('welcome onboard! 🚀');
      expect(onboardingMsg).toContain('Verma Electronics');
      expect(onboardingMsg).toContain('₹25,000');
      expect(onboardingMsg).toContain('Jugarr Agency');

      const balanceMsg = getClientWhatsAppMessage('balance', mockClient);
      expect(balanceMsg).toContain('remaining balance');
      expect(balanceMsg).toContain('₹10,000');
      expect(balanceMsg).toContain('Verma Electronics');

      const renewalMsg = getClientWhatsAppMessage('renewal', mockClient);
      expect(renewalMsg).toContain('completing on *2026-12-01*');
      expect(renewalMsg).toContain('₹25,000');
    });

    it('normalizes Indian phone numbers correctly', () => {
      expect(cleanWhatsAppNumber('9876543210')).toBe('919876543210');
      expect(cleanWhatsAppNumber('+91 98765 43210')).toBe('919876543210');
      expect(cleanWhatsAppNumber('919876543210')).toBe('919876543210');
    });

    it('renders WhatsAppModal and allows switching between the 3 scenarios', () => {
      render(
        <WhatsAppModal
          isOpen={true}
          onClose={vi.fn()}
          client={mockClient}
          defaultTemplate="balance"
        />
      );

      expect(screen.getByText('3-in-1 WhatsApp Smart Messenger')).toBeInTheDocument();
      expect(screen.getByText('Rahul Verma')).toBeInTheDocument();

      // Click Renewal scenario
      const renewalBtn = screen.getByText('3. Renewal');
      fireEvent.click(renewalBtn);

      const textarea = screen.getByDisplayValue(/completing on/i);
      expect(textarea).toBeInTheDocument();

      // Click Onboarding scenario
      const onboardingBtn = screen.getByText('1. Onboarding');
      fireEvent.click(onboardingBtn);

      expect(screen.getByDisplayValue(/welcome onboard/i)).toBeInTheDocument();
    });
  });
});
