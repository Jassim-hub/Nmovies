/**
 * Phone Number Utilities for Uganda Mobile Money
 * 
 * Lightweight, client-safe module for phone number formatting and
 * provider detection. Does NOT import any server-side dependencies.
 * 
 * Supported Providers (per MakyPay API docs):
 * - MTN Mobile Money: 077, 078, 076, 039
 * - Airtel Money: 070, 074, 075
 */

/**
 * Validate and format phone number for Uganda
 * Format: 256XXXXXXXXX (12 digits total)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Ensure Uganda country code (256)
  const countryCode = '256';

  if (!cleaned.startsWith(countryCode)) {
    // Remove leading zero if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = countryCode + cleaned;
  }

  // Validate length (256 + 9 digits = 12 total)
  if (cleaned.length !== 12) {
    throw new Error('Invalid phone number format. Expected 12 digits (256XXXXXXXXX)');
  }

  return cleaned;
}

/**
 * Determine mobile money provider based on phone number prefix.
 * 
 * MakyPay API officially supports:
 * - MTN: 77, 78, 76, 39
 * - Airtel: 70, 74, 75
 * 
 * Prefixes 31, 79, 73 are valid Ugandan numbers but NOT supported
 * by MakyPay for mobile money collections.
 */
export function getProviderFromPhone(phoneNumber: string): string {
  const formatted = formatPhoneNumber(phoneNumber);

  // MTN: 256 + (077, 078, 076, 039) — per MakyPay API docs
  if (/^256(77|78|76|39)/.test(formatted)) {
    return 'mtn';
  }

  // Airtel: 256 + (070, 074, 075) — per MakyPay API docs
  if (/^256(70|74|75)/.test(formatted)) {
    return 'airtel';
  }

  // Reject unsupported prefixes with clear message
  const prefix = formatted.substring(3, 5);
  throw new Error(
    `Unsupported number (0${prefix}). Use MTN (077/078/076/039) or Airtel (070/074/075).`
  );
}

/**
 * Get human-readable provider name from provider code
 */
export function getProviderDisplayName(providerCode: string): string {
  const names: Record<string, string> = {
    'mtn': 'MTN Mobile Money',
    'airtel': 'Airtel Money',
  };
  return names[providerCode] || 'Unknown Network';
}

/**
 * Validate if a phone number looks valid for Uganda mobile money
 */
export function isValidUgandaPhone(phoneNumber: string): boolean {
  try {
    formatPhoneNumber(phoneNumber);
    return true;
  } catch {
    return false;
  }
}
