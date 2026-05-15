/**
 * MakyPayService — Unit Tests
 *
 * Tests the core service layer logic WITHOUT hitting MakyPay API or Supabase.
 * All network calls are mocked with vitest.
 *
 * Covers:
 * - Phone formatting (service-layer duplicate, confirms parity with phone-utils)
 * - Provider detection (service-layer)
 * - Amount validation boundaries
 * - Auth header construction (Base64 priority, fallback, missing credentials)
 * - UUID v4 generation format
 * - Collection request construction (form data, content-type)
 * - Card payment request construction
 * - Transaction status mapping (completed/failed/processing)
 * - Display status normalization
 * - Error handling and exception propagation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock env vars and external deps BEFORE importing the service
// because the class reads process.env at module load time (static readonly fields).

// ─── Helpers to test the service under different credential configs ─────────

function loadServiceWithEnv(env: Record<string, string>) {
  // Reset module cache so static fields re-evaluate
  vi.resetModules();

  // Set env vars before import
  for (const [key, val] of Object.entries(env)) {
    process.env[key] = val;
  }

  // Mock supabase modules to prevent real DB connections
  vi.doMock('@/lib/supabase', () => ({
    supabase: createMockSupabase(),
  }));
  vi.doMock('@/lib/supabase-admin', () => ({
    supabaseAdmin: createMockSupabase(),
  }));

  return import('@/lib/makypay');
}

function createMockSupabase() {
  const chainable = {
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
  };
  return chainable;
}

// ─── Mock fetch globally ────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Suppress console.log/error in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  // Clean up env vars
  delete process.env.MAKYPAY_BASE64_AUTH;
  delete process.env.MAKYPAY_API_KEY;
  delete process.env.MAKYPAY_API_SECRET;
});

/** Creates a mock fetch response where text() returns JSON stringified data */
function mockFetchSuccess(data: any) {
  const jsonStr = JSON.stringify(data);
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(jsonStr),
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, data: any) {
  const jsonStr = JSON.stringify(data);
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Error',
    text: () => Promise.resolve(jsonStr),
    json: () => Promise.resolve(data),
  });
}

// ─── Phone Formatting (Service Layer) ───────────────────────────────────────

describe('MakyPayService.formatPhoneNumber', () => {
  it('normalizes 0771234567 → 256771234567', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(MakyPayService.formatPhoneNumber('0771234567')).toBe('256771234567');
  });

  it('passes through already-formatted number', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(MakyPayService.formatPhoneNumber('256701234567')).toBe('256701234567');
  });

  it('throws on invalid length', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(() => MakyPayService.formatPhoneNumber('077123')).toThrow();
  });
});

// ─── Provider Detection (Service Layer) ─────────────────────────────────────

describe('MakyPayService.getProviderFromPhone', () => {
  it('returns mtn for 077x', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(MakyPayService.getProviderFromPhone('0771234567')).toBe('mtn');
  });

  it('throws for unsupported 079x prefix', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(() => MakyPayService.getProviderFromPhone('0791234567')).toThrow('Unsupported');
  });

  it('throws for unsupported 073x prefix', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(() => MakyPayService.getProviderFromPhone('0731234567')).toThrow('Unsupported');
  });

  it('returns airtel for 075x', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});
    expect(MakyPayService.getProviderFromPhone('0751234567')).toBe('airtel');
  });
});

// ─── Amount Validation ──────────────────────────────────────────────────────

describe('MakyPayService.collectMobileMoney — amount validation', () => {
  it('rejects amount below 500 UGX', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    await expect(
      MakyPayService.collectMobileMoney({
        userId: 'user-123',
        phoneNumber: '0771234567',
        amount: 499,
        description: 'Test',
      })
    ).rejects.toThrow('Amount must be between 500 and 10,000,000 UGX');
  });

  it('rejects amount above 10,000,000 UGX', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    await expect(
      MakyPayService.collectMobileMoney({
        userId: 'user-123',
        phoneNumber: '0771234567',
        amount: 10_000_001,
        description: 'Test',
      })
    ).rejects.toThrow('Amount must be between 500 and 10,000,000 UGX');
  });

  it('accepts boundary minimum (500)', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    // Mock fetch to return success
    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-1', reference: 'ref-1', status: 'processing' },
        collection: {
          amount: { formatted: '500.00', raw: 500, currency: 'UGX' },
          provider: 'mtn',
          phone_number: '256771234567',
        },
      },
    });

    const result = await MakyPayService.collectMobileMoney({
      userId: 'user-123',
      phoneNumber: '0771234567',
      amount: 500,
      description: 'Test',
    });

    expect(result.amount).toBe(500);
    expect(result.isPending).toBe(true);
  });

  it('accepts boundary maximum (10,000,000)', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-1', reference: 'ref-1', status: 'processing' },
        collection: {
          amount: { formatted: '10,000,000.00', raw: 10_000_000, currency: 'UGX' },
          provider: 'mtn',
          phone_number: '256771234567',
        },
      },
    });

    const result = await MakyPayService.collectMobileMoney({
      userId: 'user-123',
      phoneNumber: '0771234567',
      amount: 10_000_000,
      description: 'Test',
    });

    expect(result.amount).toBe(10_000_000);
  });
});

