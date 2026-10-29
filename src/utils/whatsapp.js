import { buildUpiLink, getSavedUpiId, getSavedUpiName } from './upi.js';

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
  // BizCRM 3 Smart Templates
  onboardingWelcome: ({ clientName, businessName, packageName, startDate, completionDate, planAmount, tokenPaid, remainingAmount, currency = '₹' }) =>
    `Hello ${clientName || 'there'}, welcome onboard! 🚀\n\nWe are excited to start working with *${businessName || 'your business'}*. Your service plan has officially started.\n\n📋 *Plan Details:*\n• Service: *${packageName || 'Monthly Service Package'}*\n• Monthly Plan: *${currency}${Number(planAmount || 0).toLocaleString()}*\n• Token Received: *${currency}${Number(tokenPaid || 0).toLocaleString()}*\n• Remaining Due: *${currency}${Number(remainingAmount || 0).toLocaleString()}*\n• Service Period: *${startDate || 'Today'}* to *${completionDate || '1 Month'}*\n\nPlease feel free to reach out anytime. Looking forward to driving great results together!\n\nBest regards,\n*Jugarr Agency*`,

  balanceDue: ({ clientName, businessName, planAmount, remainingAmount, completionDate, upiLink, upiId, currency = '₹' }) => {
    let msg = `Hi ${clientName || 'there'},\n\nHope you are having a productive week! This is a gentle reminder regarding the remaining balance for your monthly service plan for *${businessName || 'your business'}*.\n\n💰 *Payment Details:*\n• Monthly Plan: *${currency}${Number(planAmount || 0).toLocaleString()}*\n• Remaining Due: *${currency}${Number(remainingAmount || 0).toLocaleString()}*\n• Plan Active Till: *${completionDate || 'Month End'}*`;

    if (upiLink && upiId) {
      msg += `\n\n📲 *Pay Instantly via UPI (GPay / PhonePe / Paytm):*\nUPI ID: *${upiId}*\n${upiLink}`;
    }

    msg += `\n\nKindly share the confirmation once the remaining amount is transferred. Please let us know if you need our bank or account details.\n\nThank you,\n*Jugarr Agency*`;
    return msg;
  },

  renewal: ({ clientName, businessName, packageName, planAmount, completionDate, currency = '₹' }) =>
    `Hello ${clientName || 'there'},\n\nWe would like to remind you that your monthly service plan for *${businessName || 'your business'}* is completing on *${completionDate || 'soon'}*.\n\n🎯 *Renewal Summary:*\n• Service: *${packageName || 'Monthly Service Plan'}*\n• Next Month Retainer: *${currency}${Number(planAmount || 0).toLocaleString()}*\n\nWe would love to continue managing your services for next month! Please confirm your renewal so we can reserve your slot and maintain seamless continuation.\n\nWarm regards,\n*Jugarr Agency*`,

  // Legacy fallback templates
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

  webDevQuotation: ({ clientName, businessName, projectName, quotationNumber, totalCost, advancePaid, remainingBalance, deliveryDate, upiLink, upiId, currency = '₹' }) => {
    let msg = `Hello ${clientName || 'there'}! 🚀\n\nHere is your official Web Development project quotation for *${businessName || 'your business'}*.\n\n📋 *Project & Quotation Summary:*\n• Project: *${projectName || 'Web Development'}*\n• Quotation #: *${quotationNumber || 'QT-WEB'}*\n• Total Project Cost: *${currency}${Number(totalCost || 0).toLocaleString()}*\n• Advance Received: *${currency}${Number(advancePaid || 0).toLocaleString()}*\n• Remaining Due: *${currency}${Number(remainingBalance || 0).toLocaleString()}*\n• Expected Delivery: *${deliveryDate || 'Scheduled'}*`;
    if (remainingBalance > 0 && upiLink && upiId) {
      msg += `\n\n📲 *Pay via UPI:*\nUPI ID: *${upiId}*\n${upiLink}`;
    }
    msg += `\n\nPlease let us know if you have any questions or when you are ready to proceed!\n\nBest regards,\n*Jugarr Agency*`;
    return msg;
  },
};

export function getClientWhatsAppMessage(templateKey, client) {
  if (!client) return '';
  const isWebDev = client.clientType === 'web_development' || client.category === 'web_dev';
  const planAmount = Number(isWebDev ? (client.totalProjectCost || client.agreedAmount || 0) : (client.monthlyPlanAmount || 0));
  const tokenPaid = Number(client.tokenPaid || client.advancePaid || 0);
  const additionalPaid = Number(client.additionalPaid || 0);
  const totalPaid = Number(client.totalPaid || tokenPaid + additionalPaid);
  const remainingAmount = Number(client.remainingAmount !== undefined ? client.remainingAmount : Math.max(0, planAmount - totalPaid));
  const packageName = isWebDev
    ? client.projectName || 'Web Development Project'
    : client.packageDescription?.slice(0, 50) || 'Monthly Service Package';

  const upiId = getSavedUpiId();
  const upiName = getSavedUpiName();
  const upiLink = buildUpiLink({
    upiId,
    payeeName: upiName,
    amount: remainingAmount,
    transactionNote: `Payment - ${client.name}`,
  });

  const data = {
    clientName: client.name,
    businessName: client.businessName,
    packageName,
    projectName: client.projectName || packageName,
    quotationNumber: client.quotationNumber || 'QT-WEB',
    totalCost: planAmount,
    advancePaid: tokenPaid,
    remainingBalance: remainingAmount,
    startDate: client.startDate,
    deliveryDate: client.deliveryDate || client.completionDate,
    completionDate: client.completionDate || client.deliveryDate,
    planAmount,
    tokenPaid,
    remainingAmount,
    upiId,
    upiLink,
    currency: '₹',
  };

  if (isWebDev) {
    if (templateKey === 'quotation' || templateKey === 'onboarding') {
      return WHATSAPP_TEMPLATES.webDevQuotation(data);
    }
    if (templateKey === 'balance') {
      return WHATSAPP_TEMPLATES.balanceDue(data);
    }
    return WHATSAPP_TEMPLATES.webDevQuotation(data);
  }

  switch (templateKey) {
    case 'onboarding':
      return WHATSAPP_TEMPLATES.onboardingWelcome(data);
    case 'balance':
      return WHATSAPP_TEMPLATES.balanceDue(data);
    case 'renewal':
    default:
      return WHATSAPP_TEMPLATES.renewal(data);
  }
}
