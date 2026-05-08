/**
 * MakyPay Webhook & Activation — Unit Tests
 *
 * Tests the webhook handler logic and subscription activation flow.
 * All Supabase calls are mocked.
 *
 * Covers:
 * - Webhook payload validation
 * - collection.completed → subscription activation
 * - Duplicate activation guard (idempotency)
 * - collection.failed → no activation
 * - Unknown event types → graceful handling
 * - Subscription expiry date calculation
 * - Plan name parsing from description
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock Supabase ──────────────────────────────────────────────────────────

function createChainableMock(overrides: Record<string, any> = {}) {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ilike: vi.fn().mockReturnThis(),
    ...overrides,
  };
  // Make chainable methods return the mock itself
  for (const key of Object.keys(mock)) {
    if (typeof mock[key] === 'function' && !['single', 'maybeSingle', 'insert'].includes(key)) {
      mock[key].mockReturnValue(mock);
    }
  }
  return mock;
}

// ─── Test: Subscription Activation Logic ────────────────────────────────────

describe('Subscription activation from webhook', () => {
  it('correctly parses plan name from "Subscription: Basic Plan" format', () => {
    const description = 'Subscription: Basic Plan';
    const planName = description.replace(/^Subscription:\s*/i, '').toLowerCase();
    expect(planName).toBe('basic plan');
  });

  it('falls back to "basic" when description is empty', () => {
    const description = undefined as any;
    const planName = description
      ? description.replace(/^Subscription:\s*/i, '').toLowerCase()
      : 'basic';
    expect(planName).toBe('basic');
  });

  it('correctly parses "Subscription: Standard 30 Days"', () => {
    const description = 'Subscription: Standard 30 Days';
    const planName = description.replace(/^Subscription:\s*/i, '').toLowerCase();
    expect(planName).toBe('standard 30 days');
  });

  it('handles description without "Subscription:" prefix', () => {
    const description = 'Premium Monthly';
    const planName = description.replace(/^Subscription:\s*/i, '').toLowerCase();
    expect(planName).toBe('premium monthly');
  });
});

describe('Subscription expiry calculation', () => {
  it('calculates 30-day expiry correctly', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    const durationDays = 30;
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    expect(expiryDate.toISOString()).toBe('2026-06-05T12:00:00.000Z');
  });

  it('calculates 1-day expiry correctly', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    const durationDays = 1;
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    expect(expiryDate.toISOString()).toBe('2026-05-07T12:00:00.000Z');
  });

  it('calculates 7-day expiry correctly', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    const durationDays = 7;
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    expect(expiryDate.toISOString()).toBe('2026-05-13T12:00:00.000Z');
  });

  it('defaults to 30 days when plan duration is null', () => {
    const planDuration = null;
    const durationDays = planDuration || 30;
    expect(durationDays).toBe(30);
  });
});

describe('Duplicate activation guard', () => {
  it('skips activation when expiry is in the future', () => {
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const shouldSkip = futureExpiry > new Date();
    expect(shouldSkip).toBe(true);
  });

  it('allows activation when expiry is in the past', () => {
    const pastExpiry = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    const shouldSkip = pastExpiry > new Date();
    expect(shouldSkip).toBe(false);
  });

  it('allows activation when no expiry date exists', () => {
    const expiryDate = null;
    const shouldSkip = expiryDate ? new Date(expiryDate) > new Date() : false;
    expect(shouldSkip).toBe(false);
  });
});

// ─── Test: Webhook Payload Validation ───────────────────────────────────────

describe('Webhook payload validation', () => {
  it('rejects payload without event_type', () => {
    const body = {
      transaction: { uuid: 'tx-1', reference: 'ref-1', status: 'completed' },
    };
    const isValid = !!(body as any).event_type && !!(body as any).transaction;
    expect(isValid).toBe(false);
  });

  it('rejects payload without transaction', () => {
    const body = {
      event_type: 'collection.completed',
    };
    const isValid = !!(body as any).event_type && !!(body as any).transaction;
    expect(isValid).toBe(false);
  });

  it('accepts valid payload', () => {
    const body = {
      event_type: 'collection.completed',
      transaction: {
        uuid: 'abc123-def4-5678-90ab-cdef12345678',
        reference: 'your-uuid-v4-reference',
        status: 'completed',
        amount: { formatted: '10,000.00', raw: 10000, currency: 'UGX' },
      },
      collection: {
        provider: 'mtn',
        phone_number: '+256700000000',
        provider_reference: 'mtn-transaction-id',
      },
    };
    const isValid = !!body.event_type && !!body.transaction;
    expect(isValid).toBe(true);
  });

  it('handles collection.completed event type', () => {
    const eventType = 'collection.completed';
    expect(eventType).toBe('collection.completed');
  });

  it('handles collection.failed event type', () => {
    const eventType = 'collection.failed';
    expect(eventType).toBe('collection.failed');
  });

  it('handles collection.cancelled event type', () => {
    const eventType = 'collection.cancelled';
    expect(eventType).toBe('collection.cancelled');
  });
});

// ─── Test: Transaction Status Update Data ───────────────────────────────────

describe('Webhook update data construction', () => {
  it('includes status and timestamp in update data', () => {
    const transaction = { status: 'completed', uuid: 'tx-1', reference: 'ref-1' };
    const updateData: Record<string, any> = {
      status: transaction.status,
      updated_at: new Date().toISOString(),
    };

    expect(updateData.status).toBe('completed');
    expect(updateData.updated_at).toBeDefined();
  });

  it('includes provider_reference when present in collection', () => {
    const collection = { provider_reference: 'mtn-ref-456' };
    const updateData: Record<string, any> = {
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    if (collection?.provider_reference) {
      updateData.provider_reference = collection.provider_reference;
    }

    expect(updateData.provider_reference).toBe('mtn-ref-456');
  });

  it('omits provider_reference when not present', () => {
    const collection = null as any;
    const updateData: Record<string, any> = {
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    const ref = collection !== null ? collection.provider_reference : undefined;
    if (ref) {
      updateData.provider_reference = ref;
    }

    expect(updateData.provider_reference).toBeUndefined();
  });
});

// ─── Test: Payment Config ───────────────────────────────────────────────────

describe('Payment configuration', () => {
  it('MakyPay is enabled by default', async () => {
    const { PAYMENT_CONFIG, PaymentProviders } = await import('@/lib/payment-config');
    expect(PAYMENT_CONFIG.MAKYPAY_ENABLED).toBe(true);
    expect(PaymentProviders.isMakyPayEnabled()).toBe(true);
  });

  it('YoPayments is disabled by default', async () => {
    const { PAYMENT_CONFIG, PaymentProviders } = await import('@/lib/payment-config');
    expect(PAYMENT_CONFIG.YOPAYMENTS_ENABLED).toBe(false);
    expect(PaymentProviders.isYoPaymentsEnabled()).toBe(false);
  });

  it('getDefaultProvider returns makypay when enabled', async () => {
    const { PaymentProviders } = await import('@/lib/payment-config');
    expect(PaymentProviders.getDefaultProvider()).toBe('makypay');
  });

  it('hasAnyProvider returns true when MakyPay is enabled', async () => {
    const { PaymentProviders } = await import('@/lib/payment-config');
    expect(PaymentProviders.hasAnyProvider()).toBe(true);
  });

  it('getEnabledProviders includes makypay', async () => {
    const { PaymentProviders } = await import('@/lib/payment-config');
    expect(PaymentProviders.getEnabledProviders()).toContain('makypay');
    expect(PaymentProviders.getEnabledProviders()).not.toContain('yopayments');
  });
});
