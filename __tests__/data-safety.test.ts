/**
 * Data Safety & Privacy Tests
 *
 * Ensures:
 * - User data is not exposed in client-side code
 * - RLS is referenced in DB migrations
 * - Sensitive operations go through supabaseAdmin
 * - No raw secrets are committed in source files
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const resolve = (...p: string[]) => path.resolve(__dirname, '..', ...p);
const readFile = (p: string) => fs.readFileSync(resolve(p), 'utf-8');

// ─── Client-Side Data Protection ────────────────────────────────────────────

describe('Client-Side Data Protection', () => {
  const clientFiles = [
    'app/page.tsx',
    'app/search/page.tsx',
    'app/movies/[id]/page.tsx',
    'app/series/[id]/page.tsx',
  ];

  it.each(clientFiles)('%s does not reference SUPABASE_SERVICE_ROLE_KEY', (file) => {
    if (fs.existsSync(resolve(file))) {
      const content = readFile(file);
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    }
  });

  it.each(clientFiles)('%s does not use supabaseAdmin directly', (file) => {
    if (fs.existsSync(resolve(file))) {
      const content = readFile(file);
      expect(content).not.toContain('supabaseAdmin');
    }
  });
});

// ─── Server-Side Security ───────────────────────────────────────────────────

describe('Server-Side Security', () => {
  it('payment complete route uses supabaseAdmin', () => {
    const content = readFile('app/api/makypay/complete/route.ts');
    expect(content).toContain('supabaseAdmin');
  });

  it('supabaseAdmin is imported from a separate module', () => {
    const adminPath = resolve('lib/supabase-admin.ts');
    expect(fs.existsSync(adminPath)).toBe(true);
    const content = readFile('lib/supabase-admin.ts');
    expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});

// ─── Database Migration Security ────────────────────────────────────────────

describe('Database RLS Policies', () => {
  it('view_logs table has RLS enabled', () => {
    const migration = readFile('database/migrations/20260510_add_views_and_watchlists.sql');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('view_logs');
  });

  it('watchlists table has RLS enabled', () => {
    const migration = readFile('database/migrations/20260510_add_views_and_watchlists.sql');
    expect(migration).toContain('watchlists');
    expect(migration).toContain('auth.uid()');
  });

  it('watchlists policy restricts to own data', () => {
    const migration = readFile('database/migrations/20260510_add_views_and_watchlists.sql');
    expect(migration).toContain('auth.uid() = user_id');
  });
});

// ─── .gitignore Verification ────────────────────────────────────────────────

describe('.gitignore Safety', () => {
  it('ignores .env file', () => {
    const gitignore = readFile('.gitignore');
    expect(gitignore).toContain('.env');
  });

  it('ignores node_modules', () => {
    const gitignore = readFile('.gitignore');
    expect(gitignore).toContain('node_modules');
  });

  it('ignores .next build directory', () => {
    const gitignore = readFile('.gitignore');
    expect(gitignore).toContain('.next');
  });
});

// ─── No Secrets in Source Code ──────────────────────────────────────────────

describe('No Hardcoded Secrets in Source', () => {
  const sourceFiles = [
    'lib/supabase.ts',
    'lib/makypay.ts',
    'app/api/makypay/initiate/route.ts',
    'app/api/makypay/status/route.ts',
    'app/api/makypay/complete/route.ts',
    'app/api/track-view/route.ts',
  ];

  it.each(sourceFiles)('%s does not contain hardcoded JWT tokens', (file) => {
    if (fs.existsSync(resolve(file))) {
      const content = readFile(file);
      // JWT tokens start with eyJ
      const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;
      expect(content).not.toMatch(jwtPattern);
    }
  });

  it.each(sourceFiles)('%s does not contain hardcoded Base64 auth', (file) => {
    if (fs.existsSync(resolve(file))) {
      const content = readFile(file);
      // MakyPay base64 auth pattern
      expect(content).not.toContain('bWFreV92MV9w');
    }
  });
});

// ─── MakyPay Credential Isolation ───────────────────────────────────────────

describe('MakyPay Credential Isolation', () => {
  it('makypay lib reads credentials from environment only', () => {
    const content = readFile('lib/makypay.ts');
    expect(content).toContain('process.env');
    expect(content).toContain('MAKYPAY');
  });

  it('payment routes do not expose MakyPay credentials to client', () => {
    const initiate = readFile('app/api/makypay/initiate/route.ts');
    // Should not return credentials in response
    expect(initiate).not.toMatch(/MAKYPAY_BASE64_AUTH[\s\S]*NextResponse\.json/);
  });
});
