/**
 * BizCRM Cloudflare Worker - Automated Email Reminder & Alert Dispatcher
 *
 * 100% Free Serverless Architecture:
 * - Runs on Cloudflare Workers Free Tier (100,000 requests/day free)
 * - Dispatches transactional emails via Brevo Free Tier (300 emails/day = 9,000/mo free forever)
 *   or Resend Free Tier (3,000 emails/mo free).
 * - Secrets stay strictly on Cloudflare Workers environment variables (NEVER in browser client).
 * - Default Business Timezone: Asia/Kolkata
 */

export default {
  /**
   * HTTP Handler for instant trigger (e.g. from CRM client when issuing an invoice or receipt)
   */
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CRM-Client-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health / Status check endpoint
    if (url.pathname === '/api/health') {
      const isConfigured = Boolean((env.BREVO_API_KEY || env.RESEND_API_KEY) && env.SENDER_EMAIL);
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'BizCRM Email Reminder Worker',
          provider: env.RESEND_API_KEY ? 'resend' : env.BREVO_API_KEY ? 'brevo' : 'unconfigured',
          isConfigured,
          timezone: env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Direct email send endpoint
    if (url.pathname === '/api/send-email' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { toEmail, toName, subject, htmlContent, templateType, templateData } = body;

        if (!toEmail || (!htmlContent && !templateType)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required toEmail or email content' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const renderedHtml = htmlContent || renderEmailTemplate(templateType, templateData || {});
        const result = await dispatchEmail(env, {
          toEmail,
          toName: toName || toEmail,
          subject: subject || 'Notice from BizCRM',
          htmlContent: renderedHtml,
        });

        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message || 'Server error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },

  /**
   * Cron Trigger Handler (fires daily, e.g. at 03:00 UTC = 08:30 IST)
   */
  async scheduled(event, env, ctx) {
    console.log(`[BizCRM Worker] Cron job triggered at ${event.cron} (${new Date().toISOString()})`);
    // Automated daily summary digest sent to owner if OWNER_EMAIL is set
    if (env.OWNER_EMAIL && (env.BREVO_API_KEY || env.RESEND_API_KEY)) {
      try {
        await dispatchEmail(env, {
          toEmail: env.OWNER_EMAIL,
          toName: env.SENDER_NAME || 'Agency Owner',
          subject: `BizCRM Daily Alert • ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          htmlContent: renderEmailTemplate('owner_digest', {
            dateStr: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
          }),
        });
      } catch (err) {
        console.error('[BizCRM Worker] Error sending scheduled owner digest:', err);
      }
    }
  },
};

/**
 * Dispatch email via Brevo or Resend HTTP API
 */
async function dispatchEmail(env, { toEmail, toName, subject, htmlContent }) {
  const senderEmail = env.SENDER_EMAIL || 'notifications@youragency.com';
  const senderName = env.SENDER_NAME || 'BizCRM Agency';

  // 1. Resend API
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [toEmail],
        subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, provider: 'resend', error: data.message || 'Resend API error' };
    }
    return { success: true, provider: 'resend', id: data.id };
  }

  // 2. Brevo API (Default Free Tier: 300 emails/day)
  if (env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, provider: 'brevo', error: data.message || 'Brevo API error' };
    }
    return { success: true, provider: 'brevo', messageId: data.messageId };
  }

  return {
    success: false,
    error: 'No email API key configured. Please set BREVO_API_KEY or RESEND_API_KEY in worker secrets.',
  };
}

/**
 * Clean responsive transactional HTML templates
 */
function renderEmailTemplate(type, data) {
  const brandColor = '#059669'; // Emerald-600
  const header = `
    <div style="background-color: #fafaf9; padding: 24px 20px; text-align: center; border-bottom: 1px solid #e7e5e4;">
      <h2 style="margin: 0; color: ${brandColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 800;">
        BizCRM Agency
      </h2>
    </div>
  `;
  const footer = `
    <div style="padding: 20px; text-align: center; font-size: 11px; color: #a8a29e; font-family: sans-serif; border-top: 1px solid #e7e5e4; margin-top: 30px;">
      This transactional email was sent securely via BizCRM Agency Management System.<br>
      To update notification preferences, please contact your agency manager.
    </div>
  `;

  if (type === 'invoice_due') {
    return `
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; font-family: sans-serif;">
        ${header}
        <div style="padding: 30px 24px; color: #1c1917; font-size: 14px; line-height: 1.6;">
          <p>Hello <strong>${data.clientName || 'there'}</strong>,</p>
          <p>This is a friendly reminder that Invoice <strong>#${data.invoiceNumber || ''}</strong> for <strong>₹${Number(data.amount || 0).toLocaleString()}</strong> is due on <strong>${data.dueDate || ''}</strong>.</p>
          <div style="background: #f5f5f4; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <div style="font-size: 12px; color: #78716c; margin-bottom: 4px;">Balance Due</div>
            <div style="font-size: 22px; font-weight: 800; color: ${brandColor};">₹${Number(data.amount || 0).toLocaleString()}</div>
          </div>
          <p>Please find attached or contact us to verify clearance details.</p>
          <p style="margin-top: 24px;">Thank you for your business!<br><strong>BizCRM Agency</strong></p>
        </div>
        ${footer}
      </div>
    `;
  }

  if (type === 'owner_digest') {
    return `
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; font-family: sans-serif;">
        ${header}
        <div style="padding: 30px 24px; color: #1c1917; font-size: 14px; line-height: 1.6;">
          <h3 style="margin-top: 0; color: #1c1917;">Daily Agency Morning Digest</h3>
          <p>Hello Sagar,</p>
          <p>Your automated morning check for <strong>${data.dateStr || ''}</strong> has completed successfully. Open your local PWA workspace to review upcoming milestone deliverables and follow-ups.</p>
        </div>
        ${footer}
      </div>
    `;
  }

  return `
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 24px; font-family: sans-serif;">
      ${header}
      <div style="padding: 20px 0;">
        ${data.message || 'Notification from BizCRM Agency.'}
      </div>
      ${footer}
    </div>
  `;
}
