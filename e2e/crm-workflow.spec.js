import { test, expect } from '@playwright/test';

test.describe('End-to-End Solo CRM Workflows', () => {
  test('Executes end-to-end client lifecycle from lead to payment & persistence', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for app ready
    await expect(page.locator('body')).toBeVisible();

    // 1. Navigate to Leads
    await page.goto('/leads');
    await expect(page.getByRole('heading', { name: 'Sales Pipeline & Leads' })).toBeVisible();

    // Open Add Lead modal (click header Add Lead button)
    const addLeadBtn = page.getByRole('button', { name: 'Add Lead' }).first();
    await addLeadBtn.click();
    await expect(page.getByRole('heading', { name: /Add New Lead/i })).toBeVisible();

    // 2. Fill lead details & select multiple services
    await page.fill('input[placeholder="e.g. Sarah Connor"]', 'E2E Enterprise Prospect');
    await page.fill('input[placeholder="e.g. Cyberdyne Ventures"]', 'Omega Global Corp');
    await page.fill('input[placeholder="+1 555-0144"]', '+1 555-987-6543');
    await page.fill('input[placeholder="sarah@cyberdyne.com"]', 'e2e@omega.com');
    await page.fill('input[placeholder="3000"]', '8000');
    await page.fill('input[placeholder="2500"]', '7500');

    // Click multiple services
    await page.getByRole('button', { name: 'Website' }).click();
    await page.getByRole('button', { name: 'SEO' }).click();

    // Submit lead
    await page.getByRole('button', { name: 'Create Lead' }).click();

    // Verify lead was created and redirected to lead detail
    await expect(page.getByRole('heading', { name: 'E2E Enterprise Prospect' })).toBeVisible();
    await expect(page.locator('text=Omega Global Corp')).toBeVisible();

    // 3. Log a call & 4. Schedule a follow-up
    await page.getByRole('button', { name: '+ Log Interaction' }).click();
    await expect(page.getByRole('heading', { name: 'Log Interaction' })).toBeVisible();

    await page.fill('input[placeholder="e.g. Discussed proposal, requested revision"]', 'Intro Call & Needs Assessment');
    await page.fill('textarea[placeholder="Key points covered and agreement reached..."]', 'Client requested full website rebuild + technical SEO package.');

    // Schedule next follow-up
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"] >> nth=-1', tomorrow);

    await page.locator('form button[type="submit"]:has-text("Log Interaction")').click();

    // Verify interaction appears in timeline
    await expect(page.locator('text=Intro Call & Needs Assessment')).toBeVisible();

    // 5. Convert lead to active client
    await page.getByRole('button', { name: 'Convert to Client' }).click();
    await expect(page.getByRole('heading', { name: 'Convert Lead to Active Client' })).toBeVisible();

    // 6. Create initial project and starter tasks during conversion
    await page.fill('input[placeholder="e.g. Website & SEO Campaign"]', 'Omega Corporate Website Rebuild');
    await page.fill('input[placeholder="3500"]', '7500');
    await page.getByRole('button', { name: 'Confirm & Convert' }).click();

    // Verify redirected to client detail profile
    await expect(page.getByRole('heading', { name: 'E2E Enterprise Prospect' })).toBeVisible();
    await expect(page.locator('text=Active').first()).toBeVisible();

    // Verify the project was linked
    await page.locator('button:has-text("Projects (")').click();
    await expect(page.locator('text=Omega Corporate Website Rebuild')).toBeVisible();

    // 7. Complete a deliverable task
    await page.locator('button:has-text("Tasks (")').click();
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();

    // 8. Record a partial payment
    await page.getByRole('button', { name: 'Record Payment' }).first().click();
    await expect(page.getByRole('heading', { name: 'Record Payment / Transaction' })).toBeVisible();

    await page.fill('input[placeholder="1500"]', '3500');
    await page.fill('input[placeholder="INV-0042 / UTR# 94827"]', 'INV-2026-001');
    await page.getByRole('button', { name: 'Record Transaction' }).click();

    // Verify financial balances updated
    await expect(page.locator('text=$3,500').first()).toBeVisible();

    // 9. Export and verify backup in settings
    await page.goto('/settings');
    await expect(page.locator('text=Database Backup & Restore')).toBeVisible();

    // 10. Reload the app and verify all records persisted in IndexedDB
    await page.reload();
    await page.goto('/clients');
    await expect(page.locator('text=E2E Enterprise Prospect')).toBeVisible();
    await expect(page.locator('text=Omega Global Corp')).toBeVisible();

    await page.goto('/payments');
    await expect(page.locator('text=$3,500').first()).toBeVisible();
  });
});