// ─── Auth Header Construction ───────────────────────────────────────────────

describe('Auth header construction', () => {
  it('throws when no credentials are set', async () => {
    const { MakyPayService } = await loadServiceWithEnv({});

    await expect(MakyPayService.getBalance()).rejects.toThrow(
      'MakyPay API credentials not configured'
    );
  });

  it('uses BASE64_AUTH when available (priority path)', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'bXlfYmFzZTY0X3Rva2Vu',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: { balance: { raw: 5000 } } }),
    });

    await MakyPayService.getBalance();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Basic bXlfYmFzZTY0X3Rva2Vu',
        }),
      })
    );
  });

  it('falls back to API_KEY:API_SECRET encoding when no BASE64_AUTH', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_API_KEY: 'my_key',
      MAKYPAY_API_SECRET: 'my_secret',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: { balance: { raw: 5000 } } }),
    });

    await MakyPayService.getBalance();

    const expectedBase64 = Buffer.from('my_key:my_secret').toString('base64');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedBase64}`,
        }),
      })
    );
  });
});

// ─── Collection Request Construction ────────────────────────────────────────

describe('MakyPayService.collectMobileMoney — request construction', () => {
  it('sends correct content-type and form body', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-1', reference: 'ref-1', status: 'processing' },
        collection: {
          amount: { formatted: '10,000.00', raw: 10000, currency: 'UGX' },
          provider: 'mtn',
          phone_number: '256771234567',
        },
      },
    });

    await MakyPayService.collectMobileMoney({
      userId: 'user-123',
      phoneNumber: '0771234567',
      amount: 10000,
      description: 'Subscription: Basic Plan',
    });

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const url = fetchCall[0];
    const options = fetchCall[1];

    // Verify URL
    expect(url).toBe('https://wire-api.makylegacy.com/api/v1/collections/collect-money');

    // Verify content-type (MakyPay requires form-urlencoded)
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    // Verify body contains required fields
    const body = new URLSearchParams(options.body);
    expect(body.get('phone_number')).toBe('256771234567');
    expect(body.get('amount')).toBe('10000');
    expect(body.get('country')).toBe('UG');
    expect(body.get('reference')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(body.get('description')).toBe('Subscription: Basic Plan');
  });

  it('truncates description to 255 chars', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-1', reference: 'ref-1', status: 'processing' },
        collection: {
          amount: { formatted: '1,000.00', raw: 1000, currency: 'UGX' },
          provider: 'mtn',
          phone_number: '256771234567',
        },
      },
    });

    const longDesc = 'A'.repeat(300);
    await MakyPayService.collectMobileMoney({
      userId: 'user-123',
      phoneNumber: '0771234567',
      amount: 1000,
      description: longDesc,
    });

    const body = new URLSearchParams((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.get('description')!.length).toBe(255);
  });
});

// ─── Card Payment Request ───────────────────────────────────────────────────

describe('MakyPayService.collectCardPayment', () => {
  it('includes method=card in form data and returns redirect_url', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-card-1', reference: 'ref-card-1', status: 'processing' },
        redirect_url: 'https://payment-gateway.example.com/pay?ref=abc',
        collection: {
          amount: { formatted: '50,000.00', raw: 50000, currency: 'UGX' },
          provider: 'card payments',
        },
      },
    });

    const result = await MakyPayService.collectCardPayment({
      userId: 'user-123',
      amount: 50000,
      description: 'Premium Plan',
    });

    // Verify card result
    expect(result.redirectUrl).toBe('https://payment-gateway.example.com/pay?ref=abc');
    expect(result.provider).toBe('card payments');
    expect(result.isPending).toBe(true);

    // Verify method=card in body
    const body = new URLSearchParams((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.get('method')).toBe('card');
    expect(body.has('phone_number')).toBe(false);
  });

  it('rejects amount below minimum for card payments', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    await expect(
      MakyPayService.collectCardPayment({
        userId: 'user-123',
        amount: 100,
        description: 'Test',
      })
    ).rejects.toThrow('Amount must be between 500 and 10,000,000 UGX');
  });
});

// ─── Transaction Status Mapping ─────────────────────────────────────────────

describe('MakyPayService.checkTransactionStatus', () => {
  it('maps completed status correctly', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          transaction: {
            uuid: 'tx-1',
            reference: 'ref-1',
            status: 'completed',
            amount: { raw: 10000, currency: 'UGX' },
            provider: 'mtn',
            provider_reference: 'mtn-ref-123',
          },
        },
      }),
    });

    const result = await MakyPayService.checkTransactionStatus('tx-1');

    expect(result.isCompleted).toBe(true);
    expect(result.isFailed).toBe(false);
    expect(result.isPending).toBe(false);
    expect(result.displayStatus).toBe('Completed');
    expect(result.providerReference).toBe('mtn-ref-123');
  });

  it('maps failed status correctly', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          transaction: {
            uuid: 'tx-2',
            reference: 'ref-2',
            status: 'failed',
            amount: { raw: 5000, currency: 'UGX' },
            provider: 'airtel',
          },
        },
      }),
    });

    const result = await MakyPayService.checkTransactionStatus('tx-2');

    expect(result.isCompleted).toBe(false);
    expect(result.isFailed).toBe(true);
    expect(result.isPending).toBe(false);
    expect(result.displayStatus).toBe('Failed');
  });

  it('maps processing status correctly', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          transaction: {
            uuid: 'tx-3',
            reference: 'ref-3',
            status: 'processing',
            amount: { raw: 2000, currency: 'UGX' },
            provider: 'mtn',
          },
        },
      }),
    });

    const result = await MakyPayService.checkTransactionStatus('tx-3');

    expect(result.isCompleted).toBe(false);
    expect(result.isFailed).toBe(false);
    expect(result.isPending).toBe(true);
    expect(result.displayStatus).toBe('Pending');
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('throws MakyPayException on HTTP error from getBalance', async () => {
    const { MakyPayService, MakyPayException } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Invalid API key' }),
    });

    await expect(MakyPayService.getBalance()).rejects.toThrow('Invalid API key');
  });

  it('throws MakyPayException when collection API returns non-success', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = mockFetchSuccess({
      status: 'error',
      message: 'Insufficient balance',
    });

    await expect(
      MakyPayService.collectMobileMoney({
        userId: 'user-123',
        phoneNumber: '0771234567',
        amount: 5000,
        description: 'Test',
      })
    ).rejects.toThrow('Insufficient balance');
  });

  it('wraps network errors in MakyPayException', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    await expect(MakyPayService.getBalance()).rejects.toThrow('Failed to get balance');
  });
});

// ─── UUID Generation ────────────────────────────────────────────────────────

describe('UUID v4 generation', () => {
  it('generates valid UUID v4 format in collection reference', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-1', reference: 'ref-1', status: 'processing' },
        collection: {
          amount: { formatted: '1,000.00', raw: 1000, currency: 'UGX' },
          provider: 'mtn',
          phone_number: '256771234567',
        },
      },
    });

    await MakyPayService.collectMobileMoney({
      userId: 'user-123',
      phoneNumber: '0771234567',
      amount: 1000,
      description: 'Test',
    });

    const body = new URLSearchParams((globalThis.fetch as any).mock.calls[0][1].body);
    const reference = body.get('reference')!;

    // UUID v4 pattern: 8-4-4-4-12 hex chars, version nibble = 4, variant = 8/9/a/b
    expect(reference).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('uses provided reference when given', async () => {
    const { MakyPayService } = await loadServiceWithEnv({
      MAKYPAY_BASE64_AUTH: 'dGVzdDp0ZXN0',
    });

    const customRef = '123e4567-e89b-12d3-a456-426614174000';
    globalThis.fetch = mockFetchSuccess({
      status: 'success',
      data: {
        transaction: { uuid: 'tx-1', reference: customRef, status: 'processing' },
        collection: {
          amount: { formatted: '1,000.00', raw: 1000, currency: 'UGX' },
          provider: 'mtn',
          phone_number: '256771234567',
        },
      },
    });

    await MakyPayService.collectMobileMoney({
      userId: 'user-123',
      phoneNumber: '0771234567',
      amount: 1000,
      description: 'Test',
      reference: customRef,
    });

    const body = new URLSearchParams((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.get('reference')).toBe(customRef);
  });
});
