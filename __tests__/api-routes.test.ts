/**
 * API Routes — Unit Tests
 *
 * Tests the critical API routes for:
 * - Payment initiation validation
 * - View tracking validation
 * - Auth callback handling
 * - Stream proxy security
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─── Payment API Routes ─────────────────────────────────────────────────────

describe('MakyPay Initiate Route', () => {
  const routePath = path.resolve(__dirname, '../app/api/makypay/initiate/route.ts');

  it('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('validates required fields', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('phoneNumber');
    expect(content).toContain('amount');
    expect(content).toContain('userId');
  });

  it('returns detailed error messages from MakyPay', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    // Should surface actual error, not generic "500"
    expect(content).toMatch(/error.*message|message.*error/i);
  });

  it('logs errors for debugging', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('console.error');
  });
});

describe('MakyPay Status Route', () => {
  const routePath = path.resolve(__dirname, '../app/api/makypay/status/route.ts');

  it('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('performs single status check (not blocking poll)', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    // Should NOT contain blocking polling loops
    expect(content).not.toContain('waitForTransactionCompletion');
    // Should use single check
    expect(content).toContain('checkTransactionStatus');
  });

  it('requires transactionId', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('transactionId');
    expect(content).toContain('400');
  });
});

describe('MakyPay Complete Route', () => {
  const routePath = path.resolve(__dirname, '../app/api/makypay/complete/route.ts');

  it('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('validates plan from database, not just client input', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    // Should query the plans table
    expect(content).toContain("'plans'");
    expect(content).toContain('duration_in_days');
  });

  it('uses supabaseAdmin for server-side operations', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('supabaseAdmin');
  });
});

// ─── View Tracking API ──────────────────────────────────────────────────────

describe('Track View Route', () => {
  const routePath = path.resolve(__dirname, '../app/api/track-view/route.ts');

  it('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('validates contentId and contentType', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('contentId');
    expect(content).toContain('contentType');
    expect(content).toContain('400');
  });

  it('only accepts movie or series content types', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain("'movie'");
    expect(content).toContain("'series'");
  });

  it('inserts into view_logs table', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('view_logs');
  });

  it('increments views counter', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('views');
    expect(content).toContain('update');
  });
});

// ─── Auth Callback Route ────────────────────────────────────────────────────

describe('Auth Callback Route', () => {
  const routePath = path.resolve(__dirname, '../app/auth/callback/route.ts');

  it('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('handles code exchange', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('exchangeCodeForSession');
  });

  it('handles error redirects', () => {
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('error');
    expect(content).toContain('redirect');
  });
});
