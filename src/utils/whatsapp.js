import { normalizePhone } from './id.js';

/**
 * WhatsApp Click-to-Chat Utility
 * Generates official wa.me URLs with prefilled, properly encoded templates.
 * 100% free, zero external API costs, private and manual.
 */

export function cleanWhatsAppNumber(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Default to India country code 91 if 10-digit number is provided without country code
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function generateWhatsAppLink(phone, message) {
  const cleaned = cleanWhatsAppNumber(phone);
  if (!cleaned) return null;
  const encoded = encodeURIComponent(message || '');
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export const WHATSAPP_TEMPLATES = {
  invoiceReminder: ({ clientName, invoiceNumber, amount, dueDate, currency = '₹' }) =>
    `Hello ${clientName || 'there'},\n\nThis is a friendly reminder regarding Invoice *${invoiceNumber}* for *${currency}${amount}*, due on *${dueDate}*.\n\nPlease let us know once the payment has been processed. Thank you for your partnership!`,

  overdueInvoice: ({ clientName, invoiceNumber, amount, dueDate, currency = '₹' }) =>
    `Hello ${clientName || 'there'},\n\nWe noticed that Invoice *${invoiceNumber}* for *${currency}${amount}* was due on *${dueDate}* and remains outstanding.\n\nCould you please confirm when we can expect the clearance? Let us know if you need any assistance or updated bank details.`,

  subscriptionRenewal: ({ clientName, planTitle, amount, renewalDate, currency = '₹' }) =>
    `Hello ${clientName || 'there'},\n\nYour retainer *${planTitle || 'Monthly Retainer'}* for *${currency}${amount}* is up for renewal on *${renewalDate}*.\n\nWe look forward to continuing our work together! Please let us know if you'd like to make any adjustments for next month.`,

  contentReview: ({ clientName, contentTitle, channel, previewUrl }) =>
    `Hello ${clientName || 'there'},\n\nWe have prepared a new deliverable: *${contentTitle}* (${channel || 'Content'}).\n${previewUrl ? `\nYou can review it here: ${previewUrl}\n` : ''}\nPlease let us know if you have any feedback or if it is approved for publishing!`,

  projectMilestone: ({ clientName, projectName, milestoneTitle, amount, currency = '₹' }) =>
    `Hello ${clientName || 'there'},\n\nGreat news! Milestone *${milestoneTitle}* for *${projectName}* is now ready for review.${amount ? ` Milestone amount: *${currency}${amount}*.` : ''}\n\nThank you for working with us!`,
};
