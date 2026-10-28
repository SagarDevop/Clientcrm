/**
 * Vercel Serverless Function: /api/health
 * Returns health and configuration status of email dispatcher
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-brevo-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasApiKey = Boolean(process.env.BREVO_API_KEY || req.headers?.['x-brevo-key']);

  return res.status(200).json({
    status: 'ok',
    service: 'BizCRM Vercel Email Dispatcher',
    provider: hasApiKey ? 'brevo' : 'unconfigured',
    isConfigured: hasApiKey,
    senderEmail: process.env.SENDER_EMAIL || 'warshasingh21@gmail.com',
    senderName: process.env.SENDER_NAME || 'Jugarr Agency',
    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  });
}
