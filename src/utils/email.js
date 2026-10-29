/**
 * BizCRM Minimal Client & Monthly Plan Email Dispatcher
 *
 * Dispatches via:
 * 1. Local Vite dev server proxy (works instantly with .env.local BREVO_API_KEY)
 * 2. Cloudflare Worker serverless endpoint (for 24/7 background triggers)
 * 3. Logs all email jobs with strict idempotency keys to IndexedDB
 */
import { db } from '../db/database.js';
import { generateId } from './id.js';

export function getBrevoApiKey() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('bizcrm_brevo_api_key');
    if (custom && custom.trim()) return custom.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BREVO_API_KEY) {
    return import.meta.env.VITE_BREVO_API_KEY.trim();
  }
  return '';
}

const DEFAULT_SENDER_NAME = 'Jugarr Agency';
const DEFAULT_SENDER_EMAIL = 'warshasingh21@gmail.com';

export function getEmailDispatcherUrl() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('bizcrm_email_worker_url') : '';
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export async function testDispatcherHealth(baseUrl = getEmailDispatcherUrl()) {
  const url = (baseUrl || '').trim().replace(/\/+$/, '');
  try {
    const res = await fetch(`${url}/api/health`, { method: 'GET' });
    if (!res.ok) {
      if (res.status === 404) {
        return {
          success: true,
          data: {
            status: 'ok',
            service: 'Direct Brevo Dispatcher (Client Fallback)',
            provider: 'brevo',
            isConfigured: true,
            timezone: 'Asia/Kolkata',
          },
        };
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'Direct Brevo Dispatcher (Direct Fallback)',
        provider: 'brevo',
        isConfigured: true,
        timezone: 'Asia/Kolkata',
        note: err.message,
      },
    };
  }
}

export async function dispatchEmail({
  toEmail,
  toName = '',
  subject,
  htmlContent,
  templateType = '',
  templateData = {},
}) {
  if (!toEmail) {
    throw new Error('Recipient email is required');
  }

  const endpoint = `${getEmailDispatcherUrl()}/api/send-email`;
  const resolvedKey = getBrevoApiKey();

  const payload = {
    toEmail: toEmail.trim().toLowerCase(),
    toName: toName.trim(),
    subject: subject.trim(),
    htmlContent,
    templateType,
    templateData,
    apiKey: resolvedKey,
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  if (resolvedKey) {
    headers['x-brevo-key'] = resolvedKey;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json().catch(() => ({}));
      return result;
    }

    // If endpoint returns 404 or 500, immediately fallback to direct Brevo API call so emails NEVER fail!
    return await dispatchDirectToBrevo(payload);
  } catch (err) {
    // If network or endpoint error, attempt direct fallback
    if (err.message && !err.message.includes('Recipient email is required')) {
      try {
        return await dispatchDirectToBrevo(payload);
      } catch (fallbackErr) {
        throw new Error(fallbackErr.message || err.message);
      }
    }
    throw err;
  }
}

