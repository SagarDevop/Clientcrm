/**
 * BizCRM Indian UPI Payment Integration
 * 100% Free, Zero-Gateway Commission, Direct Bank Settlement via NPCI UPI Protocol
 */

export const DEFAULT_UPI_ID = 'warshasingh21@okaxis';
export const DEFAULT_UPI_NAME = 'Jugarr Agency';

export function getSavedUpiId() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bizcrm_upi_id');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_UPI_ID;
}

export function getSavedUpiName() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bizcrm_upi_name');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_UPI_NAME;
}

/**
 * Builds official NPCI UPI Deep Link / URI Intent
 * Standard: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
 */
export function buildUpiLink({
  upiId = getSavedUpiId(),
  payeeName = getSavedUpiName(),
  amount = 0,
  transactionNote = 'Monthly Service Retainer',
}) {
  if (!upiId) return '';

  const cleanId = upiId.trim();
  const cleanName = payeeName.trim();
  const cleanNote = (transactionNote || '').trim().slice(0, 40);

  const params = [
    `pa=${encodeURIComponent(cleanId)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `cu=INR`,
  ];

  if (amount > 0) {
    params.push(`am=${encodeURIComponent(String(amount))}`);
  }

  if (cleanNote) {
    params.push(`tn=${encodeURIComponent(cleanNote)}`);
  }

  return `upi://pay?${params.join('&')}`;
}

/**
 * Generates dynamic high-resolution QR Code image URL for any UPI string
 */
export function getUpiQrCodeUrl(upiLink, size = 200) {
  if (!upiLink) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiLink)}&margin=4`;
}
