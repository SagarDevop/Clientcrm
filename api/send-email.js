/**
 * Vercel Serverless Function: /api/send-email
 * Dispatches transactional emails via Brevo HTTP API
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { toEmail, toName, subject, htmlContent } = body;

    if (!toEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderName = process.env.SENDER_NAME || 'Jugarr Agency';
    const senderEmail = process.env.SENDER_EMAIL || 'warshasingh21@gmail.com';

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'BREVO_API_KEY is not configured',
      });
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
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
        to: [{ email: toEmail, name: toName || toEmail }],
        subject: subject || 'BizCRM Notification',
        htmlContent: htmlContent || `<p>${subject}</p>`,
      }),
    });

    const data = await brevoResponse.json().catch(() => ({}));

    if (!brevoResponse.ok) {
      return res.status(brevoResponse.status).json({
        success: false,
        error: data.message || `Brevo API returned status ${brevoResponse.status}`,
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.messageId,
      ...data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  }
}