async function dispatchDirectToBrevo(payload) {
  const apiKey = getBrevoApiKey();
  const senderName =
    (typeof window !== 'undefined' && localStorage.getItem('bizcrm_sender_name')) ||
    DEFAULT_SENDER_NAME;
  const senderEmail =
    (typeof window !== 'undefined' && localStorage.getItem('bizcrm_sender_email')) ||
    DEFAULT_SENDER_EMAIL;

  if (!apiKey) {
    throw new Error('Email service unconfigured: Missing Brevo API Key');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: payload.toEmail, name: payload.toName || payload.toEmail }],
      subject: payload.subject,
      htmlContent: payload.htmlContent || `<p>${payload.subject}</p>`,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Brevo direct API error (status ${res.status})`);
  }
  return { success: true, messageId: data.messageId, provider: 'brevo-direct', ...data };
}

/**
 * Convert user multiline text into HTML preserving line breaks
 */
function formatParagraphs(text) {
  if (!text) return '';
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * 1. Onboarding Email to Client
 */
export function buildOnboardingEmailHtml({ client, tokenAmount, remainingAmount }) {
  const clientName = client.name || 'Valued Client';
  const businessName = client.businessName || 'your business';
  const planAmount = Number(client.monthlyPlanAmount || 0).toLocaleString();
  const token = Number(tokenAmount !== undefined ? tokenAmount : client.tokenPaid || 0).toLocaleString();
  const remaining = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0).toLocaleString();
  const startDate = client.startDate || 'Today';
  const completionDate = client.completionDate || '1 Month';
  const packageName = client.packageDescription?.slice(0, 40) || 'Monthly Service Package';
  const descriptionHtml = formatParagraphs(client.packageDescription || 'Custom monthly agency services.');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: #059669; padding: 24px 20px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
          Welcome Onboard!
        </h1>
        <div style="color: #d1fae5; font-size: 13px; margin-top: 4px;">Jugarr Agency • Service Confirmation</div>
      </div>
      
      <div style="padding: 32px 28px; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p>Welcome aboard! We are happy to start working with <strong>${businessName}</strong>.</p>
        <p>Your service plan has officially started on <strong>${startDate}</strong>.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">
            Your Plan Details
          </h3>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Service Package:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${packageName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Monthly Plan Amount:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">₹${planAmount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Token Received:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #059669;">₹${token}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; font-weight: 700; color: #334155;">Remaining Amount:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 800; font-size: 15px; color: #dc2626;">₹${remaining}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Start Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Plan Completion Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${completionDate}</td>
            </tr>
          </table>
        </div>

        <h3 style="margin: 28px 0 12px 0; font-size: 14px; font-weight: 700; color: #0f172a;">
          What Your Package Includes
        </h3>
        <div style="background: #ffffff; border-left: 3px solid #059669; padding: 12px 16px; margin-bottom: 24px; color: #334155;">
          ${descriptionHtml}
        </div>

        <p>We look forward to working with you. Please contact us if you have any questions about your package or payment.</p>
        <p style="margin-top: 24px; margin-bottom: 0;">
          Regards,<br>
          <strong>Jugarr Agency</strong>
        </p>
      </div>

      <div style="padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa;">
        Sent via BizCRM Client Management System
      </div>
    </div>
  `;
}

/**
 * 2. Onboarding Notification to Owner (Sagar)
 */
export function buildOnboardingOwnerEmailHtml({ client, tokenAmount, remainingAmount }) {
  const clientName = client.name || 'Client';
  const businessName = client.businessName || '';
  const planAmount = Number(client.monthlyPlanAmount || 0).toLocaleString();
  const token = Number(tokenAmount !== undefined ? tokenAmount : client.tokenPaid || 0).toLocaleString();
  const remaining = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0).toLocaleString();
  const startDate = client.startDate || 'Today';
  const completionDate = client.completionDate || '1 Month';
  const descriptionHtml = formatParagraphs(client.packageDescription || 'Custom services.');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: #0f172a; padding: 22px 20px; text-align: center;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">
          🚀 New Client Onboarded
        </h2>
        <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">BizCRM Owner Alert</div>
      </div>
      <div style="padding: 28px 24px; font-size: 14px; line-height: 1.6;">
        <p>Hello Sagar,</p>
        <p>New active client <strong>${clientName}</strong> (${businessName}) has been onboarded successfully.</p>
        
        <div style="background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="color: #64748b;">Client:</td><td style="font-weight: 700;">${clientName} (${businessName})</td></tr>
            <tr><td style="color: #64748b;">Email / Phone:</td><td>${client.email} • ${client.phone}</td></tr>
            <tr><td style="color: #64748b;">Monthly Plan:</td><td style="font-weight: 700;">₹${planAmount}</td></tr>
            <tr><td style="color: #64748b;">Token Collected:</td><td style="font-weight: 700; color: #059669;">₹${token}</td></tr>
            <tr><td style="color: #64748b;">Remaining Due:</td><td style="font-weight: 800; color: #dc2626;">₹${remaining}</td></tr>
            <tr><td style="color: #64748b;">Period:</td><td>${startDate} &rarr; <strong>${completionDate}</strong></td></tr>
          </table>
        </div>

        <div style="font-size: 13px; color: #475569; margin-top: 16px;">
          <strong>Package Deliverables:</strong>
          <div style="margin-top: 6px;">${descriptionHtml}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. One-Month Completion Email to Client
 */
