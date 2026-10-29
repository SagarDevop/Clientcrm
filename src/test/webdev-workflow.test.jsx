import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BizCRMDatabase } from '../db/database.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { paymentsRepo } from '../db/repositories/paymentsRepo.js';
import { quotationsRepo, calculateQuotationTotals } from '../db/repositories/quotationsRepo.js';
import {
  buildWebDevOnboardingEmailHtml,
  buildWebDevOwnerEmailHtml,
  buildWebDevDeliveryEmailHtml,
} from '../utils/email.js';
import { QuotationBuilder } from '../components/forms/QuotationBuilder.jsx';
import { QuotationModal } from '../components/common/QuotationModal.jsx';

describe('Web Development Client Workflow & Quotation Engine', () => {
  let testDb;

  beforeEach(async () => {
    testDb = new BizCRMDatabase(`test_webdev_${Date.now()}_${Math.random()}`);
    await testDb.open();
  });

  describe('1. Dynamic Quotation Calculations', () => {
    it('accurately calculates item totals and subtotal', () => {
      const items = [
        { id: '1', name: 'UI/UX Design', quantity: 1, unitPrice: 15000 },
        { id: '2', name: 'Frontend Development', quantity: 2, unitPrice: 20000 },
      ];
      const res = calculateQuotationTotals(items);
      expect(res.subtotal).toBe(55000);
      expect(res.discountAmount).toBe(0);
      expect(res.totalAmount).toBe(55000);
    });

    it('calculates percentage discounts accurately', () => {
      const items = [{ id: '1', name: 'Full Web App', quantity: 1, unitPrice: 50000 }];
      const res = calculateQuotationTotals(items, { type: 'percentage', value: 10 });
      expect(res.subtotal).toBe(50000);
      expect(res.discountAmount).toBe(5000);
      expect(res.totalAmount).toBe(45000);
    });

    it('calculates fixed amount discounts and clamps to subtotal', () => {
      const items = [{ id: '1', name: 'Landing Page', quantity: 1, unitPrice: 20000 }];
      const res = calculateQuotationTotals(items, { type: 'fixed', value: 5000 });
      expect(res.subtotal).toBe(20000);
      expect(res.discountAmount).toBe(5000);
      expect(res.totalAmount).toBe(15000);

      // Clamp excess discount
      const resCapped = calculateQuotationTotals(items, { type: 'fixed', value: 30000 });
      expect(resCapped.discountAmount).toBe(20000);
      expect(resCapped.totalAmount).toBe(0);
    });
  });

  describe('2. Web Dev Client & Linked Project Creation', () => {
    it('creates web development client, project, quotation and initial token payment', async () => {
      const result = await clientsRepo.createWebDevClient(
        {
          name: 'Vikram Malhotra',
          businessName: 'Malhotra Logistics',
          email: 'vikram@malhotralogistics.in',
          phone: '9812345678',
          projectName: 'Logistics Fleet Tracking Portal',
          projectDescription: 'Next.js admin dashboard and live driver tracking map',
          startDate: '2026-11-01',
          deliveryDate: '2026-11-25',
          items: [
            { id: 'item_1', name: 'Core Dashboard & Auth', quantity: 1, unitPrice: 30000 },
            { id: 'item_2', name: 'Map & Live Tracking API', quantity: 1, unitPrice: 20000 },
          ],
          discountType: 'percentage',
          discountValue: 10,
          tokenPaid: 15000,
          paymentTerms: '50% advance, 50% on final UAT',
        },
        testDb
      );

      expect(result.client.id).toBeDefined();
      expect(result.client.clientType).toBe('web_development');
      expect(result.client.category).toBe('web_dev');
      expect(result.client.totalProjectCost).toBe(45000); // 50000 - 10%
      expect(result.client.tokenPaid).toBe(15000);
      expect(result.client.remainingAmount).toBe(30000);
      expect(result.client.paymentStatus).toBe('partially_paid');
      expect(result.client.deliveryStatus).toBe('planning');

      // Verify Project record created in projects table
      const project = await testDb.projects.get(result.project.id);
      expect(project).toBeDefined();
      expect(project.clientId).toBe(result.client.id);
      expect(project.name).toBe('Logistics Fleet Tracking Portal');
      expect(project.agreedAmount).toBe(45000);
      expect(project.remainingBalance).toBe(30000);

      // Verify Quotation record created in quotations table
      const quotation = await quotationsRepo.getById(result.quotation.id, testDb);
      expect(quotation).toBeDefined();
      expect(quotation.totalAmount).toBe(45000);
      expect(quotation.advanceReceived).toBe(15000);
      expect(quotation.remainingBalance).toBe(30000);

      // Verify Advance Token recorded in payments table
      const payments = await paymentsRepo.getAll({ clientId: result.client.id }, testDb);
      expect(payments.length).toBe(1);
      expect(payments[0].amount).toBe(15000);
      expect(payments[0].projectId).toBe(result.project.id);
    });

    it('rejects negative token and excess token payments', async () => {
      await expect(
        clientsRepo.createWebDevClient(
          {
            name: 'Invalid Token',
            businessName: 'Business A',
            email: 'a@a.com',
            phone: '1111111111',
            projectName: 'Project A',
            items: [{ name: 'Task', quantity: 1, unitPrice: 10000 }],
            tokenPaid: -100,
          },
          testDb
        )
      ).rejects.toThrow('Advance/token payment cannot be negative');

      await expect(
        clientsRepo.createWebDevClient(
          {
            name: 'Excess Token',
            businessName: 'Business B',
            email: 'b@b.com',
            phone: '2222222222',
            projectName: 'Project B',
            items: [{ name: 'Task', quantity: 1, unitPrice: 10000 }],
            tokenPaid: 15000,
          },
          testDb
        )
      ).rejects.toThrow('Advance/token payment cannot exceed total project cost');
    });
  });

  describe('3. Web Dev Project Payments & Balance Updates', () => {
    it('records milestone payments and updates project and client ledgers', async () => {
      const { client, project } = await clientsRepo.createWebDevClient(
        {
          name: 'Ananya Roy',
          businessName: 'Roy Jewels',
          email: 'ananya@royjewels.com',
          phone: '9988776655',
          projectName: 'Jewelry E-Commerce Store',
          items: [{ name: 'Shopify Store Setup', quantity: 1, unitPrice: 30000 }],
          tokenPaid: 10000,
        },
        testDb
      );

      expect(client.remainingAmount).toBe(20000);
      expect(client.paymentStatus).toBe('partially_paid');

      // Record first milestone payment of ₹10,000
      const afterFirstPay = await clientsRepo.recordWebDevPayment(
        client.id,
        {
          amount: 10000,
          paymentMethod: 'upi',
          paidAt: '2026-11-10',
          notes: 'Milestone 1 Payment after Design Approval',
        },
        testDb
      );

      expect(afterFirstPay.additionalPaid).toBe(10000);
      expect(afterFirstPay.totalPaid).toBe(20000);
      expect(afterFirstPay.remainingAmount).toBe(10000);
      expect(afterFirstPay.paymentStatus).toBe('partially_paid');

      // Verify Project table was updated in sync
      const updatedProject = await testDb.projects.get(project.id);
      expect(updatedProject.additionalPaid).toBe(10000);
      expect(updatedProject.remainingBalance).toBe(10000);

      // Record final payment of ₹10,000
      const afterFinalPay = await clientsRepo.recordWebDevPayment(
        client.id,
        {
          amount: 10000,
          paymentMethod: 'bank_transfer',
          notes: 'Final Handover Payment',
        },
        testDb
      );

      expect(afterFinalPay.totalPaid).toBe(30000);
      expect(afterFinalPay.remainingAmount).toBe(0);
      expect(afterFinalPay.paymentStatus).toBe('paid');

      // Verify payment cannot exceed remaining balance (0)
      await expect(
        clientsRepo.recordWebDevPayment(
          client.id,
          {
            amount: 500,
            paymentMethod: 'cash',
          },
          testDb
        )
      ).rejects.toThrow('cannot exceed remaining balance');
    });
  });

  describe('4. Delivery Status & Deliverables Tracking', () => {
    it('updates project delivery status and marks completed', async () => {
      const { client, project } = await clientsRepo.createWebDevClient(
        {
          name: 'Karan Joshi',
          businessName: 'Joshi Automations',
          email: 'karan@joshi.io',
          phone: '9123456789',
          projectName: 'IoT Control Hub',
          items: [{ name: 'Web Dashboard', quantity: 1, unitPrice: 40000 }],
        },
        testDb
      );

      expect(client.deliveryStatus).toBe('planning');

      // Move to in_progress
      const updated = await clientsRepo.updateWebDevDeliveryStatus(client.id, 'in_progress', testDb);
      expect(updated.deliveryStatus).toBe('in_progress');

      // Move to completed
      const completed = await clientsRepo.updateWebDevDeliveryStatus(client.id, 'completed', testDb);
      expect(completed.deliveryStatus).toBe('completed');
      expect(completed.status).toBe('completed');

      const proj = await testDb.projects.get(project.id);
      expect(proj.status).toBe('completed');
      expect(proj.completedAt).toBeDefined();
    });

    it('toggles deliverable milestones and adds custom deliverables', async () => {
      const { client } = await clientsRepo.createWebDevClient(
        {
          name: 'Meera Rao',
          businessName: 'Rao Academy',
          email: 'meera@rao.edu',
          phone: '9876500000',
          projectName: 'LMS Platform',
          items: [{ name: 'Course Platform', quantity: 1, unitPrice: 35000 }],
        },
        testDb
      );

      expect(client.deliverables.length).toBeGreaterThan(0);
      const firstDelId = client.deliverables[0].id;

      // Toggle deliverable
      const toggled = await clientsRepo.toggleProjectDeliverable(client.id, firstDelId, false, testDb);
      const del = toggled.deliverables.find((d) => d.id === firstDelId);
      expect(del.status).toBe('pending');

      // Add custom deliverable
      const withNew = await clientsRepo.addProjectDeliverable(
        client.id,
        'Razorpay Subscriptions Integration',
        testDb
      );
      expect(withNew.deliverables.some((d) => d.title === 'Razorpay Subscriptions Integration')).toBe(true);
    });
  });

  describe('5. Project Documents Management', () => {
    it('adds and removes project links (Figma, GitHub, Staging)', async () => {
      const { client } = await clientsRepo.createWebDevClient(
        {
          name: 'Arjun Das',
          businessName: 'Das Tech',
          email: 'arjun@dastech.com',
          phone: '9800000000',
          projectName: 'SaaS App',
          items: [{ name: 'App Design & Code', quantity: 1, unitPrice: 50000 }],
        },
        testDb
      );

      // Add Figma link
      const withFigma = await clientsRepo.addProjectDocument(
        client.id,
        {
          title: 'Figma UI Mockup',
          type: 'figma',
          url: 'https://figma.com/file/12345',
        },
        testDb
      );

      expect(withFigma.documents.length).toBe(1);
      expect(withFigma.documents[0].title).toBe('Figma UI Mockup');
      expect(withFigma.documents[0].url).toBe('https://figma.com/file/12345');

      const docId = withFigma.documents[0].id;

      // Remove document
      const afterRemove = await clientsRepo.removeProjectDocument(client.id, docId, testDb);
      expect(afterRemove.documents.length).toBe(0);
    });
  });

  describe('6. Web Development Email Templates', () => {
    it('generates onboarding & quotation email with exact figures, line items, and clickable links', () => {
      const client = {
        name: 'Gaurav Kapoor',
        businessName: 'Kapoor Travels',
        email: 'gaurav@kapoor.com',
        projectName: 'Tour Booking Engine',
        totalProjectCost: 60000,
        tokenPaid: 20000,
        remainingAmount: 40000,
        documents: [
          {
            id: 'doc_1',
            title: 'Figma UI Mockup',
            type: 'figma',
            url: 'https://figma.com/file/mockup123',
          },
          {
            id: 'doc_2',
            title: 'GitHub Repository',
            type: 'github',
            url: 'https://github.com/kapoor/tour-engine',
          },
        ],
      };

      const quotation = {
        quotationNumber: 'QT-WEB-202610-1234',
        items: [
          { name: 'Search & Booking UI (see https://preview.kapoor.com)', quantity: 1, unitPrice: 35000, total: 35000 },
          { name: 'Payment Gateway Integration', quantity: 1, unitPrice: 25000, total: 25000 },
        ],
        totalAmount: 60000,
        paymentTerms: '50% advance, 50% upon delivery via https://kapoor.com/terms',
      };

      const html = buildWebDevOnboardingEmailHtml({
        client,
        project: { name: 'Tour Booking Engine', startDate: '2026-11-01', deadline: '2026-11-20' },
        quotation,
        advanceAmount: 20000,
        remainingAmount: 40000,
      });

      expect(html).toContain('Gaurav Kapoor');
      expect(html).toContain('Kapoor Travels');
      expect(html).toContain('Tour Booking Engine');
      expect(html).toContain('QT-WEB-202610-1234');
      expect(html).toContain('60,000');
      expect(html).toContain('20,000');
      expect(html).toContain('40,000');
      expect(html).toContain('Search & Booking UI');

      // Verify clickable document links
      expect(html).toContain('href="https://figma.com/file/mockup123"');
      expect(html).toContain('Figma UI Mockup');
      expect(html).toContain('href="https://github.com/kapoor/tour-engine"');
      expect(html).toContain('Open Link &rarr;');

      // Verify autolink in description and payment terms
      expect(html).toContain('href="https://preview.kapoor.com"');
      expect(html).toContain('href="https://kapoor.com/terms"');

      // Verify UPI payment link
      expect(html).toContain('upi://pay?');
      expect(html).toContain('Tap to Pay ₹40,000 via UPI');
    });

    it('generates owner notification and delivery completion emails with clickable links', () => {
      const client = {
        name: 'Neha Sen',
        businessName: 'Sen Architecture',
        projectName: 'Portfolio Website',
        totalProjectCost: 30000,
        tokenPaid: 15000,
        remainingAmount: 15000,
        email: 'neha@sen.com',
        phone: '9888888888',
        documents: [
          {
            id: 'doc_1',
            title: 'Production Staging',
            type: 'staging',
            url: 'https://staging.senarch.com',
          },
        ],
      };

      const ownerHtml = buildWebDevOwnerEmailHtml({
        client,
        project: { name: 'Portfolio Website', deadline: '2026-11-15' },
        advanceAmount: 15000,
        remainingAmount: 15000,
      });

      expect(ownerHtml).toContain('Neha Sen');
      expect(ownerHtml).toContain('Portfolio Website');
      expect(ownerHtml).toContain('30,000');
      expect(ownerHtml).toContain('href="https://staging.senarch.com"');

      const deliveryHtml = buildWebDevDeliveryEmailHtml({
        client,
        project: { name: 'Portfolio Website' },
        remainingAmount: 0,
      });

      expect(deliveryHtml).toContain('Neha Sen');
      expect(deliveryHtml).toContain('Portfolio Website');
      expect(deliveryHtml).toContain('Payment Cleared');
      expect(deliveryHtml).toContain('href="https://staging.senarch.com"');
    });
  });

  describe('7. Quotation Builder UI Component', () => {
    it('renders quotation line items and computes totals correctly', () => {
      let items = [
        { id: '1', name: 'UI Design', quantity: 1, unitPrice: 10000, total: 10000 },
      ];
      let discount = { type: 'none', value: 0 };
      let token = '5000';

      const { container } = render(
        <QuotationBuilder
          items={items}
          onChangeItems={(newItems) => (items = newItems)}
          discount={discount}
          onChangeDiscount={(newDisc) => (discount = newDisc)}
          tokenPaid={token}
          onChangeTokenPaid={(newToken) => (token = newToken)}
        />
      );

      expect(screen.getByDisplayValue('UI Design')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
      expect(screen.getByText('Quotation & Payment Breakdown')).toBeInTheDocument();
    });
  });

  describe('8. Quotation Modal PDF Preview', () => {
    it('renders printable quotation modal with official branding and line items', () => {
      const client = {
        name: 'Rohan Sharma',
        businessName: 'Sharma Foods',
        email: 'rohan@sharmafoods.in',
        phone: '9876543210',
        projectName: 'Restaurant Ordering Web App',
        totalProjectCost: 40000,
        tokenPaid: 20000,
        remainingAmount: 20000,
        quotationNumber: 'QT-WEB-9999',
        quotationItems: [
          { name: 'Online Menu & Cart', quantity: 1, unitPrice: 40000, total: 40000 },
        ],
      };

      render(
        <QuotationModal
          client={client}
          quotation={{
            quotationNumber: 'QT-WEB-9999',
            projectName: 'Restaurant Ordering Web App',
            items: client.quotationItems,
            totalAmount: 40000,
            advanceReceived: 20000,
            remainingBalance: 20000,
          }}
          isOpen={true}
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Quotation #QT-WEB-9999')).toBeInTheDocument();
      expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
      expect(screen.getByText('Restaurant Ordering Web App')).toBeInTheDocument();
      expect(screen.getByText('Print / Save PDF')).toBeInTheDocument();
    });
  });
});
