/**
 * MakyPay Phone Utils — Unit Tests
 *
 * Tests phone normalization, provider detection, and validation
 * against the MakyPay API specification for Uganda Mobile Money.
 *
 * Covers:
 * - formatPhoneNumber: 256XXXXXXXXX normalization
 * - getProviderFromPhone: MTN/Airtel prefix detection
 * - isValidUgandaPhone: validation helper
 * - getProviderDisplayName: human-readable provider names
 */
import { describe, it, expect } from 'vitest';
import {
  formatPhoneNumber,
  getProviderFromPhone,
  isValidUgandaPhone,
  getProviderDisplayName,
} from '@/lib/phone-utils';

// ─── Phone Number Formatting ────────────────────────────────────────────────

describe('formatPhoneNumber', () => {
  it('formats local number with leading zero → 256XXXXXXXXX', () => {
    expect(formatPhoneNumber('0771234567')).toBe('256771234567');
  });

  it('preserves already-formatted 256XXXXXXXXX', () => {
    expect(formatPhoneNumber('256771234567')).toBe('256771234567');
  });

  it('strips + prefix from +256XXXXXXXXX', () => {
    expect(formatPhoneNumber('+256771234567')).toBe('256771234567');
  });

  it('strips dashes and spaces', () => {
    expect(formatPhoneNumber('077-123-4567')).toBe('256771234567');
    expect(formatPhoneNumber('077 123 4567')).toBe('256771234567');
  });

  it('strips parentheses and dots', () => {
    expect(formatPhoneNumber('(077)1234567')).toBe('256771234567');
  });

  it('works for Airtel numbers', () => {
    expect(formatPhoneNumber('0701234567')).toBe('256701234567');
    expect(formatPhoneNumber('0751234567')).toBe('256751234567');
  });

  it('throws on too-short number', () => {
    expect(() => formatPhoneNumber('07712345')).toThrow('Invalid phone number');
  });

  it('throws on too-long number', () => {
    expect(() => formatPhoneNumber('25677123456789')).toThrow('Invalid phone number');
  });

  it('throws on empty string', () => {
    expect(() => formatPhoneNumber('')).toThrow('Invalid phone number');
  });

  it('throws on non-numeric garbage', () => {
    expect(() => formatPhoneNumber('abcdefghij')).toThrow('Invalid phone number');
  });

  it('formats 9-digit number without leading zero', () => {
    // User types just 771234567 (no leading 0, no country code)
    expect(formatPhoneNumber('771234567')).toBe('256771234567');
  });
});

// ─── Provider Detection ─────────────────────────────────────────────────────

describe('getProviderFromPhone', () => {
  // --- MTN prefixes ---
  it.each([
    ['0771234567', '77'],
    ['0781234567', '78'],
    ['0761234567', '76'],
    ['0391234567', '39'],
  ])('detects MTN for prefix %s (0%s)', (phone) => {
    expect(getProviderFromPhone(phone)).toBe('mtn');
  });

  it.each([
    ['256771234567'],
    ['256781234567'],
    ['256761234567'],
    ['256391234567'],
  ])('detects MTN for already-formatted %s', (phone) => {
    expect(getProviderFromPhone(phone)).toBe('mtn');
  });

  // --- Airtel prefixes ---
  it.each([
    ['0701234567', '70'],
    ['0741234567', '74'],
    ['0751234567', '75'],
  ])('detects Airtel for prefix %s (0%s)', (phone) => {
    expect(getProviderFromPhone(phone)).toBe('airtel');
  });

  it.each([
    ['256701234567'],
    ['256741234567'],
    ['256751234567'],
  ])('detects Airtel for already-formatted %s', (phone) => {
    expect(getProviderFromPhone(phone)).toBe('airtel');
  });

  // --- Unsupported prefixes (valid Ugandan but not MakyPay-supported) ---
  it.each([
    ['0311234567', '31'],
    ['0791234567', '79'],
    ['0731234567', '73'],
  ])('throws for unsupported prefix %s (0%s)', (phone) => {
    expect(() => getProviderFromPhone(phone)).toThrow('Unsupported number');
  });

  // --- Unknown prefix ---
  it('throws for completely unknown prefix', () => {
    expect(() => getProviderFromPhone('256411234567')).toThrow('Unsupported number');
  });
});

// ─── Provider Display Names ─────────────────────────────────────────────────

describe('getProviderDisplayName', () => {
  it('returns "MTN Mobile Money" for mtn', () => {
    expect(getProviderDisplayName('mtn')).toBe('MTN Mobile Money');
  });

  it('returns "Airtel Money" for airtel', () => {
    expect(getProviderDisplayName('airtel')).toBe('Airtel Money');
  });

  it('returns "Unknown Network" for unrecognized code', () => {
    expect(getProviderDisplayName('vodafone')).toBe('Unknown Network');
  });

  it('returns "Unknown Network" for empty string', () => {
    expect(getProviderDisplayName('')).toBe('Unknown Network');
  });
});

// ─── Validation Helper ──────────────────────────────────────────────────────

describe('isValidUgandaPhone', () => {
  it('returns true for valid MTN number', () => {
    expect(isValidUgandaPhone('0771234567')).toBe(true);
  });

  it('returns true for valid Airtel number', () => {
    expect(isValidUgandaPhone('0701234567')).toBe(true);
  });

  it('returns true for 256-prefixed number', () => {
    expect(isValidUgandaPhone('256771234567')).toBe(true);
  });

  it('returns false for too-short number', () => {
    expect(isValidUgandaPhone('07712345')).toBe(false);
  });

  it('returns false for too-long number', () => {
    expect(isValidUgandaPhone('25677123456789')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidUgandaPhone('')).toBe(false);
  });
});