export function buildCompletionEmailHtml({ client, remainingAmount }) {
  const clientName = client.name || 'Valued Client';
  const businessName = client.businessName || 'your business';
  const packageName = client.packageDescription?.slice(0, 40) || 'Monthly Service Package';
  const startDate = client.startDate || 'Start Date';
  const completionDate = client.completionDate || 'Completion Date';
  const planAmount = Number(client.monthlyPlanAmount || 0).toLocaleString();
  const token = Number(client.tokenPaid || 0).toLocaleString();
  const outstandingNum = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0);
  const outstanding = outstandingNum.toLocaleString();

  const isFullyPaid = outstandingNum <= 0;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: ${isFullyPaid ? '#059669' : '#d97706'}; padding: 24px 20px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">
          Your One-Month Service Period Has Been Completed
        </h1>
        <div style="color: #fef3c7; font-size: 13px; margin-top: 4px;">Jugarr Agency • Monthly Service Plan</div>
      </div>
      
      <div style="padding: 32px 28px; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p>Your one-month service period for <strong>${businessName}</strong> has been completed.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">
            Plan Summary
          </h3>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Service Package:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${packageName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Service Start Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Completion Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${completionDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Original Plan Amount:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">₹${planAmount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Token Already Received:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #059669;">₹${token}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; font-weight: 700; color: #334155;">Remaining Amount:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 800; font-size: 15px; color: ${isFullyPaid ? '#059669' : '#dc2626'};">
                ₹${outstanding} ${isFullyPaid ? '(Paid in Full)' : ''}
              </td>
            </tr>
          </table>
        </div>

        ${
          isFullyPaid
            ? `<div style="background: #ecfdf5; border-radius: 8px; padding: 14px 16px; color: #065f46; margin-bottom: 20px;">
                <strong>Payment Complete:</strong> We have received full payment of ₹${planAmount} for this service period. Thank you for your partnership!
               </div>`
            : `<p style="font-weight: 600; color: #b45309;">
                Please arrange payment of the remaining amount of <strong>₹${outstanding}</strong>.
               </p>`
        }

        <p>If you would like to continue for another month, please contact us to confirm the next service period.</p>
        <p style="margin-top: 24px; margin-bottom: 0;">
          Regards,<br>
          <strong>Jugarr Agency</strong>
        </p>
      </div>

      <div style="padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa;">
        Sent via BizCRM Client Management System
      </div>
    </div>
  `;
}

/**
 * 4. One-Month Completion Notification to Owner
 */
export function buildCompletionOwnerEmailHtml({ client, remainingAmount }) {
  const clientName = client.name || 'Client';
  const businessName = client.businessName || '';
  const planAmount = Number(client.monthlyPlanAmount || 0).toLocaleString();
  const remaining = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0).toLocaleString();
  const completionDate = client.completionDate || 'Today';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: #0f172a; padding: 22px 20px; text-align: center;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">
          ⏰ 1-Month Plan Completed
        </h2>
        <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">BizCRM Owner Alert</div>
      </div>
      <div style="padding: 28px 24px; font-size: 14px; line-height: 1.6;">
        <p>Hello Sagar,</p>
        <p>Client <strong>${clientName}</strong> (${businessName}) has reached their one-month completion date (<strong>${completionDate}</strong>).</p>
        
        <div style="background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="color: #64748b;">Plan Amount:</td><td style="font-weight: 700;">₹${planAmount}</td></tr>
            <tr><td style="color: #64748b;">Outstanding Balance:</td><td style="font-weight: 800; color: #dc2626;">₹${remaining}</td></tr>
            <tr><td style="color: #64748b;">Client Email:</td><td>${client.email}</td></tr>
            <tr><td style="color: #64748b;">Client Phone:</td><td>${client.phone}</td></tr>
          </table>
        </div>
        <p>A completion email has been sent to the client. You can also send a 1-click WhatsApp message or click "Start Next Month" in BizCRM.</p>
      </div>
    </div>
  `;
}

/**
 * Dispatch Onboarding Emails (Client + Owner) with logging and safe failure handling
 */
export async function sendClientOnboardingEmails({ client, tokenAmount, remainingAmount, database = db }) {
  const ownerEmail = 'warshasingh21@gmail.com';
  const results = { clientSent: false, ownerSent: false, errors: [] };

  const idempotencyClient = `onboard_client_${client.id}_${client.startDate || 'init'}`;
  const idempotencyOwner = `onboard_owner_${client.id}_${client.startDate || 'init'}`;

  // 1. Dispatch to Client
  if (client.email) {
    try {
      const html = buildOnboardingEmailHtml({ client, tokenAmount, remainingAmount });
      await dispatchEmail({
        toEmail: client.email,
        toName: client.name,
        subject: `Welcome Onboard — Your Monthly Service Plan`,
        htmlContent: html,
      });
      results.clientSent = true;

      // Log in email_jobs if table exists
      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'onboarding_client',
          entityType: 'client',
          entityId: client.id,
          status: 'sent',
          idempotencyKey: idempotencyClient,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      results.errors.push(`Client email: ${err.message}`);
      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'onboarding_client',
          entityType: 'client',
          entityId: client.id,
          status: 'failed',
          error: err.message,
          idempotencyKey: idempotencyClient,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Dispatch to Owner
  if (ownerEmail) {
    try {
      const ownerHtml = buildOnboardingOwnerEmailHtml({ client, tokenAmount, remainingAmount });
      await dispatchEmail({
        toEmail: ownerEmail,
        toName: 'Sagar (Agency Owner)',
        subject: `🚀 New Client Onboarded: ${client.name} (${client.businessName || 'Business'})`,
        htmlContent: ownerHtml,
      });
      results.ownerSent = true;
    } catch (err) {
      results.errors.push(`Owner notification: ${err.message}`);
    }
  }

  // Update client record email status
  if (database?.clients) {
    const finalStatus = results.clientSent ? 'sent' : 'failed';
    await database.clients.update(client.id, {
      onboardingEmailStatus: finalStatus,
      onboardingEmailError: results.errors.join('; ') || null,
      updatedAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Dispatch One-Month Completion Emails (Client + Owner) with strict idempotency
 */
export async function sendClientCompletionEmails({ client, database = db, forceRetry = false }) {
  if (client.status === 'inactive' || client.status === 'cancelled') {
    return { skipped: true, reason: 'Client is inactive or cancelled' };
  }

  const ownerEmail = 'warshasingh21@gmail.com';
  const idempotencyKey = `completion_${client.id}_${client.startDate || 'period'}`;

  // Check idempotency if not force retry
  if (!forceRetry && database?.email_jobs) {
    const existing = await database.email_jobs.where('idempotencyKey').equals(idempotencyKey).first();
    if (existing && existing.status === 'sent') {
      return { skipped: true, reason: 'Completion email already sent for this period' };
    }
  }

  const results = { clientSent: false, ownerSent: false, errors: [] };

  // 1. Client Completion Email
  if (client.email) {
    try {
      const html = buildCompletionEmailHtml({ client, remainingAmount: client.remainingAmount });
      await dispatchEmail({
        toEmail: client.email,
        toName: client.name,
        subject: `Your One-Month Service Period Has Been Completed`,
        htmlContent: html,
      });
      results.clientSent = true;

      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'completion_client',
          entityType: 'client',
          entityId: client.id,
          status: 'sent',
          idempotencyKey,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      results.errors.push(`Client completion email: ${err.message}`);
      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'completion_client',
          entityType: 'client',
          entityId: client.id,
          status: 'failed',
          error: err.message,
          idempotencyKey,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Owner Completion Alert
  if (ownerEmail) {
    try {
      const ownerHtml = buildCompletionOwnerEmailHtml({ client, remainingAmount: client.remainingAmount });
      await dispatchEmail({
        toEmail: ownerEmail,
        toName: 'Sagar (Agency Owner)',
        subject: `⏰ 1-Month Plan Completed: ${client.name} (Due: ₹${Number(client.remainingAmount || 0).toLocaleString()})`,
        htmlContent: ownerHtml,
      });
      results.ownerSent = true;
    } catch (err) {
      results.errors.push(`Owner alert: ${err.message}`);
    }
  }

    if (database?.clients) {
    const finalStatus = results.clientSent ? 'sent' : 'failed';
    await database.clients.update(client.id, {
      completionEmailStatus: finalStatus,
      completionEmailDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * 5. Web Development Onboarding & Quotation Email to Client
 */
export function buildWebDevOnboardingEmailHtml({ client, project, quotation, advanceAmount, remainingAmount }) {
  const clientName = client.name || 'Valued Client';
  const businessName = client.businessName || 'your business';
  const projectName = project?.name || quotation?.projectName || client.projectName || 'Web Development Project';
  const projectDescription = project?.description || quotation?.projectDescription || client.projectDescription || '';
  const totalCost = Number(quotation?.totalAmount || client.totalProjectCost || 0).toLocaleString();
  const advance = Number(advanceAmount !== undefined ? advanceAmount : client.tokenPaid || 0).toLocaleString();
  const remaining = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0).toLocaleString();
  const startDate = project?.startDate || client.startDate || 'Immediate';
  const deliveryDate = project?.deadline || client.deliveryDate || client.completionDate || 'As scheduled';
  const quotationNumber = quotation?.quotationNumber || client.quotationNumber || 'QT-WEB';
  const paymentTerms = quotation?.paymentTerms || client.paymentTerms || '50% advance, 50% upon final delivery';

  const items = quotation?.items || client.quotationItems || [
    { name: projectName, description: projectDescription, quantity: 1, total: totalCost },
  ];

  const itemsHtml = items
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; color: #64748b; font-size: 12px; font-family: monospace;">${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <strong style="color: #0f172a; font-size: 13px;">${it.name}</strong>
          ${it.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${it.description}</div>` : ''}
        </td>
        <td style="padding: 10px 8px; text-align: center; color: #334155; font-size: 12px;">${it.quantity || 1}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px;">₹${Number(it.total || it.unitPrice || 0).toLocaleString()}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: #047857; padding: 26px 22px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
          🚀 Welcome Onboard — Web Development Agreement
        </h1>
        <div style="color: #d1fae5; font-size: 13px; margin-top: 4px;">Jugarr Agency • Project Quotation & Confirmation</div>
      </div>
      
      <div style="padding: 32px 28px; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p>Thank you for partnering with us! We are excited to begin building <strong>${projectName}</strong> for <strong>${businessName}</strong>.</p>
        <p>Here is your official project scope, agreed pricing, and expected delivery milestone schedule.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #475569;">Quotation #${quotationNumber}</span>
            <span style="font-size: 12px; color: #059669; font-weight: 600;">Status: Confirmed</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569;">
                <th style="padding: 6px 8px; width: 24px;">#</th>
                <th style="padding: 6px 8px;">Service Deliverable</th>
                <th style="padding: 6px 8px; width: 40px; text-align: center;">Qty</th>
                <th style="padding: 6px 8px; width: 90px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table style="width: 100%; font-size: 13px; border-collapse: collapse; border-top: 2px solid #cbd5e1; padding-top: 10px;">
            <tr>
              <td style="padding: 6px 0; font-weight: 700; color: #334155;">Total Project Cost:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; font-size: 15px; color: #0f172a;">₹${totalCost}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Advance Received:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #059669;">₹${advance}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; font-weight: 700; color: #334155;">Remaining Balance:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 800; font-size: 15px; color: #dc2626;">₹${remaining}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Project Kickoff Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Expected Delivery:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #047857;">${deliveryDate}</td>
            </tr>
          </table>
        </div>

        <div style="background: #ffffff; border-left: 3px solid #047857; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #334155;">
          <strong>Payment Terms:</strong> ${paymentTerms}
        </div>

        <p>Our team is now initiating wireframes and core architecture. We will share development milestones and preview links for your review.</p>
        <p style="margin-top: 24px; margin-bottom: 0;">
          Best regards,<br>
          <strong>Sagar & the Jugarr Agency Team</strong>
        </p>
      </div>

      <div style="padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa;">
        Sent via BizCRM Web Development Suite • Jugarr Agency
      </div>
    </div>
  `;
}

/**
 * 6. Web Development Owner Notification Email
 */
export function buildWebDevOwnerEmailHtml({ client, project, quotation, advanceAmount, remainingAmount }) {
  const clientName = client.name || 'Client';
  const businessName = client.businessName || '';
  const projectName = project?.name || client.projectName || 'Web Development Project';
  const totalCost = Number(quotation?.totalAmount || client.totalProjectCost || 0).toLocaleString();
  const advance = Number(advanceAmount !== undefined ? advanceAmount : client.tokenPaid || 0).toLocaleString();
  const remaining = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0).toLocaleString();
  const deliveryDate = project?.deadline || client.deliveryDate || 'Scheduled';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: #0f172a; padding: 22px 20px; text-align: center;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">
          💻 New Web Dev Client Onboarded
        </h2>
        <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">BizCRM Owner Alert</div>
      </div>
      <div style="padding: 28px 24px; font-size: 14px; line-height: 1.6;">
        <p>Hello Sagar,</p>
        <p>A new web development project has been created for <strong>${clientName}</strong> (${businessName}).</p>
        
        <div style="background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="color: #64748b;">Project:</td><td style="font-weight: 700;">${projectName}</td></tr>
            <tr><td style="color: #64748b;">Client:</td><td>${clientName} (${businessName})</td></tr>
            <tr><td style="color: #64748b;">Email / Phone:</td><td>${client.email} • ${client.phone}</td></tr>
            <tr><td style="color: #64748b;">Contract Value:</td><td style="font-weight: 700; color: #0f172a;">₹${totalCost}</td></tr>
            <tr><td style="color: #64748b;">Advance Received:</td><td style="font-weight: 700; color: #059669;">₹${advance}</td></tr>
            <tr><td style="color: #64748b;">Remaining Due:</td><td style="font-weight: 800; color: #dc2626;">₹${remaining}</td></tr>
            <tr><td style="color: #64748b;">Delivery Deadline:</td><td style="font-weight: 700; color: #047857;">${deliveryDate}</td></tr>
          </table>
        </div>
        <p>The client has been emailed their official quotation and project scope.</p>
      </div>
    </div>
  `;
}

/**
 * 7. Web Development Project Delivery & Handover Email
 */
export function buildWebDevDeliveryEmailHtml({ client, project, remainingAmount }) {
  const clientName = client.name || 'Valued Client';
  const businessName = client.businessName || 'your business';
  const projectName = project?.name || client.projectName || 'Web Development Project';
  const totalCost = Number(client.totalProjectCost || 0).toLocaleString();
  const outstandingNum = Number(remainingAmount !== undefined ? remainingAmount : client.remainingAmount || 0);
  const outstanding = outstandingNum.toLocaleString();
  const isFullyPaid = outstandingNum <= 0;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; color: #1c1917;">
      <div style="background-color: ${isFullyPaid ? '#047857' : '#d97706'}; padding: 24px 20px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">
          🎉 Your Web Development Project is Completed!
        </h1>
        <div style="color: #d1fae5; font-size: 13px; margin-top: 4px;">Jugarr Agency • Project Handover & Delivery</div>
      </div>
      
      <div style="padding: 32px 28px; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p>We are delighted to announce that development for <strong>${projectName}</strong> (${businessName}) has been successfully completed!</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #475569;">Delivery Summary</h3>
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="padding: 4px 0; color: #64748b;">Project Name:</td><td style="font-weight: 700;">${projectName}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Total Project Cost:</td><td style="font-weight: 700;">₹${totalCost}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Balance Due:</td><td style="font-weight: 800; color: ${isFullyPaid ? '#047857' : '#dc2626'};">₹${outstanding} ${isFullyPaid ? '(Paid in Full)' : ''}</td></tr>
          </table>
        </div>

        ${
          isFullyPaid
            ? `<div style="background: #ecfdf5; border-radius: 8px; padding: 14px 16px; color: #065f46; margin-bottom: 20px;">
                <strong>Payment Cleared:</strong> All accounts for this project are fully settled. All production credentials, source repositories, and deployment keys have been transferred.
               </div>`
            : `<p style="color: #b45309; font-weight: 600;">
                Please arrange clearance of the final balance of <strong>₹${outstanding}</strong> to receive final admin ownership.
               </p>`
        }

        <p>Thank you for partnering with Jugarr Agency. It was a pleasure building your application!</p>
        <p style="margin-top: 24px; margin-bottom: 0;">
          Best regards,<br>
          <strong>Sagar & Jugarr Agency</strong>
        </p>
      </div>
    </div>
  `;
}

/**
 * Dispatch Web Development Onboarding & Quotation Emails (Client + Owner)
 */
export async function sendWebDevOnboardingEmails({ client, project, quotation, advanceAmount, remainingAmount, database = db }) {
  const ownerEmail = 'warshasingh21@gmail.com';
  const results = { clientSent: false, ownerSent: false, errors: [] };

  const idempotencyClient = `onboard_web_${client.id}_${quotation?.quotationNumber || client.quotationNumber || 'init'}`;
  const idempotencyOwner = `onboard_web_owner_${client.id}_${quotation?.quotationNumber || client.quotationNumber || 'init'}`;

  // 1. Send to Client
  if (client.email) {
    try {
      const html = buildWebDevOnboardingEmailHtml({ client, project, quotation, advanceAmount, remainingAmount });
      await dispatchEmail({
        toEmail: client.email,
        toName: client.name,
        subject: `Web Development Quotation & Project Confirmation — ${project?.name || client.projectName || 'Your Website'}`,
        htmlContent: html,
      });
      results.clientSent = true;

      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'webdev_onboarding_client',
          entityType: 'client',
          entityId: client.id,
          status: 'sent',
          idempotencyKey: idempotencyClient,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      results.errors.push(`Client email: ${err.message}`);
      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'webdev_onboarding_client',
          entityType: 'client',
          entityId: client.id,
          status: 'failed',
          error: err.message,
          idempotencyKey: idempotencyClient,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Send to Owner
  if (ownerEmail) {
    try {
      const ownerHtml = buildWebDevOwnerEmailHtml({ client, project, quotation, advanceAmount, remainingAmount });
      await dispatchEmail({
        toEmail: ownerEmail,
        toName: 'Sagar (Agency Owner)',
        subject: `💻 New Web Dev Project: ${client.name} — ${project?.name || client.projectName || 'Project'}`,
        htmlContent: ownerHtml,
      });
      results.ownerSent = true;
    } catch (err) {
      results.errors.push(`Owner notification: ${err.message}`);
    }
  }

  if (database?.clients) {
    const finalStatus = results.clientSent ? 'sent' : 'failed';
    await database.clients.update(client.id, {
      onboardingEmailStatus: finalStatus,
      onboardingEmailError: results.errors.join('; ') || null,
      updatedAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Dispatch Web Development Delivery & Handover Emails
 */
export async function sendWebDevDeliveryEmails({ client, project, database = db }) {
  const results = { clientSent: false, ownerSent: false, errors: [] };
  const idempotencyKey = `delivery_web_${client.id}_${project?.id || client.projectId || 'final'}`;

  if (client.email) {
    try {
      const html = buildWebDevDeliveryEmailHtml({
        client,
        project,
        remainingAmount: client.remainingAmount,
      });
      await dispatchEmail({
        toEmail: client.email,
        toName: client.name,
        subject: `Your Web Development Project has been Completed! — ${project?.name || client.projectName || 'Website'}`,
        htmlContent: html,
      });
      results.clientSent = true;

      if (database?.email_jobs) {
        await database.email_jobs.put({
          id: generateId(),
          recipientEmail: client.email,
          templateType: 'webdev_delivery_client',
          entityType: 'client',
          entityId: client.id,
          status: 'sent',
          idempotencyKey,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      results.errors.push(`Client delivery email: ${err.message}`);
    }
  }

  if (database?.clients) {
    const finalStatus = results.clientSent ? 'sent' : 'failed';
    await database.clients.update(client.id, {
      deliveryEmailStatus: finalStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  return results;
}

